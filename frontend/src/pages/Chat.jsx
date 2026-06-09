import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import SearchBar from "../components/SearchBar.jsx";
import ChatMessage from "../components/ChatMessage.jsx";
import { SUGGESTIONS } from "../data/mock.js";
import { pushHistory } from "../data/history.js";
import { streamChat } from "../api/chat.js";

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

  // ── 메시지 전송 ──────────────────────────────────────────
  const sendMessage = useCallback(
    (text) => {
      const q = (text || "").trim();
      if (!q || busy) return;
      setBusy(true);
      pushHistory(q);

      const aiId = uid();
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", text: q },
        { id: aiId, role: "ai", text: "", sources: [], streaming: false, thinking: true },
      ]);

      // SSE 시작
      const abort = streamChat(
        q,
        "user-id-here", // 나중에 실제 유저 ID로 교체
        // 토큰 받을 때마다
        (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? { ...m, thinking: false, streaming: true, text: m.text + token }
                : m
            )
          );
        },
        // 출처 받았을 때
        (sources) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, sources } : m))
          );
        },
        // 완료
        () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, streaming: false } : m))
          );
          setBusy(false);
        }
      );

      // abort 함수 저장 (중지 버튼용)
      timerRef.current = abort;
    },
    [busy]
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

      <div className={`gd-chat-top${messages.length === 0 ? " gd-chat-top--empty" : ""}`}>
        <div className="gd-chat-top-inner">
          {messages.length === 0 && (
            <p className="gd-chat-empty-hint">
              무엇이든 물어보세요. 엔진 문서·사례를 분석해 답해 드립니다.
            </p>
          )}
          <SearchBar
            value={input}
            onChange={setInput}
            onSubmit={onSubmit}
            placeholder="질문을 입력하세요"
            variant="send"
            disabled={busy}
          />
          {messages.length === 0 && (
            <div className="gd-chat-empty-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="gd-chip" onClick={() => { sendMessage(s); }}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="gd-composer-hint">
            <kbd>Enter</kbd> 전송 · GameDocs.AI 는 mock 데이터로 동작하는 데모입니다
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="gd-chat-scroll" ref={scrollRef}>
          <div className="gd-chat-inner">
            {messages.map((m) => <ChatMessage key={m.id} message={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}
