import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useOutletContext, useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import SearchBar from "../components/SearchBar.jsx";
import ChatMessage from "../components/ChatMessage.jsx";
import { getMockAnswer, SUGGESTIONS } from "../data/mock.js";
import { pushHistory } from "../data/history.js";
import { loadRooms, createRoom, updateRoom } from "../data/chatRooms.js";

let _id = 0;
const uid = () => `m${++_id}_${Date.now()}`;

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { onMenu, onProfile } = useOutletContext();
  const navigate = useNavigate();

  const roomId = searchParams.get("room");

  const [messages, setMessages] = useState(() => {
    if (!roomId) return [];
    const room = loadRooms().find((r) => r.id === roomId);
    return room?.messages ?? [];
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(roomId);

  const scrollRef = useRef(null);
  const timerRef = useRef(null);
  const seededRef = useRef("");

  // 방이 바뀌면 메시지 교체
  useEffect(() => {
    const id = searchParams.get("room");
    setCurrentRoomId(id);
    if (!id) {
      setMessages([]);
      return;
    }
    const room = loadRooms().find((r) => r.id === id);
    setMessages(room?.messages ?? []);
    seededRef.current = "";
  }, [searchParams]);

  // 메시지 변경 시 방에 저장
  useEffect(() => {
    if (!currentRoomId || messages.length === 0) return;
    const finalMessages = messages.filter((m) => !m.thinking);
    if (finalMessages.length > 0) updateRoom(currentRoomId, finalMessages);
  }, [messages, currentRoomId]);

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

  const sendMessage = useCallback(
    (text) => {
      const q = (text || "").trim();
      if (!q || busy) return;
      clearTimeout(timerRef.current);
      setBusy(true);
      pushHistory(q);

      // 방이 없으면 새로 생성
      let roomToUse = currentRoomId;
      if (!roomToUse) {
        const room = createRoom();
        roomToUse = room.id;
        setCurrentRoomId(room.id);
        setSearchParams({ room: room.id }, { replace: true });
      }

      const aiId = uid();
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", text: q },
        { id: aiId, role: "ai", text: "", sources: [], streaming: false, thinking: true },
      ]);

      const { text: full, sources } = getMockAnswer(q);
      timerRef.current = setTimeout(() => streamAnswer(aiId, full, sources), 650);
    },
    [busy, streamAnswer, currentRoomId, setSearchParams]
  );

  // URL ?q= 첫 메시지 자동 전송
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q !== seededRef.current) {
      seededRef.current = q;
      sendMessage(q);
    }
  }, [searchParams]);

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
      <Topbar onMenu={onMenu} onProfile={onProfile} />

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
