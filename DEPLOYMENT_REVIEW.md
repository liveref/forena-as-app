# FORĒNA A/S 웹앱 v2 검토 브랜치

> **배포 전 상태 / 운영용 아님**. `main`은 변경하지 않았으며 현재 이 브랜치를 병합하거나 공개 배포하지 마세요.

## 검증된 상태 (2026-11-21)

- ChatGPT에서 검사한 `forena-as-app-v2.2-github.zip`의 데이터 자동 검사 7개 **통과**.
- ZIP 내부 기본 제품은 **41개**, 표시 대상은 **66형 40개 · 68형 40개 · 84형 41개**.
- 평형이 명시되지 않은 제품은 3개 타입 전부에 표시하며, 원본 필드는 변경하지 않았음.
- 7개 신규 공종은 제품 원본의 `category` 필드를 수정하지 않는 표시 분류.
- GitHub 검토 브랜치에 `docs/original-items.json`, `docs/classificationMap.json` 및 **검토 전용 CI**를 등록.
- **개선본 전체 소스는 아직 이 브랜치에 업로드되지 않았음**. 따라서 현재 CI 실행 실패는 `tests/catalog.test.mjs` 부재에 따른 것으로, 개선본 빌드 실패를 의미하지 않습니다.

## 개선본 소스 업로드 절차

1. 제공받은 `forena-as-app-v2.2-github.zip`을 PC에 다운로드하고 압축 해제.
2. GitHub의 `liveref/forena-as-app` 저장소에서 `forena-v2-review` 브랜치를 선택.
3. **ZIP 자체가 아니라 압축 해제된 내부 모든 파일과 폴더**를 올려 기존 대응 파일을 교체. 
4. `.env.local`, 관리자 비밀번호, Firebase 서비스 계정 비밀키는 절대 업로드하지 않기.
5. 업로드가 끝나면 **Actions → Verify candidate build** 실행 결과에서 데이터 테스트 및 React 빌드 성공 확인.
6. 성공해도 **운영 Firestore 보안 규칙 확인과 데이터 백업 전에는 main으로 병합하지 않기**.

## 운영 전 필수 점검

- 기존 Firestore `as-app/items`, `as-app-images` 데이터 및 사진 백업.
- `firestore.rules` 적용 및 기존 `allow read, write: if true` 같은 공개 쓰기 규칙 제거.
- Firebase Authentication Email/Password 활성화, 승인 관리자 UID의 `as-app-admins/{uid}` 문서 `active: true`.
- GitHub Actions에 `VITE_FIREBASE_*` 구성값 6개를 설정하되, 비밀번호와 서비스 계정 키는 입력하지 않기.
- 66·68·84형, 사진, 사용설명서, 저장 실패, 동시 수정, 초기화/복원, PC·모바일 실제 테스트.
- 사진 단독 동시 교체는 아직 서로 다른 관리자 사이의 충돌 방지가 완전하지 않으며, 실제 Firebase 테스트가 필요함.

## 검증 범위

- **완료:** 데이터 검증(7개), 원본/신규 공종 정적 비교, 검토용 CI 등록, 분류 데이터 스테이징
- **미완료:** 개선본 전체 GitHub 업로드, GitHub 개선본 빌드 통과, Firebase 인증·보안 규칙 적용, 운영 데이터 백업, Pages 공개 배포
