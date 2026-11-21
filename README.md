# 포레나 영흥숲 전자제품 A/S 안내 웹앱

## 로컬에서 미리보기
```
npm install
cp .env.example .env.local   # 값 채워넣기 (아래 Firebase 설정 참고)
npm run dev
```

## Firebase 설정 (한 번만)
1. https://console.firebase.google.com 에서 새 프로젝트를 만듭니다. (결제수단 등록 불필요 — 무료 Spark 요금제)
2. 왼쪽 메뉴 **빌드 > Firestore Database** 로 들어가서 "데이터베이스 만들기" → 위치는 `asia-northeast3(서울)` 선택 → 우선 **테스트 모드**로 시작합니다.
3. 프로젝트 설정(톱니바퀴 아이콘) > **일반** 탭 하단에서 "내 앱" > 웹 앱(</>) 추가. 앱 등록 후 나오는 `firebaseConfig` 값을 그대로 사용합니다.
4. **Firestore Database > 규칙(Rules)** 탭에서 아래처럼 되어 있는지 확인하세요 (사진을 별도 컬렉션에 저장하도록 바꾸면서 규칙도 함께 넓혔습니다):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /as-app/{docId} {
         allow read, write: if true;
       }
       match /as-app-images/{docId} {
         allow read, write: if true;
       }
     }
   }
   ```
   ⚠️ 이 규칙은 "링크를 아는 사람이면 누구나 데이터를 고칠 수 있는" 매우 느슨한 규칙입니다. 지금 앱의 관리자 PIN은 화면(UI)에서만 막아주는 수준이라, 진짜 보안이 필요하면 나중에 Firebase Authentication을 추가하는 것을 권장합니다. 아파트 내부용으로 링크를 비공개로 공유하는 정도면 우선 이렇게 시작해도 괜찮습니다.

## Vercel 배포
1. 이 프로�트를 본인 GitHub 저장소에 push 합니다.
2. https://vercel.com 에서 "Add New... > Project" → 방금 만든 GitHub 저장소를 Import 합니다.
3. Framework Preset은 자동으로 **Vite**가 잡힙니다. 그대로 두면 됩니다.
4. **Environment Variables**에 `.env.example`에 있는 6개 항목을 Firebase 콘솔에서 복사한 값으로 채워 넣습니다.
5. Deploy를 누르면 몇 분 안에 배포되고, `xxx.vercel.app` 주소가 생깁니다. 이 링크(또는 QR코드)를 입주자에게 공유하면 됩니다.

## 관리자 PIN
`src/App.jsx` 상단의 `ADMIN_PIN` 값을 배포 전에 반드시 원하는 값으로 바꾸세요.

## 브랜드 컬러 / 폰트
`src/App.jsx` 상단의 `BRAND` 객체(색상)와 `FONT_FAMILY` 값을 한화포레나 공식 값으로 교체하면 됩니다. 지금은 근사값이 들어가 있습니다.
