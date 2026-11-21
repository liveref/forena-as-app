import { useState, useEffect, useRef } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore/lite";
import { db } from "./firebase";
import {
  Search,
  ChevronDown,
  Phone,
  ImageOff,
  Lock,
  Unlock,
  Plus,
  X,
  Trash2,
  Pencil,
  Building2,
  Zap,
  Settings2,
  RotateCcw,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  설정값 — 실제 브랜드 컬러/폰트/관리자 PIN 확정 후 이 부분만 바꾸면 됩니다   */
/* ------------------------------------------------------------------ */

const ADMIN_PIN = "2604"; // 관리자 PIN (임시값 — 실제 운영 전 반드시 변경하세요)

const BRAND = {
  blue: "#123A67", // 포레나 블루 (근사값 — 공식 HEX 코드 확인 후 교체)
  blueDeep: "#0B2647",
  blueSoft: "#EAF0F7",
  gold: "#B08A4E", // 포인트 컬러 (근사값)
  ink: "#15181D",
  sub: "#5B6472",
  line: "#E4E7EC",
  bg: "#F6F7F9",
};

const FONT_FAMILY =
  "'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif";

const CATEGORIES = [
  { key: "건축", label: "건축", icon: Building2 },
  { key: "전기", label: "전기", icon: Zap },
  { key: "기계", label: "기계·설비", icon: Settings2 },
];

/* ------------------------------------------------------------------ */
/*  포레나 영흥숲 리빙가이드 - 전자제품 A/S 콜센터 (업로드 자료 기반)          */
/* ------------------------------------------------------------------ */

const DEFAULT_ITEMS = [
  // 건축
  { id: "b1", category: "건축", name: "디지털도어락", company: "삼성SDS", model: "SHP-DR900", phone: "1588-4141", note: "", image: null },
  { id: "b2", category: "건축", name: "라디언트 3구 쿡탑", company: "LG", model: "BER3GBI", phone: "1544-7777", note: "", image: null },
  { id: "b3", category: "건축", name: "올인덕션", company: "삼성", model: "NZ63T5701AK", phone: "1588-3366", note: "", image: null },
  { id: "b4", category: "건축", name: "빌트인 광파오븐", company: "LG", model: "MZ385EBT", phone: "1544-7777", note: "", image: null },
  { id: "b5", category: "건축", name: "렌지후드", company: "하츠", model: "MCH90S", phone: "1644-0806", note: "", image: null },
  { id: "b6", category: "건축", name: "렌지후드 - 아일랜드", company: "하츠", model: "SIH-30S", phone: "1644-0806", note: "오픈키친", image: null },
  { id: "b7", category: "건축", name: "음식물탈수기", company: "한일", model: "W-200US", phone: "1588-1183", note: "", image: null },
  { id: "b8", category: "건축", name: "하향식 피난사다리", company: "에스제이테크원", model: "SJ201", phone: "055-338-8516", note: "", image: null },
  { id: "b9", category: "건축", name: "음식물처리기 (RFID)", company: "부민", model: "-", phone: "", note: "", image: null },

  // 전기
  { id: "e1", category: "전기", name: "일괄소등스위치", company: "(주)다산지엔지", model: "HHBOM243", phone: "02-852-3698", note: "", image: null },
  { id: "e2", category: "전기", name: "대기전력차단스위치 (거실)", company: "(주)다산지엔지", model: "HHSPB232", phone: "02-852-3698", note: "", image: null },
  { id: "e3", category: "전기", name: "대기전력차단스위치 (침실1)", company: "(주)다산지엔지", model: "HHSPB222", phone: "02-852-3698", note: "", image: null },
  { id: "e4", category: "전기", name: "대기전력차단스위치 (침실2,3)", company: "(주)다산지엔지", model: "HHSPB212", phone: "02-852-3698", note: "", image: null },
  { id: "e5", category: "전기", name: "프로그램스위치 (주방)", company: "(주)다산지엔지", model: "HBSPB232", phone: "02-852-3698", note: "", image: null },
  { id: "e6", category: "전기", name: "공동로비폰", company: "현대에이치티㈜", model: "HLPC-9006R", phone: "1588-1087", note: "", image: null },
  { id: "e7", category: "전기", name: "월패드", company: "현대에이치티㈜", model: "HWHN-1010", phone: "1588-1087", note: "", image: null },
  { id: "e8", category: "전기", name: "무인택배보관함", company: "㈜헤드", model: "AT-1001A", phone: "1544-9808", note: "", image: null },
  { id: "e9", category: "전기", name: "전기자동차 충전기", company: "옴니시스템㈜", model: "OMEV-W1-7K-BC1", phone: "070-7169-8617", note: "", image: null },
  { id: "e10", category: "전기", name: "엘리베이터", company: "현대엘리베이터㈜", model: "LXVF", phone: "1588-0603", note: "", image: null },
  { id: "e11", category: "전기", name: "보일러", company: "경동나비엔", model: "NCB311", phone: "1588-1144", note: "", image: null },

  // 기계
  { id: "m1", category: "기계", name: "시스템에어컨 - 실내기", company: "삼성전자", model: "AJ012MB1PBC2", phone: "1588-3366", note: "주방(84)", image: null },
  { id: "m2", category: "기계", name: "시스템에어컨 - 실내기", company: "삼성전자", model: "AJ016MB1PBC2", phone: "1588-3366", note: "침실2,3 (66,68,84)", image: null },
  { id: "m3", category: "기계", name: "시스템에어컨 - 실내기", company: "삼성전자", model: "AJ032MB1PBC1", phone: "1588-3366", note: "침실1 (66,68,84)", image: null },
  { id: "m4", category: "기계", name: "시스템에어컨 - 실내기", company: "삼성전자", model: "AJ072MB1PBC1", phone: "1588-3366", note: "거실 (66,68,84)", image: null },
  { id: "m5", category: "기계", name: "시스템에어컨 - 일반판넬", company: "삼성전자", model: "PC1BWSK3N", phone: "1588-3366", note: "거실 (66,68,84)", image: null },
  { id: "m6", category: "기계", name: "시스템에어컨 - 일반판넬", company: "삼성전자", model: "PC1NWSK3N", phone: "1588-3366", note: "침실1 (66,68,84)", image: null },
  { id: "m7", category: "기계", name: "시스템에어컨 - 일반판넬", company: "삼성전자", model: "PC1MWSK3N", phone: "1588-3366", note: "침실2,3 (66,68,84), 주방(84)", image: null },
  { id: "m8", category: "기계", name: "시스템에어컨 - 공청판넬", company: "삼성전자", model: "PC1BWCK3N", phone: "1588-3366", note: "거실 (66,68,84)", image: null },
  { id: "m9", category: "기계", name: "시스템에어컨 - 공청판넬", company: "삼성전자", model: "PC1NWCK3N", phone: "1588-3366", note: "침실1 (66,68,84)", image: null },
  { id: "m10", category: "기계", name: "시스템에어컨 - 공청판넬", company: "삼성전자", model: "PC1MWCK3N", phone: "1588-3366", note: "침실2,3 (66,68,84), 주방(84)", image: null },
  { id: "m11", category: "기계", name: "시스템에어컨 실외기", company: "삼성전자", model: "AJ040MXHNBC1", phone: "1588-3366", note: "부분설치 (66,68,84)", image: null },
  { id: "m12", category: "기계", name: "시스템에어컨 실외기", company: "삼성전자", model: "AJ050MXHNBC1", phone: "1588-3366", note: "전체설치 (66,68,84)", image: null },
  { id: "m13", category: "기계", name: "에어컨 와이파이 KIT", company: "삼성전자", model: "AIM-H04N", phone: "1588-3366", note: "", image: null },
  { id: "m14", category: "기계", name: "에어컨 무선리모컨", company: "삼성전자", model: "AR-EC05", phone: "1588-3366", note: "", image: null },
  { id: "m15", category: "기계", name: "비데", company: "대림비앤코", model: "DST-660", phone: "1588-1952", note: "", image: null },
  { id: "m16", category: "기계", name: "전열교환기", company: "㈜정민", model: "PHES-150P-JMBP/2", phone: "032-876-9454", note: "", image: null },
  { id: "m17", category: "기계", name: "온도조절기", company: "한성인더스트리", model: "FRT-10", phone: "1588-4678", note: "", image: null },
  { id: "m18", category: "기계", name: "온도조절 제어함", company: "한성인더스트리", model: "HVC-30", phone: "1588-4678", note: "", image: null },
  { id: "m19", category: "기계", name: "절수패달 - 스마트누수경보기", company: "㈜자타", model: "JATA-2300", phone: "032-346-5201", note: "", image: null },
  { id: "m20", category: "기계", name: "주방자동소화장치", company: "㈜한국소방기구제작소", model: "HK-8000", phone: "1544-2774", note: "단위세대 - 전기식", image: null },
  { id: "m21", category: "기계", name: "욕실배기팬", company: "㈜그렉스", model: "GN-90 LED", phone: "1577-7713", note: "", image: null },
];

const ITEMS_DOC = doc(db, "as-app", "items"); // Firestore: as-app 컬렉션 / items 문서 하나에 텍스트 목록만 저장 (빠른 초기 로딩)
const IMAGES_COLLECTION = "as-app-images"; // 사진은 항목별로 따로 저장 — 모델명을 눌렀을 때만 불러옴 (초기 로딩 속도 개선)

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function normalize(s) {
  return (s || "").toString().toLowerCase();
}

/** 업로드된 이미지 파일을 리사이즈해서 base64 데이터 URL로 변환 (외부 이미지 서버 없이 앱 안에 저장) */
function fileToResizedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
      img.onload = () => {
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const emptyForm = { category: "건축", name: "", company: "", model: "", phone: "", note: "", image: null, manual: "" };

export default function App() {
  const [items, setItems] = useState(null); // null = 로딩 중
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState(null);
  const [openItemId, setOpenItemId] = useState(null);

  const [modalItem, setModalItem] = useState(null); // 썸네일 모달 대상
  const [imageCache, setImageCache] = useState({}); // { [itemId]: dataUrl | null } — 사진은 필요할 때만 따로 불러와 캐시
  const [modalImageLoading, setModalImageLoading] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("add"); // add | edit
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef(null);
  const modalFileInputRef = useRef(null);

  async function loadItems() {
    setLoadError("");
    try {
      const snap = await getDoc(ITEMS_DOC);
      if (snap.exists() && Array.isArray(snap.data().list)) {
        setItems(snap.data().list);
      } else {
        setItems(DEFAULT_ITEMS);
        await setDoc(ITEMS_DOC, { list: DEFAULT_ITEMS }).catch(() => {
          setLoadError("초기 데이터 생성에 실패했습니다.");
        });
      }
    } catch (err) {
      setLoadError("데이터를 불러오지 못해 기본 목록으로 표시합니다. 새로고침을 눌러 다시 시도해 보세요.");
      setItems((cur) => cur ?? DEFAULT_ITEMS);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function persist(next) {
    // 사진(image) 필드는 별도 컬렉션에 저장하므로, 목록 문서에는 절대 포함하지 않음 — 목록이 가벼워야 처음 로딩이 빠름
    const lean = next.map(({ image, ...rest }) => rest);
    setItems(lean);
    setSaveError("");
    try {
      await setDoc(ITEMS_DOC, { list: lean });
    } catch (err) {
      setSaveError("변경사항 저장에 실패했습니다. 네트워크 확인 후 다시 시도해 주세요.");
    }
  }

  async function loadImage(itemId) {
    if (imageCache[itemId] !== undefined) return imageCache[itemId];
    try {
      const snap = await getDoc(doc(db, IMAGES_COLLECTION, itemId));
      const value = snap.exists() ? snap.data().image || null : null;
      setImageCache((c) => ({ ...c, [itemId]: value }));
      return value;
    } catch (err) {
      setImageCache((c) => ({ ...c, [itemId]: null }));
      return null;
    }
  }

  async function saveImage(itemId, dataUrl) {
    await setDoc(doc(db, IMAGES_COLLECTION, itemId), { image: dataUrl });
    setImageCache((c) => ({ ...c, [itemId]: dataUrl }));
  }

  const filtered =
    items && query.trim()
      ? items.filter((it) => {
          const q = normalize(query);
          return (
            normalize(it.name).includes(q) ||
            normalize(it.model).includes(q) ||
            normalize(it.company).includes(q) ||
            normalize(it.category).includes(q)
          );
        })
      : [];

  function toggleCategory(key) {
    setOpenCategory((cur) => (cur === key ? null : key));
    setOpenItemId(null);
  }

  function toggleItem(id) {
    setOpenItemId((cur) => (cur === id ? null : id));
  }

  function openAddForm(presetCategory) {
    setForm({ ...emptyForm, category: presetCategory || openCategory || "건축" });
    setFormMode("add");
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(item) {
    setForm({ ...item, image: null });
    setFormMode("edit");
    setFormError("");
    setFormOpen(true);
    loadImage(item.id).then((img) => setForm((f) => (f.id === item.id ? { ...f, image: img } : f)));
  }

  function openModel(item) {
    setModalItem(item);
    if (imageCache[item.id] === undefined) {
      setModalImageLoading(true);
      loadImage(item.id).finally(() => setModalImageLoading(false));
    }
  }

  async function handleFormImage(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setForm((f) => ({ ...f, image: dataUrl }));
    } catch (err) {
      setFormError("이미지를 처리하지 못했습니다. 다른 파일로 시도해 주세요.");
    }
  }

  async function submitForm() {
    if (!form.category) {
      setFormError("공종을 선택해 주세요.");
      return;
    }
    if (!form.name.trim()) {
      setFormError("제품명을 입력해 주세요.");
      return;
    }
    setFormError("");
    const { image, ...textFields } = form;
    let itemId = textFields.id;
    if (formMode === "add") {
      itemId = uid();
      await persist([...(items || []), { ...textFields, id: itemId }]);
    } else {
      await persist((items || []).map((it) => (it.id === textFields.id ? { ...textFields } : it)));
    }
    if (image) {
      try {
        await saveImage(itemId, image);
      } catch (err) {
        setSaveError("사진 저장에 실패했습니다. 항목 정보는 저장되었어요.");
      }
    }
    setFormOpen(false);
    setForm(emptyForm);
  }

  async function deleteItem(id) {
    await persist((items || []).filter((it) => it.id !== id));
    setConfirmDeleteId(null);
    if (openItemId === id) setOpenItemId(null);
  }

  async function resetToDefault() {
    await persist(DEFAULT_ITEMS);
    setConfirmReset(false);
  }

  async function attachImageFromModal(e) {
    const file = e.target.files && e.target.files[0];
    if (!file || !modalItem) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      await saveImage(modalItem.id, dataUrl);
    } catch (err) {
      setSaveError("이미지 업로드에 실패했습니다.");
    }
  }

  function submitPin() {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setShowPin(false);
      setPinInput("");
      setPinError("");
    } else {
      setPinError("PIN이 올바르지 않습니다.");
    }
  }

  return (
    <div
      style={{
        fontFamily: FONT_FAMILY,
        background: BRAND.bg,
        minHeight: "100vh",
        color: BRAND.ink,
      }}
    >
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
        * { box-sizing: border-box; }
        input, select, button { font-family: inherit; }
        .as-btn { cursor: pointer; border: none; }
        .as-row-btn:active { opacity: 0.85; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* 헤더 */}
      <div style={{ background: BRAND.blue, color: "#fff", padding: "20px 18px 46px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 12, letterSpacing: 1, opacity: 0.75, margin: 0 }}>FORENA LIVING GUIDE</p>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 0" }}>전자제품 A/S 안내</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="as-btn"
              onClick={loadItems}
              title="새로고침"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.14)",
                color: "#fff",
                borderRadius: 999,
                padding: "8px 10px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <RotateCcw size={14} />
            </button>
            <button
              className="as-btn"
              onClick={() => (isAdmin ? setIsAdmin(false) : setShowPin(true))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: isAdmin ? BRAND.gold : "rgba(255,255,255,0.14)",
                color: "#fff",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {isAdmin ? <Unlock size={14} /> : <Lock size={14} />}
              {isAdmin ? "관리자 모드" : "관리자"}
            </button>
          </div>
        </div>
      </div>

      {/* 검색창 (헤더와 겹치도록 살짝 위로) */}
      <div style={{ padding: "0 16px", marginTop: -28 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            boxShadow: "0 6px 20px rgba(18,58,103,0.14)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
          }}
        >
          <Search size={18} color={BRAND.sub} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제품명, 모델명으로 검색"
            style={{ border: "none", outline: "none", flex: 1, fontSize: 14, background: "transparent" }}
          />
          {query && (
            <button className="as-btn" onClick={() => setQuery("")} style={{ background: "transparent", padding: 2 }}>
              <X size={16} color={BRAND.sub} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
        {loadError && <Banner tone="warn">{loadError}</Banner>}
        {saveError && <Banner tone="error">{saveError}</Banner>}

        {items === null ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: BRAND.sub, gap: 8 }}>
            <Loader2 size={18} className="spin" style={{ animation: "spin 1s linear infinite" }} />
            불러오는 중...
          </div>
        ) : query.trim() ? (
          /* ---------------- 검색 결과 ---------------- */
          <div style={{ marginTop: 18 }}>
            <p style={{ fontSize: 12, color: BRAND.sub, margin: "0 0 8px" }}>검색 결과 {filtered.length}건</p>
            {filtered.length === 0 ? (
              <EmptyState text="일치하는 항목이 없습니다. 다른 검색어로 시도해 보세요." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    open={openItemId === it.id}
                    onToggle={() => toggleItem(it.id)}
                    onModel={() => openModel(it)}
                    isAdmin={isAdmin}
                    onEdit={() => openEditForm(it)}
                    onDeleteRequest={() => setConfirmDeleteId(it.id)}
                    confirmDelete={confirmDeleteId === it.id}
                    onDeleteConfirm={() => deleteItem(it.id)}
                    onDeleteCancel={() => setConfirmDeleteId(null)}
                    showCategoryTag
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ---------------- 카테고리 그리드 + 아코디언 ---------------- */
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = openCategory === cat.key;
                const count = items.filter((i) => i.category === cat.key).length;
                return (
                  <button
                    key={cat.key}
                    className="as-btn"
                    onClick={() => toggleCategory(cat.key)}
                    style={{
                      background: active ? BRAND.blue : "#fff",
                      color: active ? "#fff" : BRAND.ink,
                      border: `1px solid ${active ? BRAND.blue : BRAND.line}`,
                      borderRadius: 14,
                      padding: "16px 8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Icon size={22} color={active ? "#fff" : BRAND.blue} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.label}</span>
                    <span style={{ fontSize: 11, opacity: 0.7 }}>{count}개 항목</span>
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <button
                className="as-btn"
                onClick={() => openAddForm()}
                style={{
                  marginTop: 12,
                  width: "100%",
                  background: "#fff",
                  border: `1px dashed ${BRAND.gold}`,
                  color: BRAND.gold,
                  borderRadius: 12,
                  padding: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Plus size={16} /> 새 항목 추가
              </button>
            )}

            {openCategory && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {items
                  .filter((i) => i.category === openCategory)
                  .map((it) => (
                    <ItemRow
                      key={it.id}
                      item={it}
                      open={openItemId === it.id}
                      onToggle={() => toggleItem(it.id)}
                      onModel={() => openModel(it)}
                      isAdmin={isAdmin}
                      onEdit={() => openEditForm(it)}
                      onDeleteRequest={() => setConfirmDeleteId(it.id)}
                      confirmDelete={confirmDeleteId === it.id}
                      onDeleteConfirm={() => deleteItem(it.id)}
                      onDeleteCancel={() => setConfirmDeleteId(null)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            {!confirmReset ? (
              <button
                className="as-btn"
                onClick={() => setConfirmReset(true)}
                style={{ background: "transparent", color: BRAND.sub, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <RotateCcw size={12} /> 기본 데이터로 초기화
              </button>
            ) : (
              <div style={{ fontSize: 12, color: BRAND.sub }}>
                모든 변경사항이 사라집니다. 정말 초기화할까요?{" "}
                <button className="as-btn" onClick={resetToDefault} style={{ background: "transparent", color: "#C0392B", fontWeight: 700, textDecoration: "underline" }}>
                  초기화
                </button>{" "}
                <button className="as-btn" onClick={() => setConfirmReset(false)} style={{ background: "transparent", color: BRAND.sub, textDecoration: "underline" }}>
                  취소
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PIN 모달 */}
      {showPin && (
        <ModalShell onClose={() => { setShowPin(false); setPinInput(""); setPinError(""); }} title="관리자 인증">
          <p style={{ fontSize: 13, color: BRAND.sub, margin: "0 0 12px" }}>관리자 PIN을 입력해 주세요.</p>
          <input
            type="password"
            inputMode="numeric"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitPin()}
            placeholder="PIN"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BRAND.line}`, fontSize: 15, marginBottom: 8 }}
          />
          {pinError && <p style={{ color: "#C0392B", fontSize: 12, margin: "0 0 8px" }}>{pinError}</p>}
          <button
            className="as-btn"
            onClick={submitPin}
            style={{ width: "100%", background: BRAND.blue, color: "#fff", borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 600 }}
          >
            확인
          </button>
        </ModalShell>
      )}

      {/* 추가/수정 폼 모달 */}
      {formOpen && (
        <ModalShell onClose={() => setFormOpen(false)} title={formMode === "add" ? "새 항목 추가" : "항목 수정"}>
          <FormField label="공종">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              style={selectStyle}
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="제품명">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="예: 디지털도어락" />
          </FormField>
          <FormField label="업체명">
            <input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} style={inputStyle} placeholder="예: 삼성SDS" />
          </FormField>
          <FormField label="모델명">
            <input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} style={inputStyle} placeholder="예: SHP-DR900" />
          </FormField>
          <FormField label="A/S 서비스센터 연락처">
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} placeholder="예: 1588-4141" />
          </FormField>
          <FormField label="비고 (선택)">
            <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} style={inputStyle} placeholder="예: 오픈키친" />
          </FormField>
          <FormField label="제품 사진 (선택)">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFormImage} style={{ fontSize: 12 }} />
            {form.image && (
              <img src={form.image} alt="미리보기" style={{ marginTop: 8, width: 96, height: 96, objectFit: "cover", borderRadius: 8, border: `1px solid ${BRAND.line}` }} />
            )}
          </FormField>
          <FormField label="사용설명서 링크 (제조사 페이지 URL, 선택)">
            <input
              type="url"
              value={form.manual || ""}
              onChange={(e) => setForm((f) => ({ ...f, manual: e.target.value }))}
              style={inputStyle}
              placeholder="https://www.samsung.com/sec/support/model/..."
            />
          </FormField>
          {formError && <p style={{ color: "#C0392B", fontSize: 12, margin: "4px 0 8px" }}>{formError}</p>}
          <button
            className="as-btn"
            onClick={submitForm}
            style={{ width: "100%", background: BRAND.blue, color: "#fff", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, marginTop: 6 }}
          >
            {formMode === "add" ? "추가하기" : "저장하기"}
          </button>
        </ModalShell>
      )}

      {/* 썸네일 모달 */}
      {modalItem && (
        <ModalShell onClose={() => setModalItem(null)} title={modalItem.model && modalItem.model !== "-" ? modalItem.model : modalItem.name}>
          <p style={{ fontSize: 12, color: BRAND.sub, margin: "0 0 12px" }}>{modalItem.name}</p>
          {modalImageLoading ? (
            <div style={{ width: "100%", aspectRatio: "4 / 3", display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.sub }}>
              <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : imageCache[modalItem.id] ? (
            <img src={imageCache[modalItem.id]} alt={modalItem.name} style={{ width: "100%", borderRadius: 12, border: `1px solid ${BRAND.line}` }} />
          ) : (
            <div
              style={{
                width: "100%",
                aspectRatio: "4 / 3",
                background: BRAND.blueSoft,
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: BRAND.sub,
              }}
            >
              <ImageOff size={26} />
              <span style={{ fontSize: 12 }}>등록된 사진이 없습니다</span>
            </div>
          )}
          {isAdmin && (
            <div style={{ marginTop: 12 }}>
              <input ref={modalFileInputRef} type="file" accept="image/*" onChange={attachImageFromModal} style={{ fontSize: 12 }} />
            </div>
          )}
        </ModalShell>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  하위 컴포넌트                                                        */
/* ------------------------------------------------------------------ */

function ItemRow({ item, open, onToggle, onModel, isAdmin, onEdit, onDeleteRequest, confirmDelete, onDeleteConfirm, onDeleteCancel, showCategoryTag }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BRAND.line}`, borderRadius: 12, overflow: "hidden" }}>
      <button
        className="as-btn as-row-btn"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          padding: "13px 14px",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500 }}>
          {item.name}
          {showCategoryTag && (
            <span style={{ fontSize: 10, background: BRAND.blueSoft, color: BRAND.blue, borderRadius: 6, padding: "2px 6px" }}>{item.category}</span>
          )}
        </span>
        <ChevronDown size={16} color={BRAND.sub} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${BRAND.line}`, padding: "12px 14px" }}>
          <Row label="업체명" value={item.company || "-"} />
          <Row
            label="모델명"
            value={
              <button className="as-btn" onClick={onModel} style={{ background: "transparent", color: BRAND.blue, fontWeight: 600, textDecoration: "underline", padding: 0, fontSize: 13 }}>
                {item.model || "-"}
              </button>
            }
          />
          <Row
            label="사용설명서"
            value={
              item.manual ? (
                <a
                  href={item.manual}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: BRAND.blue, fontWeight: 600, textDecoration: "underline", fontSize: 13 }}
                >
                  제조사 페이지 보기
                </a>
              ) : (
                <span style={{ color: BRAND.sub, fontSize: 13 }}>등록된 링크 없음</span>
              )
            }
          />
          <Row
            label="A/S 연락처"
            value={
              item.phone ? (
                <a href={`tel:${item.phone.replace(/[^0-9]/g, "")}`} style={{ color: BRAND.gold, fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Phone size={12} /> {item.phone}
                </a>
              ) : (
                "-"
              )
            }
          />
          {item.note && <NoteRow label="비고" value={item.note} />}

          {isAdmin && (
            <div style={{ display: "flex", gap: 10, marginTop: 10, borderTop: `1px dashed ${BRAND.line}`, paddingTop: 10 }}>
              <button className="as-btn" onClick={onEdit} style={{ background: "transparent", color: BRAND.sub, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <Pencil size={12} /> 수정
              </button>
              {!confirmDelete ? (
                <button className="as-btn" onClick={onDeleteRequest} style={{ background: "transparent", color: "#C0392B", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                  <Trash2 size={12} /> 삭제
                </button>
              ) : (
                <span style={{ fontSize: 12, color: "#C0392B", display: "flex", alignItems: "center", gap: 6 }}>
                  삭제할까요?
                  <button className="as-btn" onClick={onDeleteConfirm} style={{ background: "transparent", color: "#C0392B", fontWeight: 700, textDecoration: "underline" }}>예</button>
                  <button className="as-btn" onClick={onDeleteCancel} style={{ background: "transparent", color: BRAND.sub, textDecoration: "underline" }}>아니오</button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
      <span style={{ color: BRAND.sub }}>{label}</span>
      <span style={{ color: BRAND.ink, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function NoteRow({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", padding: "4px 0", fontSize: 13, gap: 10 }}>
      <span style={{ color: BRAND.sub, flexShrink: 0, whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ color: BRAND.ink, textAlign: "left", flex: 1, lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 12px", color: BRAND.sub, fontSize: 13 }}>
      {text}
    </div>
  );
}

function Banner({ tone, children }) {
  const bg = tone === "error" ? "#FDEEEC" : "#FFF6E6";
  const color = tone === "error" ? "#C0392B" : "#8A6D1E";
  return (
    <div style={{ background: bg, color, borderRadius: 10, padding: "10px 12px", fontSize: 12, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,20,28,0.5)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 480,
          borderRadius: "18px 18px 0 0",
          padding: "18px 18px 28px",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: BRAND.ink }}>{title}</h2>
          <button className="as-btn" onClick={onClose} style={{ background: "transparent", padding: 4 }}>
            <X size={18} color={BRAND.sub} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: BRAND.sub, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BRAND.line}`, fontSize: 14 };
const selectStyle = { ...inputStyle };
