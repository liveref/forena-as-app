import { useEffect, useMemo, useRef, useState } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, runTransaction } from "firebase/firestore/lite";
import {
  Search, ChevronDown, Phone, ImageOff, Lock, Plus, X, Trash2,
  Pencil, RotateCcw, Loader2, Download, Upload, RefreshCw, LogOut, ImagePlus,
} from "lucide-react";
import { auth, db } from "./firebase";
import {
  DEFAULT_ITEMS, UNIT_TYPES, DISPLAY_GROUPS, LEGACY_CATEGORIES,
  applicableTypes, displayGroup, searchableText, canonicalItem, stripImage,
} from "./catalog";
import "./style.css";

const ITEMS_DOC = doc(db, "as-app", "items");
const IMAGES_COLLECTION = "as-app-images";
const ADMIN_COLLECTION = "as-app-admins";
const blankForm = { category: "", name: "", company: "", model: "", phone: "", note: "", manual: "", displayCategory: DISPLAY_GROUPS[0], types: [...UNIT_TYPES] };
const DISPLAY_FIELDS = ["category", "name", "company", "model", "phone", "note", "manual", "displayCategory", "types"];

function getError(err) {
  if (err?.code === "permission-denied") return "권한이 거부되었습니다. 관리자 승인과 Firestore 규칙을 확인하세요.";
  if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (err?.code === "unavailable") return "네트워크 연결을 확인하세요.";
  return err?.message || "요청을 처리하지 못했습니다.";
}
function safeManual(url) {
  if (typeof url !== "string" || !url.trim()) return "";
  try { const parsed = new URL(url.trim()); return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : ""; }
  catch { return ""; }
}
function generateId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `i${Date.now()}${Math.random().toString(36).slice(2)}`;
}
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) return reject(new Error("이미지 파일만 등록할 수 있습니다."));
    if (file.size > 12 * 1024 * 1024) return reject(new Error("12MB 이하 이미지로 등록하세요."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지 파일을 읽을 수 없습니다."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("지원하지 않는 이미지입니다."));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 480 / image.width);
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.82);
        if (data.length > 700000) return reject(new Error("이미지 용량이 큽니다. 더 작은 사진으로 등록하세요."));
        resolve(data);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function makeDownload(payload, filename) {
  const data = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function validateRestore(payload) {
  if (payload?.format !== "forena-as-backup-v1" || !Array.isArray(payload.items)) throw new Error("지원하지 않는 백업 형식입니다.");
  if (payload.items.length > 1000) throw new Error("제품 항목이 1,000개를 초과합니다.");
  const ids = new Set();
  for (const item of payload.items) {
    if (!item || typeof item !== "object" || !String(item.id || "").trim() || !String(item.name || "").trim()) throw new Error("제품 ID 또는 이름이 잘못되었습니다.");
    if (ids.has(item.id)) throw new Error(`중복 제품 ID: ${item.id}`);
    if (String(item.id).includes("/") || String(item.id).length > 500) throw new Error("제품 ID에 사용할 수 없는 문자가 있습니다.");
    ids.add(item.id);
    if (Array.isArray(item.types) && !item.types.every((type) => UNIT_TYPES.includes(type))) throw new Error("적용 평형 값이 올바르지 않습니다.");
  }
  if (payload.photos != null && (!Array.isArray(payload.photos) || payload.photos.some((p) => !p || typeof p.id !== "string" || p.id.includes("/") || p.id.length > 500 || typeof p.image !== "string" || !p.image.startsWith("data:image/")))) throw new Error("사진 데이터 형식이 잘못되었습니다.");
  return payload;
}

export default function App() {
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);

  const [unit, setUnit] = useState("84");
  const [group, setGroup] = useState(null);
  const [query, setQuery] = useState("");
  const [openItem, setOpenItem] = useState(null);
  const [modalItem, setModalItem] = useState(null);
  const [imageCache, setImageCache] = useState({});
  const [imageLoading, setImageLoading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");

  const [editor, setEditor] = useState(null); // { mode, form, baseline }
  const [photoAction, setPhotoAction] = useState("keep");
  const [photoData, setPhotoData] = useState(null);
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [backupReady, setBackupReady] = useState(false);
  const [backupRevision, setBackupRevision] = useState(null);
  const [resetConfirm, setResetConfirm] = useState("");
  const [restoreData, setRestoreData] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState("");
  const restoreInput = useRef(null);

  async function loadItems() {
    setLoadError("");
    try {
      const snap = await getDoc(ITEMS_DOC);
      setItems(snap.exists() && Array.isArray(snap.data().list) ? snap.data().list : DEFAULT_ITEMS);
    } catch (err) {
      setLoadError(`실시간 운영 데이터 연결 실패: ${getError(err)}. 현재 기본 자료만 표시됩니다. 저장은 차단됩니다.`);
      setItems((current) => current ?? DEFAULT_ITEMS);
    }
  }
  useEffect(() => { loadItems(); }, []);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      setUser(current); setIsAdmin(false);
      if (current) {
        try {
          const snap = await getDoc(doc(db, ADMIN_COLLECTION, current.uid));
          const allowed = snap.exists() && snap.data().active === true;
          setIsAdmin(allowed);
          if (!allowed) setAuthError("로그인은 되었지만 승인된 관리자 계정이 아닙니다.");
          else setAuthError("");
        } catch (err) { setAuthError(`관리자 권한 확인 실패: ${getError(err)}`); }
      } else { setAuthError(""); }
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const unitItems = useMemo(() => (items || []).filter((item) => applicableTypes(item).includes(unit)), [items, unit]);
  const groups = useMemo(() => {
    const names = [...DISPLAY_GROUPS];
    if (unitItems.some((it) => !names.includes(displayGroup(it)))) names.push("분류 미확정");
    return names.map((name) => ({ name, count: unitItems.filter((it) => displayGroup(it) === name).length })).filter((group) => group.count > 0);
  }, [unitItems]);
  const displayed = useMemo(() => unitItems.filter((it) => {
    if (group && displayGroup(it) !== group) return false;
    return !query.trim() || searchableText(it).includes(query.trim().toLocaleLowerCase());
  }), [unitItems, group, query]);
  const canWrite = isAdmin && !loadError && !busy;

  async function authenticate() {
    setAuthError(""); setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      setShowLogin(false); setLoginPassword("");
    } catch (err) { setAuthError(getError(err)); }
    finally { setBusy(false); }
  }
  async function logout() { await signOut(auth); setEditor(null); setMessage("관리자 로그아웃 완료"); }

  // 편집 충돌 감지와 사진/목록 동시 저장은 한 트랜잭션으로 처리.
  async function transact(patch) {
    if (!canWrite) throw new Error("저장 권한이 없거나 운영 데이터 연결에 실패했습니다.");
    setBusy(true); setMessage("");
    try {
      const result = await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(ITEMS_DOC);
        const live = snapshot.exists() && Array.isArray(snapshot.data().list) ? snapshot.data().list : stripImage(DEFAULT_ITEMS);
        let next = [...live];
        const { mode, id, baseline, values, imageAction, imageData } = patch;
        if (mode === "add") {
          if (live.some((it) => it.id === id)) throw new Error("동일한 제품 ID가 있습니다. 다시 시도하세요.");
          next.push({ id, ...values });
        } else if (mode === "edit" || mode === "delete" || mode === "image") {
          const current = live.find((it) => it.id === id);
          if (!current) throw new Error("다른 관리자가 이 제품을 삭제했습니다. 목록을 새로고침하세요.");
          if (baseline && canonicalItem(current) !== canonicalItem(baseline)) throw new Error("동시 수정 충돌: 다른 관리자가 이 제품을 먼저 변경했습니다. 새로고침 후 다시 수정하세요.");
          if (mode === "edit") next = live.map((it) => it.id === id ? { ...it, ...values } : it);
          if (mode === "delete") next = live.filter((it) => it.id !== id);
        } else if (mode === "reset") {
          if (patch.expectedVersion !== (snapshot.data()?.revision ?? 0)) throw new Error("백업 이후 다른 관리자가 자료를 수정했습니다. 다시 백업한 뒤 초기화하세요.");
          next = stripImage(DEFAULT_ITEMS);
        } else if (mode === "restore") {
          if (patch.expectedVersion !== (snapshot.data()?.revision ?? 0)) throw new Error("백업을 선택한 뒤 다른 관리자가 자료를 수정했습니다. 새로고침 후 다시 진행하세요.");
          next = stripImage(values);
        }
        // 사진만 바뀐 경우도 revision을 올려 백업 이후 변경으로 감지한다.
        // 모든 쓰기를 동일한 제품 목록 문서 트랜잭션 안에서 커밋하므로
        // 동시 관리자 저장과 초기화/복원 충돌을 검사할 수 있다.
        if (mode === "image") {
          tx.set(ITEMS_DOC, { revision: (snapshot.data()?.revision ?? 0) + 1 }, { merge: true });
        } else {
          tx.set(ITEMS_DOC, { list: stripImage(next), revision: (snapshot.data()?.revision ?? 0) + 1 }, { merge: true });
        }
        if ((mode === "add" || mode === "edit" || mode === "image") && imageAction === "replace") tx.set(doc(db, IMAGES_COLLECTION, id), { image: imageData });
        if ((mode === "edit" || mode === "image") && imageAction === "remove") tx.delete(doc(db, IMAGES_COLLECTION, id));
        if (mode === "restore" && Array.isArray(patch.photos)) {
          for (const photo of patch.photos) tx.set(doc(db, IMAGES_COLLECTION, photo.id), { image: photo.image });
        }
        return stripImage(next);
      });
      setItems(result); setBackupReady(false); setBackupRevision(null);
      if (patch.imageAction === "remove") setImageCache((old) => ({ ...old, [patch.id]: null }));
      if (patch.imageAction === "replace") setImageCache((old) => ({ ...old, [patch.id]: patch.imageData }));
      if (patch.mode === "restore") setImageCache({});
      return result;
    } catch (err) { throw new Error(getError(err)); }
    finally { setBusy(false); }
  }

  async function loadPhoto(id, refresh = false) {
    if (!refresh && Object.prototype.hasOwnProperty.call(imageCache, id)) return imageCache[id];
    setImageLoading(true); setPhotoMessage("");
    try {
      const snap = await getDoc(doc(db, IMAGES_COLLECTION, id));
      const photo = snap.exists() ? snap.data().image || null : null;
      setImageCache((old) => ({ ...old, [id]: photo })); return photo;
    } catch (err) { setPhotoMessage(`사진 불러오기 실패: ${getError(err)}`); return null; }
    finally { setImageLoading(false); }
  }
  function openPhotoModal(item) {
    setModalItem(item); setPhotoMessage("");
    if (!Object.prototype.hasOwnProperty.call(imageCache, item.id)) loadPhoto(item.id);
  }
  async function savePhotoFromModal(e) {
    const file = e.target.files?.[0]; if (!file || !modalItem) return;
    try {
      const data = await readPhoto(file);
      await transact({ mode: "image", id: modalItem.id, imageAction: "replace", imageData: data });
      setPhotoMessage("사진이 저장되었습니다.");
    } catch (err) { setPhotoMessage(getError(err)); }
    finally { e.target.value = ""; }
  }
  async function deletePhotoFromModal() {
    if (!modalItem || !window.confirm("이 제품의 사진을 삭제하시겠습니까?")) return;
    try { await transact({ mode: "image", id: modalItem.id, imageAction: "remove" }); setPhotoMessage("사진을 삭제했습니다."); }
    catch (err) { setPhotoMessage(getError(err)); }
  }

  function openAdd() {
    setEditor({ mode: "add", form: { ...blankForm, types: [...UNIT_TYPES], displayCategory: group || DISPLAY_GROUPS[0] }, baseline: null });
    setPhotoAction("keep"); setPhotoData(null); setFormError("");
  }
  function openEdit(item) {
    setEditor({ mode: "edit", form: { ...item, manual: item.manual || "", displayCategory: displayGroup(item), types: applicableTypes(item) }, baseline: item });
    setPhotoAction("keep"); setPhotoData(null); setFormError("");
  }
  function setFormField(key, value) { setEditor((current) => ({ ...current, form: { ...current.form, [key]: value } })); }
  function toggleFormType(type) {
    setEditor((cur) => ({ ...cur, form: { ...cur.form, types: cur.form.types.includes(type) ? cur.form.types.filter((v) => v !== type) : [...cur.form.types, type] } }));
  }
  async function selectFormPhoto(e) {
    const file = e.target.files?.[0]; if (!file) return;
    try { const data = await readPhoto(file); setPhotoData(data); setPhotoAction("replace"); setFormError(""); }
    catch (err) { setFormError(getError(err)); }
    finally { e.target.value = ""; }
  }
  async function saveForm() {
    if (!editor) return;
    const f = editor.form;
    if (!LEGACY_CATEGORIES.includes(f.category)) return setFormError("기존 공종을 선택하세요.");
    if (!f.name?.trim()) return setFormError("제품명을 입력하세요.");
    if (!f.types?.length) return setFormError("적용 평형을 하나 이상 선택하세요.");
    if (f.manual && !safeManual(f.manual)) return setFormError("사용설명서 링크는 http:// 또는 https:// 형식만 허용합니다.");
    const values = Object.fromEntries(DISPLAY_FIELDS.map((field) => [field, f[field] ?? ""]));
    values.manual = f.manual?.trim() || "";
    try {
      const id = editor.mode === "add" ? generateId() : f.id;
      await transact({ mode: editor.mode, id, baseline: editor.baseline, values, imageAction: photoAction, imageData: photoData });
      setMessage("제품 정보가 저장되었습니다."); setEditor(null); setPhotoAction("keep"); setPhotoData(null);
    } catch (err) { setFormError(getError(err)); }
  }
  async function removeItem(item) {
    try { await transact({ mode: "delete", id: item.id, baseline: item }); setConfirmDelete(null); setOpenItem(null); setMessage("제품 목록에서 삭제되었습니다. 별도 저장된 사진 문서는 유지됩니다."); }
    catch (err) { setMessage(getError(err)); }
  }
  async function downloadBackup() {
    if (!isAdmin || busy || loadError) return;
    setBusy(true); setMessage("");
    try {
      const [snap, photoSnap] = await Promise.all([getDoc(ITEMS_DOC), getDocs(collection(db, IMAGES_COLLECTION))]);
      const list = snap.exists() && Array.isArray(snap.data().list) ? snap.data().list : stripImage(DEFAULT_ITEMS);
      const photos = photoSnap.docs.map((p) => ({ id: p.id, image: p.data().image })).filter((p) => typeof p.image === "string");
      const payload = { format: "forena-as-backup-v1", exportedAt: new Date().toISOString(), revision: snap.data()?.revision ?? 0, items: list, photos };
      makeDownload(payload, `forena-as-backup-${new Date().toISOString().slice(0,10)}.json`);
      setBackupReady(true); setBackupRevision(payload.revision); setMessage(`백업 파일 저장 요청 완료: 제품 ${list.length}개, 사진 문서 ${photos.length}개. 다운로드된 파일을 보관하세요.`);
    } catch (err) { setMessage(`백업 실패: ${getError(err)}`); }
    finally { setBusy(false); }
  }
  async function resetDefaults() {
    if (!backupReady || resetConfirm !== "초기화") return;
    try { await transact({ mode: "reset", expectedVersion: backupRevision }); setResetConfirm(""); setGroup(null); setMessage("원본 41개 제품 목록으로 초기화했습니다. 별도 사진 문서는 유지됩니다."); }
    catch (err) { setMessage(`초기화 실패: ${getError(err)}`); }
  }
  async function selectRestoreFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setRestoreData(null); setRestoreConfirm("");
    try {
      const payload = validateRestore(JSON.parse(await file.text()));
      const bytes = new Blob([JSON.stringify(payload)]).size;
      if (bytes > 8 * 1024 * 1024) throw new Error("백업 데이터가 8MB를 초과하여 웹 복원을 지원하지 않습니다. Firebase 관리 도구로 복구해야 합니다.");
      setRestoreData(payload);
      setMessage(`백업 확인: 제품 ${payload.items.length}개 / 사진 ${payload.photos?.length || 0}개. 복원 승인 시 현재 목록을 교체합니다.`);
    } catch (err) { setMessage(`복원 파일 확인 실패: ${getError(err)}`); }
    finally { e.target.value = ""; }
  }
  async function restoreBackup() {
    if (!restoreData || restoreConfirm !== "복원" || !backupReady) return;
    try {
      await transact({ mode: "restore", values: restoreData.items, photos: restoreData.photos, expectedVersion: backupRevision });
      setMessage("백업의 제품·사진 데이터를 복원했습니다. 백업에 없는 오래된 사진 문서는 지우지 않았습니다.");
      setRestoreData(null); setRestoreConfirm("");
    } catch (err) { setMessage(`복원 실패: ${getError(err)}`); setBusy(false); }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-content">
          <div><span className="eyebrow">FORENA LIVING GUIDE</span><h1>포레나 영흥숲 전자제품 A/S 안내</h1><p>우리 집 평형을 선택해 제품별 서비스센터를 확인하세요.</p></div>
          <div className="header-actions">
            <button className="header-button" title="운영 데이터 새로고침" onClick={() => { setImageCache({}); loadItems(); }}><RefreshCw size={17}/> 새로고침</button>
            <button className="header-button" onClick={() => isAdmin ? logout() : setShowLogin(true)}>
              {isAdmin ? <LogOut size={17}/> : <Lock size={17}/>} {isAdmin ? "로그아웃" : "관리자"}
            </button>
          </div>
        </div>
      </header>
      <main className="main-container">
        <section className="toolbar">
          <p className="section-heading">우리 집 평형</p>
          <div className="unit-tabs" role="group" aria-label="평형 선택">
            {UNIT_TYPES.map((type) => <button key={type} className={`unit-tab ${unit === type ? "active" : ""}`} aria-pressed={unit===type} onClick={() => { setUnit(type); setOpenItem(null); setGroup(null); }}>{type}형</button>)}
          </div>
          <div className="search-box"><Search size={19}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="제품명 · 모델명 · 업체명 · 공종 검색" aria-label="제품 검색"/>{query && <button title="검색 지우기" onClick={()=>setQuery("")}><X size={16}/></button>}</div>
          <div className="filter-info"><span>{unit}형 · 표시 제품 <b>{unitItems.length}개</b></span><span>{group ? `${group} · ` : ""}검색 결과 <b>{displayed.length}개</b></span></div>
        </section>
        {loadError && <Notice error>{loadError}</Notice>}
        {message && <Notice error={/(실패|충돌|권한|오류)/.test(message)}>{message} <button onClick={()=>setMessage("")} aria-label="알림 닫기"><X size={14}/></button></Notice>}
        {authError && user && <Notice error>{authError}</Notice>}
        {items === null ? <div className="loading"><Loader2 className="spinning"/> 제품 목록을 불러오는 중...</div> : (
          <div className="content-grid">
            <nav className="group-panel" aria-label="공종 분류">
              <div className="panel-title">공종 선택</div>
              <button className={`group-button ${!group ? "selected" : ""}`} onClick={()=>setGroup(null)}>전체 보기 <span>{unitItems.length}</span></button>
              {groups.map((g) => <button className={`group-button ${group === g.name ? "selected" : ""}`} key={g.name} onClick={()=> { setGroup(g.name); setOpenItem(null); }}>{g.name}<span>{g.count}</span></button>)}
              <p className="small-help">평형 표기가 없는 제품은 66·68·84형에 공통 표시됩니다. 원본 제품 데이터는 복제하지 않습니다.</p>
              {isAdmin && <button className="primary full" disabled={!canWrite} onClick={openAdd}><Plus size={16}/> 새 제품 추가</button>}
            </nav>
            <section className="products-panel">
              <div className="products-heading"><h2>{group || "전체 제품"}</h2><span>{displayed.length}개 제품</span></div>
              {!displayed.length ? <div className="empty">표시할 제품이 없습니다. 다른 공종이나 검색어를 선택하세요.</div> : displayed.map((item) => (
                <article className="product-card" key={item.id}>
                  <button className="product-trigger" aria-expanded={openItem === item.id} onClick={()=>setOpenItem(openItem === item.id ? null : item.id)}>
                    <div><strong>{item.name}</strong><div className="product-sub">{item.model || "모델명 없음"} · {displayGroup(item)}</div></div><ChevronDown size={17} className={openItem === item.id ? "rotated" : ""}/>
                  </button>
                  {openItem === item.id && <div className="product-details">
                    <Detail label="업체명" value={item.company || "-"}/>
                    <Detail label="모델명" value={<button className="link-button" onClick={()=>openPhotoModal(item)}>{item.model || "-"} <ImagePlus size={14}/></button>}/>
                    <Detail label="A/S 연락처" value={item.phone ? <a className="phone-link" href={`tel:${item.phone.replace(/[^0-9]/g, "")}`}><Phone size={14}/> {item.phone}</a> : "-"}/>
                    <Detail label="사용설명서" value={safeManual(item.manual) ? <a href={safeManual(item.manual)} target="_blank" rel="noopener noreferrer">제조사 페이지 보기 ↗</a> : "등록된 링크 없음"}/>
                    {item.note && <Detail label="비고" value={item.note}/>}
                    <Detail label="적용 평형" value={applicableTypes(item).map((t)=>`${t}형`).join(" · ")}/>
                    {isAdmin && <div className="item-actions"><button disabled={!canWrite} onClick={()=>openEdit(item)}><Pencil size={14}/> 수정</button>{confirmDelete === item.id ? <><span>삭제할까요?</span><button className="danger" disabled={!canWrite} onClick={()=>removeItem(item)}>삭제 확인</button><button onClick={()=>setConfirmDelete(null)}>취소</button></> : <button disabled={!canWrite} className="danger" onClick={()=>setConfirmDelete(item.id)}><Trash2 size={14}/> 삭제</button>}</div>}
                  </div>}
                </article>
              ))}
            </section>
          </div>
        )}
        {isAdmin && <section className="admin-panel">
          <h2>관리자 데이터 관리</h2><p>원본 41개는 코드에 보존됩니다. 서버 운영 데이터는 별도이므로 초기화·복원 전에 반드시 백업하세요.</p>
          <div className="admin-row"><button className="secondary" disabled={!canWrite} onClick={downloadBackup}><Download size={16}/> 운영 데이터·사진 JSON 백업</button><button className="secondary" disabled={!canWrite} onClick={()=>restoreInput.current?.click()}><Upload size={16}/> 백업 파일 선택</button><input ref={restoreInput} type="file" accept=".json,application/json" hidden onChange={selectRestoreFile}/></div>
          <div className="admin-row"><label>기본 목록으로 초기화 (사진 문서는 유지)</label><input value={resetConfirm} onChange={(e)=>setResetConfirm(e.target.value)} placeholder="'초기화' 입력"/><button className="danger-button" disabled={!canWrite || !backupReady || resetConfirm !== "초기화"} onClick={resetDefaults}><RotateCcw size={15}/> 초기화</button></div>
          {restoreData && <div className="admin-row"><span>복원 대상: {restoreData.items.length}개 제품, {restoreData.photos?.length || 0}개 사진</span><input value={restoreConfirm} onChange={(e)=>setRestoreConfirm(e.target.value)} placeholder="'복원' 입력"/><button className="danger-button" disabled={!canWrite || !backupReady || restoreConfirm !== "복원"} onClick={restoreBackup}>백업 복원</button></div>}
          {!backupReady && <p className="small-help">이 세션에서 백업 파일 다운로드를 요청해야 초기화 및 복원을 진행할 수 있습니다.</p>}
        </section>}
      </main>
      <footer className="footer">FORENA LIVING GUIDE · 제품 정보는 등록된 원본 자료를 기준으로 안내합니다.</footer>

      {showLogin && <Modal title="관리자 로그인" onClose={()=>setShowLogin(false)}><p className="small-help">관리자 이메일/비밀번호와 Firestore 승인 계정이 모두 필요합니다. 예전 공통 PIN은 사용하지 않습니다.</p><label className="field">이메일<input type="email" autoComplete="username" value={loginEmail} onChange={(e)=>setLoginEmail(e.target.value)}/></label><label className="field">비밀번호<input type="password" autoComplete="current-password" value={loginPassword} onChange={(e)=>setLoginPassword(e.target.value)} onKeyDown={(e)=>e.key==="Enter" && authenticate()}/></label>{authError && <Notice error>{authError}</Notice>}<button className="primary full" disabled={busy || !authReady} onClick={authenticate}>{busy ? "로그인 중..." : "로그인"}</button></Modal>}
      {editor && <Modal title={editor.mode === "add" ? "새 제품 추가" : "제품 정보 수정"} onClose={()=>!busy && setEditor(null)}>
        <p className="small-help">기존 원문 정보는 자동 변경되지 않습니다. 수정 내용은 저장을 누른 경우에만 반영됩니다.</p>
        <label className="field">기존 공종<select value={editor.form.category} onChange={(e)=>setFormField("category",e.target.value)}><option value="">공종 선택</option>{LEGACY_CATEGORIES.map((c)=><option key={c}>{c}</option>)}</select></label>
        <label className="field">화면 표시 공종<select value={editor.form.displayCategory} onChange={(e)=>setFormField("displayCategory",e.target.value)}>{DISPLAY_GROUPS.map((c)=><option key={c}>{c}</option>)}</select></label>
        <label className="field">적용 평형<div className="type-checkboxes">{UNIT_TYPES.map((t)=><label key={t}><input type="checkbox" checked={editor.form.types.includes(t)} onChange={()=>toggleFormType(t)}/>{t}형</label>)}</div></label>
        {[ ["name","제품명"],["company","업체명"],["model","모델명"],["phone","A/S 연락처"],["note","비고 (원문 유지)"],["manual","사용설명서 링크 (선택)"]].map(([k,label])=><label className="field" key={k}>{label}<input value={editor.form[k] || ""} type={k==="manual"?"url":"text"} onChange={(e)=>setFormField(k,e.target.value)}/></label>)}
        <label className="field">제품 사진 (선택)<input type="file" accept="image/*" onChange={selectFormPhoto}/></label>
        {photoData && <img className="form-preview" src={photoData} alt="새 제품 사진 미리보기"/>}
        {editor.mode === "edit" && <div className="admin-row"><label><input type="radio" checked={photoAction==="keep"} onChange={()=>{setPhotoAction("keep");setPhotoData(null);}}/> 기존 사진 유지</label><label><input type="radio" checked={photoAction==="remove"} onChange={()=>{setPhotoAction("remove");setPhotoData(null);}}/> 기존 사진 삭제</label></div>}
        {formError && <Notice error>{formError}</Notice>}
        <button className="primary full" disabled={busy} onClick={saveForm}>{busy ? "저장 중..." : editor.mode === "add" ? "새 제품 등록" : "변경사항 저장"}</button>
      </Modal>}
      {modalItem && <Modal title={modalItem.model || modalItem.name} onClose={()=>{setModalItem(null);setPhotoMessage("");}}><p className="small-help">{modalItem.name}</p>{imageLoading ? <div className="loading"><Loader2 className="spinning"/> 사진 로딩 중...</div> : imageCache[modalItem.id] ? <img className="photo-preview" src={imageCache[modalItem.id]} alt={modalItem.name}/> : <div className="no-photo"><ImageOff size={32}/> 등록된 사진이 없습니다</div>}{photoMessage && <Notice error={photoMessage.includes("실패")}>{photoMessage}</Notice>}{isAdmin && <div className="admin-row"><label className="secondary file-picker">사진 추가·교체<input type="file" accept="image/*" onChange={savePhotoFromModal} disabled={!canWrite}/></label><button className="danger-button" disabled={!canWrite || !imageCache[modalItem.id]} onClick={deletePhotoFromModal}>사진 삭제</button></div>}</Modal>}
    </div>
  );
}

function Detail({ label, value }) { return <div className="detail-row"><span>{label}</span><div>{value}</div></div>; }
function Notice({ children, error=false }) { return <div className={`notice ${error ? "error" : ""}`} role="status">{children}</div>; }
function Modal({ title, onClose, children }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-sheet" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e)=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button title="닫기" onClick={onClose}><X size={20}/></button></div>{children}</div></div>; }
