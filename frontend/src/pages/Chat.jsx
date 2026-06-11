import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import SearchBar from "../components/SearchBar.jsx";
import ChatMessage from "../components/ChatMessage.jsx";
import { SUGGESTIONS } from "../data/mock.js";
import { pushHistory } from "../data/history.js";
import { streamChat } from "../api/chat.js";
import { loadRooms, createRoom, loadMessages, deleteRoom } from "../data/chatRooms.js";
import { useAuth } from "../context/AuthContext.jsx";

let _id = 0;
const uid = () => `m${++_id}_${Date.now()}`;

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { onMenu, onProfile } = useOutletContext();
  const { user } = useAuth();

  const roomId = searchParams.get("room");

  const [messagesMap, setMessagesMap] = useState({});
  const [input, setInput] = useState("");
  const [busyRooms, setBusyRooms] = useState(new Set());
  const [currentRoomId, setCurrentRoomId] = useState(roomId);

  const scrollRef = useRef(null);
  const abortMapRef = useRef(new Map());
  const seededRef = useRef("");
  const currentRoomIdRef = useRef(currentRoomId);
  // loadMessages를 막을 방 id 추적
  const skipLoadRef = useRef(new Set());

  const messages = messagesMap[currentRoomId] ?? [];
  const busy = busyRooms.has(currentRoomId);

  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
  }, [currentRoomId]);

  // 방이 바뀌면 해당 방 메시지 로드
  useEffect(() => {
    const id = searchParams.get("room");
    setCurrentRoomId(id);
    currentRoomIdRef.current = id;

    if (!id) return;

    setMessagesMap((prev) => {
      if (prev[id] !== undefined) return prev;

      // sendMessage가 이미 처리 중인 방이면 loadMessages 스킵
      if (skipLoadRef.current.has(id)) return prev;

      loadMessages(id).then((msgs) => {
        setMessagesMap((p) => {
          if (p[id]?.some((m) => m.isLoading || m.streaming)) return p;
          if (p[id]?.length > 0) return p;
          return { ...p, [id]: msgs };
        });
      });

      return { ...prev, [id]: [] };
    });

    seededRef.current = "";
  }, [searchParams]);

  const sendMessage = useCallback(
    async (text, removeQ = false) => {
      const q = (text || "").trim();
      if (!q) return;

      let roomToUse = currentRoomId;
      const aiId = uid();
      let isNewRoom = false;

      if (!roomToUse) {
        const room = await createRoom(user?.id);
        roomToUse = room.id;
        isNewRoom = true;
        setCurrentRoomId(room.id);
        currentRoomIdRef.current = room.id;

        skipLoadRef.current.add(room.id);

        setMessagesMap((prev) => ({
          ...prev,
          [room.id]: [
            { id: uid(), role: "user", text: q },
            { id: aiId, role: "ai", text: "", sources: [], streaming: false, isLoading: true },
          ],
        }));

        setSearchParams({ room: room.id }, { replace: true });

      }

      if (busyRooms.has(roomToUse)) return;

      pushHistory(q);
      setBusyRooms((prev) => new Set([...prev, roomToUse]));

      const capturedRoomId = roomToUse;

      if (!isNewRoom) {
        // 이 방의 loadMessages를 막음 (setSearchParams보다 먼저 설정해야 race condition 방지)
        skipLoadRef.current.add(capturedRoomId);

        setMessagesMap((prev) => ({
          ...prev,
          [capturedRoomId]: [
            ...(prev[capturedRoomId] ?? []),
            { id: uid(), role: "user", text: q },
            { id: aiId, role: "ai", text: "", sources: [], streaming: false, isLoading: true },
          ],
        }));
      }

      // ?q= 제거 — 로딩 메시지 설정 이후에 수행해야 Effect 1 재실행 시 덮어쓰기 방지
      if (removeQ) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("q");
          return next;
        }, { replace: true });
      }

      const abort = streamChat(
        q,
        user?.id ?? "",
        capturedRoomId,
        (token) => {
          setMessagesMap((prev) => ({
            ...prev,
            [capturedRoomId]: (prev[capturedRoomId] ?? []).map((m) =>
              m.id === aiId
                ? { ...m, isLoading: false, streaming: true, text: m.text + token }
                : m
            ),
          }));
        },
        (sources) => {
          setMessagesMap((prev) => ({
            ...prev,
            [capturedRoomId]: (prev[capturedRoomId] ?? []).map((m) =>
              m.id === aiId ? { ...m, sources } : m
            ),
          }));
        },
        () => {
          // 완료 후 skipLoad 해제
          skipLoadRef.current.delete(capturedRoomId);

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
      sendMessage(q, true);
    }
  }, [searchParams, sendMessage]);

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
              무엇이든 물어보세요. 엔진 문서·사례를 분석해 드립니다.
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