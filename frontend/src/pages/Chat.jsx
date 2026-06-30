import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useOutletContext, useBlocker } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import SearchBar from "../components/SearchBar.jsx";
import ChatMessage from "../components/ChatMessage.jsx";
import DocSelectModal from "../components/DocSelectModal.jsx";
import { SUGGESTIONS } from "../data/mock.js";
import { pushHistory } from "../data/history.js";
import { streamChat } from "../api/chat.js";
import { loadRooms, createRoom, loadMessages, deleteRoom, renameRoom } from "../data/chatRooms.js";
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

  const [roomTitle, setRoomTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // 문서 선택 모달
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]); // [{ id, filename }]

  // 2000자 초과 경고 모달
  const [showLengthWarn, setShowLengthWarn] = useState(false);

  const scrollRef = useRef(null);
  const titleInputRef = useRef(null);
  const abortMapRef = useRef(new Map());
  const seededRef = useRef("");
  const currentRoomIdRef = useRef(currentRoomId);
  // loadMessages를 막을 방 id 추적
  const skipLoadRef = useRef(new Set());
  // 동시 스트리밍 방 수 추적 — 0이 될 때만 드론 thinking 해제
  const thinkCountRef = useRef(0);

  const messages = messagesMap[currentRoomId] ?? [];
  const busy = busyRooms.has(currentRoomId);

  // 스트리밍 중 페이지 이탈 차단 (같은 /chat 내 방 전환은 허용)
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    busyRooms.size > 0 && nextLocation.pathname !== currentLocation.pathname
  );

  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
  }, [currentRoomId]);

  // 방이 바뀌면 제목 로드
  useEffect(() => {
    if (!currentRoomId || !user?.id) {
      setRoomTitle("");
      setEditingTitle(false);
      return;
    }
    loadRooms(user.id).then((rooms) => {
      const room = rooms.find((r) => r.id === currentRoomId);
      if (room) setRoomTitle(room.title ?? "");
    });
  }, [currentRoomId, user?.id]);

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
        if (!user?.id) return;
        let room;
        try {
          room = await createRoom(user.id, q.length > 15 ? q.slice(0, 15) + "…" : q);
        } catch (err) {
          console.error("방 생성 실패:", err);
          return;
        }
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

        // 유저가 메시지를 보낸 순간 사이드바 즉시 갱신
        window.dispatchEvent(new CustomEvent("gamedocs:room-active", { detail: capturedRoomId }));
      }

      // ?q= 제거 — 로딩 메시지 설정 이후에 수행해야 Effect 1 재실행 시 덮어쓰기 방지
      if (removeQ) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("q");
          return next;
        }, { replace: true });
      }

      thinkCountRef.current += 1;
      window.__droneSetThinking?.(true);
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
          thinkCountRef.current = Math.max(0, thinkCountRef.current - 1);
          if (thinkCountRef.current === 0) window.__droneSetThinking?.(false);
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
        },
        (errorText) => {
          thinkCountRef.current = Math.max(0, thinkCountRef.current - 1);
          if (thinkCountRef.current === 0) window.__droneSetThinking?.(false);
          skipLoadRef.current.delete(capturedRoomId);

          setMessagesMap((prev) => ({
            ...prev,
            [capturedRoomId]: (prev[capturedRoomId] ?? []).map((m) =>
              m.id === aiId ? { ...m, streaming: false, isLoading: false, text: m.text || errorText } : m
            ),
          }));
          setBusyRooms((prev) => {
            const next = new Set(prev);
            next.delete(capturedRoomId);
            return next;
          });
          abortMapRef.current.delete(capturedRoomId);
        },
        selectedDocs.map((d) => d.id)
      );

      abortMapRef.current.set(roomToUse, abort);
    },
    [busyRooms, currentRoomId, setSearchParams, selectedDocs]
  );

  // 언마운트 시 진행 중인 스트리밍 abort → 백엔드가 부분 답변 저장 + 드론 thinking 해제
  useEffect(() => {
    return () => {
      abortMapRef.current.forEach((abort) => abort());
      thinkCountRef.current = 0;
      window.__droneSetThinking?.(false);
    };
  }, []);

  // URL ?q= 첫 메시지 자동 전송
  useEffect(() => {
    if (!user?.id) return;
    const q = searchParams.get("q");
    if (q && q !== seededRef.current) {
      seededRef.current = q;
      sendMessage(q, true);
    }
  }, [searchParams, sendMessage, user]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const startEditTitle = () => {
    setTitleDraft(roomTitle);
    setEditingTitle(true);
  };

  const saveTitle = async () => {
    const name = titleDraft.trim();
    setEditingTitle(false);
    if (!name || name === roomTitle) return;
    const prev = roomTitle;
    setRoomTitle(name);
    try {
      await renameRoom(currentRoomId, name);
      window.dispatchEvent(new Event("gamedocs:rooms"));
    } catch {
      setRoomTitle(prev);
    }
  };

  const cancelTitle = () => {
    setEditingTitle(false);
    setTitleDraft(roomTitle);
  };

  const stopGeneration = () => {
    const abort = abortMapRef.current.get(currentRoomId);
    if (abort) abort();
  };

  const onSubmit = () => {
    if (input.length >= 2000) {
      setShowLengthWarn(true);
      return;
    }
    sendMessage(input);
    setInput("");
  };

  const onSubmitAnyway = () => {
    setShowLengthWarn(false);
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="gd-chat">
      <Topbar onMenu={onMenu} onProfile={onProfile} />

      {currentRoomId && (
        <div className="gd-chat-titlebar">
          <div className="gd-chat-titlebar-inner">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                className="gd-chat-title-input"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value.slice(0, 15))}
                maxLength={15}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") cancelTitle();
                }}
                autoFocus
              />
            ) : (
              <button className="gd-chat-title-btn" onClick={startEditTitle} title="클릭하여 제목 수정">
                {roomTitle || "새 채팅"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="gd-chat-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="gd-chat-empty-wrap">
            <p className="gd-chat-empty-hint">
              무엇이든 물어보세요. 엔진 문서·사례를 분석해 드립니다.
            </p>
            <div className="gd-chat-empty-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="gd-chip" onClick={() => { sendMessage(s); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="gd-chat-inner">
            {messages.map((m) => <ChatMessage key={m.id} message={m} userName={user?.name} />)}
          </div>
        )}
      </div>

      <div className="gd-chat-bottom">
        <div className="gd-chat-bottom-inner">
          {/* 선택된 문서 칩 */}
          {selectedDocs.length > 0 && (
            <div className="gd-doc-chips">
              {selectedDocs.map((d) => (
                <span key={d.id} className="gd-doc-chip">
                  {d.filename}
                  <button
                    className="gd-doc-chip-remove"
                    onClick={() => setSelectedDocs((prev) => prev.filter((x) => x.id !== d.id))}
                  >✕</button>
                </span>
              ))}
            </div>
          )}
          <div className="gd-composer-row">
            <button
              className="gd-doc-add-btn"
              onClick={() => setShowDocModal(true)}
              title="RAG 문서 선택"
              disabled={busy}
            >+</button>
            <SearchBar
              value={input}
              onChange={setInput}
              onSubmit={onSubmit}
              placeholder="질문을 입력하세요"
              variant="send"
              disabled={busy}
            />
            {busy && (
              <button className="gd-stop-btn" onClick={stopGeneration} title="답변 생성 중지">
                <span className="gd-stop-icon" />
              </button>
            )}
          </div>
          <div className="gd-composer-hint">
            <kbd>Enter</kbd> 전송 · {selectedDocs.length > 0 ? `${selectedDocs.length}개 문서로 RAG 검색 중` : "전체 문서 자동 검색"}
            {input.length > 0 && (
              <span style={{ marginLeft: 10, color: input.length > 1800 ? (input.length >= 2000 ? "var(--error, #E08A8A)" : "#FFB454") : "inherit" }}>
                {input.length} / 2000
              </span>
            )}
          </div>
        </div>
      </div>

      {showDocModal && (
        <DocSelectModal
          initialSelected={selectedDocs}
          onConfirm={(docs) => { setSelectedDocs(docs); setShowDocModal(false); }}
          onClose={() => setShowDocModal(false)}
        />
      )}

      {showLengthWarn && (
        <div className="gd-modal-wrap" onClick={() => setShowLengthWarn(false)}>
          <div className="gd-modal" onClick={(e) => e.stopPropagation()}>
            <h3>글자 수 제한 도달</h3>
            <p className="sub">
              현재 질문이 <strong>2,000자</strong>로 제한되어 뒷부분이 잘렸을 수 있습니다.<br />
              내용을 다시 확인하거나, 그대로 전송할 수 있습니다.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setShowLengthWarn(false)}
                style={{ flex: 1, padding: "11px", borderRadius: 11, border: "1px solid var(--border-strong)", background: "var(--elev2)", color: "var(--dim)", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                다시 확인하기
              </button>
              <button
                onClick={onSubmitAnyway}
                style={{ flex: 1, padding: "11px", borderRadius: 11, border: 0, background: "var(--mint-strong)", color: "var(--mint-deep)", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                그대로 질문하기
              </button>
            </div>
          </div>
        </div>
      )}

      {blocker.state === "blocked" && (
        <div className="gd-nav-block-overlay">
          <div className="gd-nav-block-card">
            <p className="gd-nav-block-msg">
              지금 페이지를 이동하면 답변을 받을 수 없어요!<br />그래도 이동할까요?
            </p>
            <div className="gd-nav-block-actions">
              <button className="gd-nav-block-wait" onClick={() => blocker.reset()}>
                답변 대기
              </button>
              <button className="gd-nav-block-go" onClick={() => blocker.proceed()}>
                이동하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}