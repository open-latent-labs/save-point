# Frontend — Save Point

React 18 + Vite 5 기반 SPA. 문서 업로드·검색, RAG 챗봇, 관리자 대시보드, 소셜 로그인 UI를 제공합니다.

프로젝트 전체 소개는 [루트 README](../README.md)를 참고하세요.

---

## 🛠 요구 사항

- Node.js **18+** (Vite 5.4 요구사항)
- 백엔드 API 서버 

---

## 🚀 로컬 실행

```bash
cd frontend
npm install

npm run dev        
npm run build      # 프로덕션 빌드 → dist/
npm run preview    # 빌드 결과 미리보기
```

### 환경 변수

Vite 설정([vite.config.js](./vite.config.js))이 **백엔드의 `env/` 폴더**에서 환경 변수를 함께 로드합니다.
`/api` 요청은 `VITE_API_TARGET`으로 프록시됩니다.

로컬에서 백엔드 주소를 바꾸려면 `../backend/env/.env.dev`의 `VITE_API_TARGET`을 수정하면 됩니다.

---

## 🗺 라우팅 개요

[App.jsx](./src/App.jsx)의 라우터 구성:

| 경로 | 컴포넌트 | 보호 |
|---|---|---|
| `/login`, `/signup`, `/forgot-password` | 인증 페이지 | public |
| `/home` | Landing (검색 진입) | `PrivateRoute` |
| `/chat`, `/chat/history` | RAG 챗봇 · 히스토리 | `PrivateRoute` |
| `/upload` | 문서 업로드 (진행 상황 SSE) | `PrivateRoute` |
| `/approval` | 문서 승인 대기열 | `PrivateRoute` (관리자) |
| `/docs`, `/docs/:docId`, `/docs/:docId/original` | 문서 목록·상세·원본 | `PrivateRoute` |
| `/superAdmin` | 사용자·역할 관리 대시보드 | `PrivateRoute superAdminOnly` |

로그인 상태는 [`context/AuthContext.jsx`](./src/context/AuthContext.jsx)가 관리하며,
`sp_token`(HttpOnly 쿠키) 만료 시 `sp_refresh`로 자동 갱신합니다.

---

## 📂 폴더 구조

```
frontend/
├── index.html
├── vite.config.js               # 프록시 설정 + @/ alias + Tailwind 플러그인
├── dockerfile                   # 멀티스테이지 빌드 → Nginx 정적 서빙
├── public/
├── logo.png
└── src/
    ├── main.jsx                 # 진입점 + RouterProvider
    ├── App.jsx                  # 라우터 정의 + PrivateRoute
    │
    ├── api/                     # 백엔드 API 클라이언트 (도메인별 분리)
    │   ├── client.js            # fetch wrapper (쿠키·에러 처리·SSE 지원)
    │   ├── auth.js              # 로그인·회원가입·OAuth·토큰 재발급
    │   ├── chat.js              # 세션·메시지·스트리밍 (fetch + AbortController)
    │   ├── docs.js, document.js # 문서 CRUD
    │   ├── admin.js, superAdmin.js
    │   ├── notification.js
    │   └── connect.js           # SSE(presence, 알림) 연결
    │
    ├── components/              # 공통 컴포넌트
    │   ├── Shell.jsx            # 사이드바 + 상단바 레이아웃
    │   ├── Sidebar.jsx, SidebarToggle.jsx, Topbar.jsx
    │   ├── SearchBar.jsx
    │   ├── ChatMessage.jsx      # 마크다운 + 코드 하이라이팅 + 출처 표시
    │   ├── DocSelectModal.jsx   # RAG 대상 문서 선택 모달
    │   ├── DocTreeNode.jsx      # 문서 트리 노드
    │   ├── UploadItem.jsx, UploadCompleteModal.jsx
    │   ├── MyPageDrawer.jsx     # 마이페이지 드로어
    │   ├── AuthLayout.jsx, AuthField.jsx, MergeConfirmModal.jsx
    │   ├── Icons.jsx            # 인라인 SVG 아이콘
    │   ├── LightNetwork.jsx, MintCascades.jsx, MatrixWarpTransition.jsx  # 배경/전환 애니메이션
    │   ├── anim/                # 웹팻 마스코트 (드론 AI, FSM 16종)
    │   └── superAdmin/          # 관리자 전용 위젯
    │
    ├── pages/
    │   ├── Landing.jsx          # 히어로 검색 → /chat 이동
    │   ├── Chat.jsx             # SSE 스트리밍 채팅 + 문서 선택
    │   ├── ChatHistory.jsx
    │   ├── Login.jsx, Signup.jsx, ForgotPassword.jsx
    │   ├── Upload.jsx           # 드래그&드롭 업로드 + 처리 단계 표시
    │   ├── Approval.jsx         # 승인 대기 문서 검토
    │   ├── Docs.jsx             # 카테고리·검색·페이징
    │   └── superAdmin/          # SuperAdmin 대시보드
    │
    ├── context/
    │   ├── AuthContext.jsx      # 사용자·JWT 갱신
    │   └── UserRoleContext.jsx
    │
    ├── hooks/
    │   ├── useMediaQuery.js
    │   └── useSidebar.js
    │
    ├── data/                    # 정적 데이터 (카테고리·mock 등)
    ├── utils/                   # 포맷터·헬퍼
    └── styles/global.css        # 디자인 토큰 + Tailwind base
```

---

## 🎨 주요 UX 포인트

- **SSE 스트리밍 채팅**: `EventSource` 대신 `fetch + AbortController`로 구현해 POST body(질문·선택 문서)를 담아 보낼 수 있고, "생성 중지" 버튼도 자연스럽게 연결됩니다.
- **문서 선택 검색**: [`DocSelectModal`](./src/components/DocSelectModal.jsx)에서 RAG 대상 문서를 골라 요청과 함께 전송하면 해당 문서 안에서만 청크를 찾습니다.
- **웹팻 마스코트**: [`components/anim/`](./src/components/anim/) — FSM 16가지 상태로 드론 AI가 화면 위를 부유하며 AI 처리 상태(스트리밍/업로드/알림/페이지 이동)를 감정 표현으로 보여줍니다. 별도 튜토리얼 없이 UI 동선을 자연스럽게 유도합니다.
- **실시간 접속자 표시**: 서버의 Redis Pub/Sub 이벤트를 SSE로 받아 관리자 대시보드에서 접속 현황을 갱신합니다.
- **디바운싱 검색 + 페이징**: 문서 목록 검색은 입력을 디바운스하고 페이지 단위로 fetch합니다.

---

## 🐳 빌드 & 배포

### Docker Compose (권장)

루트에서 전체 스택과 함께 실행:

```bash
docker compose up -d frontend nginx
```

- `frontend` 서비스: 멀티스테이지 빌드로 `npm run build` → 정적 파일 생성
- `nginx` 서비스: 빌드된 정적 파일 + [`frontend/nginx.conf`](./nginx.conf)로 80/443 서빙

### 정적 파일만 필요할 때

```bash
npm run build
# → dist/ 를 원하는 정적 호스팅(예: S3, Netlify, Nginx)에 업로드
```

---

## 🔗 관련 문서

- [루트 README](../README.md) — 프로젝트 전체 소개
- [Backend README](../backend/README.md) — API 엔드포인트·환경 변수
