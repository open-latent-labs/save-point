import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import SearchBar from "../components/SearchBar.jsx";
import ChatMessage from "../components/ChatMessage.jsx";
import { getMockAnswer } from "../data/mock.js";
import { pushHistory } from "../data/history.js";

let _id = 0;
const uid = () => `m${++_id}_${Date.now()}`;

export default function Chat() {
  const [searchParams] = useSearchParams();
  const { onMenu } = useOutletContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const scrollRef = useRef(null);
  const timerRef = useRef(null);
  const seededRef = useRef("");

  // ── AI 응답 스트리밍 (mock) ──────────────────────────────
  const streamAnswer = useCallback((id, full, sources) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, thinking: false, streaming: true } : m))
    );
    let i = 0;
    const chunk = Math.max(2, Math.round(full.length / 120));
    const tick = () => {
      i += chunk;
      const slice = full.slice(0, i);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: slice } : m)));
      if (i < full.length) {
        timerRef.current = setTimeout(tick, 18);
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, text: full, streaming: false, sources } : m))
        );
        setBusy(false);
      }
    };
    tick();
  }, []);

  // ── 메시지 전송 ──────────────────────────────────────────
  const sendMessage = useCallback(
    (text) => {
      const q = (text || "").trim();
      if (!q || busy) return;
      clearTimeout(timerRef.current); // 진행 중인 타이머 정리
      setBusy(true);
      pushHistory(q);

      const aiId = uid();
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", text: q },
        { id: aiId, role: "ai", text: "", sources: [], streaming: false, thinking: true },
      ]);

      const { text: full, sources } = getMockAnswer(q);
      // 응답 생성 지연을 흉내내고 스트리밍 시작
      timerRef.current = setTimeout(() => streamAnswer(aiId, full, sources), 650);
    },
    [busy, streamAnswer]
  );

  // ── URL ?q= 를 첫 메시지로 자동 전송 ─────────────────────
  // seededRef 가드로 중복 전송을 막습니다. (StrictMode 이중 호출에도 안전)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q !== seededRef.current) {
      seededRef.current = q;
      sendMessage(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── 메시지 변경 시 자동 스크롤 ───────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onSubmit = () => {
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="gd-chat">
      <Topbar onMenu={onMenu} />

      <div className="gd-chat-scroll" ref={scrollRef}>
        <div className="gd-chat-inner">
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--dim)", padding: "60px 0" }}>
              무엇이든 물어보세요. 엔진 문서·사례를 분석해 답해 드립니다.
            </div>
          ) : (
            messages.map((m) => <ChatMessage key={m.id} message={m} />)
          )}
        </div>
      </div>

      <div className="gd-composer">
        <div className="gd-composer-inner">
          <SearchBar
            value={input}
            onChange={setInput}
            onSubmit={onSubmit}
            placeholder="추가 질문을 입력하세요"
            variant="send"
            disabled={busy}
          />
          <div className="gd-composer-hint">
            <kbd>Enter</kbd> 전송 · GameDocs.AI 는 mock 데이터로 동작하는 데모입니다
          </div>
        </div>
      </div>
    </div>
  );
}
