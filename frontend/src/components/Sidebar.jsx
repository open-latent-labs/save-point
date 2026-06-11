import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { docsTree, defaultExpandedIds } from "../data/docsData.js";
import DocTreeNode from "./DocTreeNode.jsx";
import { IconSettings, IconClose, IconBookOpen, IconPin, IconFile, IconGlobe, IconChat, IconPlus, IconTrashTiny } from "./Icons.jsx";
import { BRAND } from "../data/mock.js";
import { loadPending } from "../data/upload.js";
import { documentPinList } from "../api/document.js";
import { loadRooms, createRoom, deleteRoom } from "../data/chatRooms.js";
import { useAuth } from "../context/AuthContext.jsx";

function AnimSegment({ value, onChange }) {
  const opts = [{ v: "0", label: "끄기" }, { v: "1", label: "1" }, { v: "2", label: "2" }];
  return (
    <div className="gd-anim-segment">
      {opts.map((o) => (
        <button
          key={o.v}
          className={"gd-anim-seg-btn" + (value === o.v ? " active" : "")}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SettingsModal({ onClose }) {
  const [streaming, setStreaming] = useState(true);
  const [korean, setKorean] = useState(true);
  const [sources, setSources] = useState(true);
  const [animType, setAnimTypeState] = useState(
    () => localStorage.getItem("gamedocs_anim") ?? "1"
  );

  const setAnimType = (val) => {
    setAnimTypeState(val);
    localStorage.setItem("gamedocs_anim", val);
    window.dispatchEvent(new Event("gamedocs:anim"));
  };

  const Row = ({ label, desc, on, set }) => (
    <div className="gd-setting-row">
      <div>
        <div className="lbl">{label}</div>
        <div className="desc">{desc}</div>
      </div>
      <button
        className={"gd-toggle" + (on ? " on" : "")}
        onClick={() => set(!on)}
        aria-pressed={on}
        aria-label={label}
      />
    </div>
  );

  return (
    <div className="gd-modal-wrap" onClick={onClose}>
      <div className="gd-modal" onClick={(e) => e.stopPropagation()}>
        <h3>설정</h3>
        <p className="sub">데모용 설정 패널입니다. (mock)</p>
        <Row label="스트리밍 응답" desc="AI 답변을 타이핑 애니메이션으로 표시" on={streaming} set={setStreaming} />
        <Row label="한국어 우선" desc="답변을 한국어로 우선 생성" on={korean} set={setKorean} />
        <Row label="출처 표시" desc="답변 하단에 참고 문서 링크 노출" on={sources} set={setSources} />
        <div className="gd-setting-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
          <div className="lbl">애니메이션</div>
          <AnimSegment value={animType} onChange={setAnimType} />
        </div>
        <button className="gd-modal-close" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

const EASE = [0.4, 0, 0.2, 1];

export default function Sidebar({ isOpen, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [expandedIds, setExpandedIds] = useState(() => new Set(defaultExpandedIds));
  const [showSettings, setShowSettings] = useState(false);
  const [pinnedDocs, setPinnedDocs] = useState([]);
  const [pendingIds, setPendingIds] = useState(() => loadPending());
  const [rooms, setRooms] = useState([]);
  const [chatOpen, setChatOpen] = useState(() => location.pathname.startsWith("/chat"));

  const fetchPinnedDocs = React.useCallback(async () => {
    try {
      const data = await documentPinList();
      setPinnedDocs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  React.useEffect(() => {
    fetchPinnedDocs();
    const syncPins    = () => fetchPinnedDocs();
    const syncPending = () => setPendingIds(loadPending());
    const syncRooms   = () => loadRooms(user?.id).then((data) => setRooms(data));

    window.addEventListener("gamedocs:pins",    syncPins);
    window.addEventListener("gamedocs:pending", syncPending);
    window.addEventListener("gamedocs:rooms",   syncRooms);

    // 초기 로드
    loadRooms(user?.id).then((data) => setRooms(data));

    return () => {
      window.removeEventListener("gamedocs:pins",    syncPins);
      window.removeEventListener("gamedocs:pending", syncPending);
      window.removeEventListener("gamedocs:rooms",   syncRooms);
    };
  }, [fetchPinnedDocs, user?.id]);

  const docMatch = location.pathname.match(/^\/docs\/(.+)/);
  const currentDocId = docMatch ? docMatch[1] : null;

  const go = (path) => {
    navigate(path);
    onNavigate?.();
  };

  const handleDocSelect = (id) => {
    navigate(`/docs/${id}`);
    onNavigate?.();
  };

  const handleToggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (location.pathname.startsWith("/chat")) setChatOpen(true);
  }, [location.pathname]);

  const isActive = (path) =>
    path === "/chat"
      ? location.pathname.startsWith("/chat")
      : location.pathname === path;

  return (
    <motion.aside
      className="gd-sidebar"
      animate={{ width: isOpen ? 260 : 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <div style={{ width: 260, minWidth: 260, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 브랜드 그라디언트 스트립 */}
      <div className="gd-sb-brand-strip" />

      {/* 헤더 */}
      <div className="gd-sb-head">
        <Link to="/home" className="gd-logo" onClick={() => onNavigate?.()}>
          {BRAND}<span className="ai">.ai</span>
        </Link>
        <button className="gd-sb-close" onClick={() => onNavigate?.()} aria-label="사이드바 닫기">
          <IconClose width="18" height="18" />
        </button>
      </div>

      {/* 새 채팅 버튼 */}
      <button
        className="gd-newchat"
        onClick={async () => {
          const room = await createRoom(user?.id);
          go(`/chat?room=${room.id}`);
        }}
      >
        <IconPlus />
        새 채팅
      </button>

      {/* 상단 네비게이션 */}
      <nav className="gd-sb-nav-section">
        <button className={"gd-sb-navitem" + (isActive("/home") ? " active" : "")} onClick={() => go("/home")}>
          홈
        </button>
        {/* AI 채팅 — 클릭 시 목록 토글 */}
        <button
          className={"gd-sb-navitem gd-sb-navitem--chat" + (isActive("/chat") ? " active" : "")}
          onClick={() => { go("/chat"); setChatOpen((v) => !v); }}
        >
          AI 채팅
          <motion.svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            width={13} height={13}
            style={{ marginLeft: "auto", flexShrink: 0 }}
            animate={{ rotate: chatOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </button>

        <AnimatePresence initial={false}>
          {chatOpen && (
            <motion.div
              key="chat-rooms"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className="gd-sb-rooms-list">
                {rooms.map((room) => {
                  const active = location.search.includes(`room=${room.id}`);
                  return (
                    <div key={room.id} className={"gd-sb-room-item" + (active ? " active" : "")}>
                      <button
                        className="gd-sb-room-btn"
                        onClick={() => go(`/chat?room=${room.id}`)}
                        title={room.title}
                      >
                        <span className="gd-sb-room-title">{room.title}</span>
                        <span className="gd-sb-room-date">{room.date?.slice(5)}</span>
                      </button>
                      <button
                        className="gd-sb-room-del"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await deleteRoom(room.id);
                          loadRooms(user?.id).then((data) => setRooms(data));
                        }}
                        aria-label="삭제"
                      >
                        <IconClose width="11" height="11" />
                      </button>
                    </div>
                  );
                })}
                {rooms.length === 0 && (
                  <div className="gd-sb-pinned-empty" style={{ paddingLeft: 12 }}>채팅 기록이 없습니다</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button className={"gd-sb-navitem" + (isActive("/upload") ? " active" : "")} onClick={() => go("/upload")}>
          내 문서
        </button>
        <button
          className={"gd-sb-navitem" + (isActive("/approval") ? " active" : "")}
          onClick={() => go("/approval")}
          style={{ display: "flex", alignItems: "center", gap: 7 }}
        >
          <IconGlobe width="13" height="13" />
          승인 문서함
          {pendingIds.length > 0 && (
            <span className="gd-sb-pending-count">{pendingIds.length}</span>
          )}
        </button>
      </nav>

      {/* ── 내 문서함 (고정핀 된 문서) ── */}
      <div className="gd-sb-section-div" />
      <div className="gd-sb-section-label">
        <IconPin width="12" height="12" /> 내 문서함
      </div>
      <div className="gd-sb-pinned-list">
        {pinnedDocs.length === 0 ? (
          <div className="gd-sb-pinned-empty">고정된 문서가 없습니다</div>
        ) : (
          pinnedDocs.map((doc) => (
            <button
              key={doc.document_id}
              className="gd-sb-pinned-item"
              onClick={() => go(`/chat?q=${encodeURIComponent((doc.filename ?? "") + " 요약해줘")}`)}
              title={doc.filename}
            >
              <IconFile width="13" height="13" className="gd-sb-pinned-ic" />
              <span className="gd-sb-pinned-name">{doc.filename}</span>
            </button>
          ))
        )}
      </div>

      {/* 구분선 + 공용 문서 섹션 헤딩 */}
      <div className="gd-sb-section-div" />
      <div className="gd-sb-section-label">
        <IconBookOpen width="12" height="12" /> 공용 문서
      </div>

      {/* 공용 문서 트리 */}
      <div className="gd-sb-tree-scroll">
        {docsTree.map((node) => (
          <DocTreeNode
            key={node.id}
            node={node}
            level={0}
            activeId={currentDocId}
            onSelect={handleDocSelect}
            expandedIds={expandedIds}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* 하단 푸터 */}
      <div className="gd-sb-foot">
        <div className="gd-sb-foot-wiki">CURVC DevOps Wiki v1.0</div>
        <button className="gd-sb-item" onClick={() => setShowSettings(true)}>
          <IconSettings width="15" height="15" /> <span className="txt">설정</span>
        </button>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </div>
    </motion.aside>
  );
}