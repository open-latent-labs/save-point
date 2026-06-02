import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { docsTree, defaultExpandedIds } from "../data/docsData.js";
import DocTreeNode from "./DocTreeNode.jsx";
import { IconSettings, IconClose, IconBookOpen, IconPin, IconFile } from "./Icons.jsx";
import { BRAND } from "../data/mock.js";
import { loadPins, MOCK_DOCS } from "../data/upload.js";

function SettingsModal({ onClose }) {
  const [streaming, setStreaming] = useState(true);
  const [korean, setKorean] = useState(true);
  const [sources, setSources] = useState(true);

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
        <button className="gd-modal-close" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

const EASE = [0.4, 0, 0.2, 1];

export default function Sidebar({ isOpen, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedIds, setExpandedIds] = useState(() => new Set(defaultExpandedIds));
  const [showSettings, setShowSettings] = useState(false);
  const [pinIds, setPinIds] = useState(() => loadPins());

  // Upload 페이지에서 핀 변경 시 동기화
  React.useEffect(() => {
    const sync = () => setPinIds(loadPins());
    window.addEventListener("gamedocs:pins", sync);
    return () => window.removeEventListener("gamedocs:pins", sync);
  }, []);

  const pinnedDocs = MOCK_DOCS.filter((d) => pinIds.includes(d.id));

  // 현재 URL에서 docId 추출
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

      {/* 상단 네비게이션 */}
      <nav className="gd-sb-nav-section">
        <button className={"gd-sb-navitem" + (isActive("/home") ? " active" : "")} onClick={() => go("/home")}>
          홈
        </button>
        <button className={"gd-sb-navitem" + (isActive("/chat") ? " active" : "")} onClick={() => go("/chat")}>
          AI 채팅
        </button>
        <button className={"gd-sb-navitem" + (isActive("/upload") ? " active" : "")} onClick={() => go("/upload")}>
          내 문서
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
              key={doc.id}
              className="gd-sb-pinned-item"
              onClick={() => go(`/chat?q=${encodeURIComponent(doc.name + " 요약해줘")}`)}
              title={doc.name}
            >
              <IconFile width="13" height="13" className="gd-sb-pinned-ic" />
              <span className="gd-sb-pinned-name">{doc.name}</span>
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
