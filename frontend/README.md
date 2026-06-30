# save-point

게임 기술 문서 요약·분류 + Q&A 챗봇 UI. 기존 `GameDocsAI.jsx` 의 다크 + 민트 무드를 유지하면서
**좌측 고정 사이드바**와 **ChatGPT 스타일 채팅 페이지**로 확장했습니다.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

## 구조

```
src/
├── main.jsx                # 진입점 + BrowserRouter
├── App.jsx                 # 앱 셸 (사이드바 + 라우트 + 모바일 드로어)
├── styles/global.css       # 기존 디자인 토큰 + 사이드바/채팅 스타일
├── data/
│   ├── mock.js             # 카피·카테고리·추천검색·mock 답변
│   └── history.js          # 최근 검색(localStorage) 헬퍼
├── components/
│   ├── Icons.jsx           # 인라인 SVG 아이콘
│   ├── Sidebar.jsx         # 새 채팅·최근검색·카테고리·설정
│   ├── Topbar.jsx          # 모바일 햄버거 + 로그인
│   ├── SearchBar.jsx       # 검색/전송 공용 입력바
│   └── ChatMessage.jsx     # 사용자/AI 메시지 + 스트리밍 캐럿 + 출처
└── pages/
    ├── Landing.jsx         # 히어로 + 검색 → /chat 이동
    └── Chat.jsx            # 채팅 UI (스트리밍·자동스크롤·고정 입력창)
```

## 라우팅 / 동작

- `/` 랜딩에서 검색하면 `/chat?q=...` 로 이동합니다 (React Router).
- 채팅 페이지는 URL 의 `?q=` 를 **첫 메시지로 자동 출력**합니다.
- 사이드바의 최근 검색·카테고리 클릭도 같은 방식으로 채팅을 시작합니다.
- AI 응답은 mock 데이터를 **타이핑 스트리밍 애니메이션**으로 표시합니다.
- 입력창은 하단 고정, **Enter 전송**, 메시지 추가 시 **자동 스크롤**.
- 모바일에서는 사이드바가 드로어로 전환됩니다.

## 실제 API 연동

`src/data/mock.js` 의 `getMockAnswer()` 를 실제 호출로 교체하면 됩니다.
원본 `GameDocsAI.jsx` 의 Anthropic API 호출 로직을 `src/pages/Chat.jsx` 의
`sendMessage` 내부에 옮겨 스트리밍 대신 응답 텍스트/출처를 채우면 됩니다.
