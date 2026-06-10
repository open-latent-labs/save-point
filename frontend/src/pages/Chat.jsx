import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import SearchBar from "../components/SearchBar.jsx";
import ChatMessage from "../components/ChatMessage.jsx";
import { SUGGESTIONS } from "../data/mock.js";
import { pushHistory } from "../data/history.js";
import { streamChat } from "../api/chat.js";
import { loadRooms, createRoom, updateRoom } from "../data/chatRooms.js";

let _id = 0;
const uid = () => `m${++_id}_${Date.now()}`;

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { onMenu, onProfile } = useOutletContext();

  const roomId = searchParams.get("room");

  const [messagesMap, setMessagesMap] = useState(() => {
    if (!roomId) return {};
    const room = loadRooms().find((r) => r.id === roomId);
    return room ? { [roomId]: room.messages ?? [] } : {};
  });
  const [input, setInput] = useState("");
  const [busyRooms, setBusyRooms] = useState(new Set());
  const [currentRoomId, setCurrentRoomId] = useState(roomId);

  const scrollRef = useRef(null);
  const abortMapRef = useRef(new Map());
  const seededRef = useRef("");
  const currentRoomIdRef = useRef(currentRoomId);

  // 현재 방 메시지
  const messages = messagesMap[currentRoomId] ?? [];
  const busy = busyRooms.has(currentRoomId);

  // currentRoomId 바뀔 때마다 ref 업데이트
  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
  }, [currentRoomId]);

  // 방이 바뀌면 해당 방 메시지 로드
  useEffect(() => {
    const id = searchParams.get("room");
    setCurrentRoomId(id);
    currentRoomIdRef.current = id;

    if (!id) return;

    // 이미 메모리에 있으면 스킵
    setMessagesMap((prev) => {
      if (prev[id]) return prev;
      const room = loadRooms().find((r) => r.id === id);
      return { ...prev, [id]: room?.messages ?? [] };
    });

    seededRef.current = "";
  }, [searchParams]);

  // 메시지 변경 시 방에 저장
  useEffect(() => {
    if (!currentRoomId || messages.length === 0) return;
    const finalMessages = messages.filter((m) => !m.thinking);
    if (finalMessages.length > 0) updateRoom(currentRoomId, finalMessages);
  }, [messages, currentRoomId]);

  const sendMessage = useCallback(
    (text) => {
      const q = (text || "").trim();
      if (!q) return;

      let roomToUse = currentRoomId;
      if (!roomToUse) {
        const room = createRoom();
        roomToUse = room.id;
        setCurrentRoomId(room.id);
        currentRoomIdRef.current = room.id;
        setSearchParams({ room: room.id }, { replace: true });
      }

      if (busyRooms.has(roomToUse)) return;

      pushHistory(q);
      setBusyRooms((prev) => new Set([...prev, roomToUse]));

      const aiId = uid();
      const capturedRoomId = roomToUse;

      // 해당 방 메시지에 추가
      setMessagesMap((prev) => ({
        ...prev,
        [capturedRoomId]: [
          ...(prev[capturedRoomId] ?? []),
          { id: uid(), role: "user", text: q },
          { id: aiId, role: "ai", text: "", sources: [], streaming: false, thinking: true },
        ],
      }));

      const abort = streamChat(
        q,
        "user-id-here",
        // 토큰 받을 때마다
        (token) => {
          setMessagesMap((prev) => ({
            ...prev,
            [capturedRoomId]: (prev[capturedRoomId] ?? []).map((m) =>
              m.id === aiId
                ? { ...m, thinking: false, streaming: true, text: m.text + token }
                : m
            ),
          }));
        },
        // 출처 받았을 때
        (sources) => {
          setMessagesMap((prev) => ({
            ...prev,
            [capturedRoomId]: (prev[capturedRoomId] ?? []).map((m) =>
              m.id === aiId ? { ...m, sources } : m
            ),
          }));
        },
        // 완료
        () => {
          setMessagesMap((prev) => ({
            ...prev,
            [capturedRoomId]: (prev[capturedRoomId] ?? []).map((m) =>
              m.id === aiId ? { ...m, streaming: false } : m
            ),
          }));
          setBusyRooms((prev) => {
            const next = new Set(prev);
            next.delete(capturedRoomId);
            return next;
          });
          abortMapRef.current.delete(capturedRoomId);
        }
      );

      abortMapRef.current.set(roomToUse, abort);
    },
    [busyRooms, currentRoomId, setSearchParams]
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