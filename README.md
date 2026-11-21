# 포레나 영흥숲 전자제품 A/S 안내 웹앱 (개선본)

> **주의:** 수정한 소스를 GitHub에 올리는 것만으로 Firebase 보안이 개선되지는 않습니다. `firestore.rules`를 Firebase Console에 실제 적용하고, 관리자 계정을 승인한 뒤 공개하세요. 기존 Firestore 데이터를 덮어쓰기 전에 백업하세요.

## 1. 변경된 기능

- 66형 / 68형 / 84형 선택 후 7개 공종으로 탐색. 평형 표기가 없는 항목은 세 평형 공통 적용.
- 원본 기본 제품 41개 **내용 변경 없음**. `src/defaultItems.js`에 원본 배열을 따로 보존하고 `docs/original-items.json`과 자동 대조 가능.
- 새 공종은 화면 표시 분류 `src/classificationMap.js`로만 매핑. 기존 `category`(건축/전기/기계) 필드는 그대로 유지.
- 검색: 제품명 / 모델명 / 업체명 / 전화번호 / 비고 / 기존 공종 / 새 공종.
- PC 2단 레이아웃, 모바일 터치 중심 평형 선택, 상세 정보·전화 걸기·모델명 사진·사용설명서 링크.
- Firebase Authentication 이메일·비밀번호 인증 + Firestore 승인 사용자 문서. **소스코드에 관리자 PIN 없음.**
- 저장은 Firestore 트랜잭션 성공 후 화면에 반영. 동일 항목 동시 수정은 충돌 경고, 다른 항목 수정은 최신 서버 목록을 반영.
- 사진 교체·삭제, HTTP(S) 설명서 링크만 허용, 백업 JSON(제품 + 등록된 사진 문서), 백업 파일 복원, 백업을 요청한 뒤에만 기본 목록 초기화.
- GitHub Actions → GitHub Pages 자동 배포용 설정 포함.

## 2. 기존 운영 데이터 보존과 주의사항

1. **기존 Firebase 프로젝트를 다른 프로젝트로 교체하지 마세요.** 기존 운영 데이터는 로컬 ZIP이 아닌 Firestore `as-app/items` 및 `as-app-images`에 있을 수 있습니다.
2. 웹앱은 **읽기 과정에서 자동으로 기본 데이터를 서버에 쓰지 않습니다.** 운영 문서가 없다면 원본 41개를 화면에 표시하고, 승인된 관리자가 처음 저장할 때 생성합니다.
3. 수정·삭제·초기화·복원은 관리자 인증 + Firestore 권한이 모두 필요합니다. 저장 실패 시 해당 작업을 성공 처리하지 않습니다.
4. 새 공종과 평형은 **표시 및 신규 메타데이터**로 관리합니다. 관리자에게 승인받지 않은 제품명·모델명·업체명·전화번호·비고의 수정은 하지 않았습니다.
5. 제품 삭제·기본 목록 초기화는 **별도 사진 문서를 삭제하지 않습니다.** 사진 삭제는 사진창에서 개별 수행합니다. 백업 복원은 백업에 들어있는 사진을 다시 쓰지만, **백업에 없는 기존 사진 문서는 지우지 않습니다.**
6. `docs/classificationMap.json`은 검토 당시의 7개 공종 매핑입니다. 원본 공종과 달라 보여도 제품 데이터 변경이 아닙니다.
7. 현재는 **GitHub Pages 정적 앱 + Firebase**입니다. 별도 Node 서버는 필요하지 않지만, 외부 Firebase 연결과 접근권한 설정은 필수입니다.
8. Firestore 저장 용량과 읽기·쓰기 사용량에 따라 Firebase 요금제 한도가 적용될 수 있습니다. 무료 사용을 무조건 보장하지 않습니다.
9. 백업 복원은 JSON 데이터 총량 **8MB 이하**에 대해 제공됩니다. 원본 Firestore 문서 크기 제한과 네트워크 상황에 따라 더 작아도 실패할 수 있습니다. 다량의 사진 백업은 Firebase 공식 관리/내보내기 기능으로 별도 보관하세요.

## 3. 배포 전에 꼭 해야 하는 보안 설정

### (1) 현재 Firebase 프로젝트에서 운영 자료 백업

- 공개 데이터 조회가 가능한 현 운영 화면에서 관리자 백업이 가능한 경우 먼저 파일 저장.
- 더 안전하게는 Firebase Console에서 `as-app/items`의 원본 문서 내용과 `as-app-images` 컬렉션을 별도로 보존.
- **배포 전에 기존 테스트 모드 규칙이 공개 쓰기를 허용하는지 반드시 확인하세요.**

### (2) Firebase Authentication 활성화

1. [Firebase Console](https://console.firebase.google.com/) → 기존 프로젝트 선택.
2. **Build → Authentication → Sign-in method → Email/Password** 활성화.
3. Authentication → Users에서 관리자 사용자 계정 생성 (강한 고유 비밀번호 권장).
4. 생성된 사용자 UID를 복사합니다.

### (3) 관리자 UID 승인 문서 등록 (한 번만)

Firestore Database → Data에서 컬렉션 `as-app-admins`를 만들고, **문서 ID를 관리자의 실제 Authentication UID로 지정**합니다. 필드: `active` (Boolean) = `true`.

> 이 승인 문서는 Firestore Console에서 프로젝트 소유자 권한으로 만들며, 웹앱에서는 임의로 생성·변경할 수 없습니다. 승인된 사용자 UID를 추가/철회하려면 이 문서를 관리합니다. 기존 관리자 PIN은 완전히 제거되었습니다.

### (4) Firestore 보안 규칙 반영 (필수)

Firebase Console → Firestore Database → **Rules** 에 프로젝트의 기존 다른 서비스 규칙도 점검한 뒤 `firestore.rules`의 A/S 앱 규칙을 적용하고 **Publish**합니다.

**중요:** 기존의 `allow read, write: if true;` 규칙을 남겨 둔 채 새 규칙만 추가해서는 보안이 개선되지 않습니다. Firestore에서는 일치하는 `allow` 규칙 중 하나라도 허용하면 접근이 허용될 수 있으므로, `as-app/{docId}` 및 `as-app-images/{docId}`를 공개 쓰기 허용하던 기존 규칙은 반드시 제거·제한해야 합니다. 다만 같은 Firebase 프로젝트의 다른 서비스 규칙은 함부로 삭제하지 말고 경로별로 검토해 병합하세요. 배포용 GitHub Actions는 **보안 규칙을 자동 적용하지 않습니다.**

정상 작동 검사: 비로그인자는 읽기만, 승인된 관리자는 읽기/쓰기 가능, 미승인 로그인 사용자는 쓰기 불가. 다른 Firebase 프로젝트에 연결하면 이전 사진·제품 정보가 보이지 않습니다.

## 4. GitHub Pages 배포

1. GitHub `liveref/forena-as-app` 저장소가 이미 연결되어 있습니다. 원본 `main`은 그대로 보존하고 별도 검토 브랜치에서 수정본을 확인한 다음, Firebase 보안 점검 후 `main`에 병합하세요. `.git` 폴더나 `.env.local`을 업로드하지 마세요.
2. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**에서 다음 6개 이름을 입력하고 Firebase 콘솔의 *웹 앱 설정* 값으로 채웁니다.
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions** 선택.
4. `main` 브랜치에 커밋하면 `.github/workflows/deploy-pages.yml`이 실행됩니다.
5. 완료 후 Pages URL에서 접속 테스트. Firebase Authentication → Settings → Authorized domains에 배포된 **GitHub Pages 호스트명**(예: `example.github.io`)을 추가하세요.
6. PC와 모바일에서 66/68/84형 목록 조회, 전화 링크, 사진, 관리자 로그인/저장 실패/동시 수정 감지를 확인합니다.

> GitHub Pages에 올라가는 `VITE_` 변수는 정적 JS 번들에 포함되는 **Firebase 공개 웹 구성값**입니다. 관리자 비밀번호/서비스 계정 비밀키/토큰을 설정하지 마세요. 보안은 Firestore Rules와 Auth로 달성합니다.
>
> 원본 ZIP에 `package-lock.json`이 없어 Actions는 우선 `npm install`을 사용하도록 설정했습니다. 첫 설치 및 실행 성공 후 잠금 파일을 저장소에 추가하고 CI를 `npm ci`로 바꾸면 빌드 재현성이 좋아집니다.

## 5. 로컬 실행

```bash
npm install
cp .env.example .env.local
# .env.local의 6개 공개 Firebase 웹 설정을 입력
npm run dev
```

로컬 관리자로 로그인하려면 Firebase Authentication → Authorized domains에 로컬 호스트 설정이 허용되어 있어야 합니다. 원본 앱과 같이 Vite 5 / React 18 / Firebase 10 사용.

## 6. 검증

```bash
node --test tests/*.test.mjs
npm run build
```

테스트는 41개 기본 제품의 원문 필드 일치, ID 중복, 7개 공종 매핑, 66/68/84형별 노출 개수, 미기재 평형 공통 적용 등을 점검합니다. **실제 Firebase 저장·로그인·동시 수정·GitHub Pages 동작은 연결된 Firebase 프로젝트에서 별도 실사용 테스트**가 필요합니다.

## 7. 알려진 제한 및 검토 사항

- 원본의 **월패드(e7) / 공동로비폰(e6) / 음식물처리기 RFID(b9)**의 새 공종은 검토용 표시 분류입니다. 이견이 있으면 `src/classificationMap.js`의 ID 연결만 변경합니다.
- 평형 미기재 **공용시설도 사용자 확정 규칙대로 세 평형에서 모두 표시**합니다. 공용시설이라는 사실을 세대마다 설치된 것으로 해석해서는 안 됩니다.
- 기존 사진은 Firestore `as-app-images/{id}` 내부에 데이터 URL로 저장하며 기존 구조를 옮기지 않았습니다. Firestore 문서 크기 제한 때문에 사진은 웹앱에서 리사이즈합니다. 장기적으로 사진 수가 많아지면 별도 저장 정책 검토가 필요합니다.
- 관리자가 편집한 원본 항목은 이후 수동으로 변경한 사항이 저장되므로, 기본 제품 41개의 코드 원본과 서버 운영 데이터는 다를 수 있습니다.
- 백업 파일에는 연락처와 사진이 포함될 수 있으므로 개인적으로 안전하게 보관하세요.
- 사진 단독 변경은 백업 revision에 반영되지만, 서로 다른 관리자가 **동일 사진을 동시에 교체**하는 경우 최종 이미지가 먼저 저장한 사진을 덮어쓸 수 있습니다. 현재 충돌 검사는 제품 텍스트 수정에 집중되어 있습니다.
- Github `main`에 아직 배포하지 않았습니다. 기존 프로젝트를 보호하기 위해 우선 스테이징 브랜치에서 빌드를 검증하세요.
