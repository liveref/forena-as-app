# FORĒNA A/S 웹앱 v2 검토 브랜치

이 브랜치는 기존 운영용 `main`을 보호하기 위해 생성한 **검토용 브랜치**입니다.

## 현 상태
- **개선본 소스 업로드 전**: 브랜치 생성 및 배포 준비 상태입니다.
- ChatGPT에서 제공한 `forena-as-app-v2.2-github.zip`을 로컬에서 압축 해제한 다음, ZIP **내부 파일과 폴더 전체**를 이 브랜치에 업로드해야 개선본이 됩니다.
- 이 브랜치를 `main`에 바로 병합하거나 Pages를 공개하지 마세요.

## 원본 보존 조건
- 업로드 ZIP 기준 41개 제품의 원본 필드는 그대로 유지합니다.
- 66형 40개 · 68형 40개 · 84형 41개.
- 평형 표시가 없는 제품은 세 평형 전체에 표시합니다.
- 새 7개 공종은 원본 공종 필드를 대체하지 않는 별도 표시 분류입니다.

## 안전한 배포 전 체크
1. 기존 Firestore `as-app/items`, `as-app-images` 데이터를 보존 또는 백업.
2. `firestore.rules`의 새 규칙을 Firebase Console에 적용. **기존 광범위한 `allow read, write: if true` 규칙을 반드시 제거/제한**.
3. Firebase Authentication 이메일/비밀번호를 활성화하고, 승인 관리자의 `as-app-admins/{uid}` 문서에 `active: true` 설정.
4. Actions repository secrets에 `VITE_FIREBASE_*` 6개 값을 입력. 웹 구성값은 앱 JS 번들에 포함되므로 비밀번호나 비밀키를 넣지 않기.
5. GitHub Actions의 `node --test` 및 `npm run build` 결과가 모두 성공하는지 확인.
6. 읽기·쓰기 권한, 사진, 백업/복원, 66·68·84형 목록, PC·모바일 실사용 검증 후 `main` 병합.

※ 로컬 준비 환경에서는 npm 패키지 저장소 DNS 연결이 불가능하여 실제 Vite 빌드/Firestore 실동작을 검증하지 못했습니다.
