import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";

// Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹) 에서 복사한 값을
// Vercel 프로젝트의 Environment Variables 에 아래 이름 그대로 등록하세요.
// (로컬에서 테스트할 때는 .env.local 파일에 넣으면 됩니다 — .env.example 참고)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
// Firestore "Lite" SDK: 실시간 구독(onSnapshot) 없이 일반 HTTP 요청 한 번으로만 읽고 씁니다.
// 일부 네트워크에서 실시간용 연결이 계속 끊기고 재시도되던 문제를 원천적으로 피할 수 있습니다.
export const db = getFirestore(app);
