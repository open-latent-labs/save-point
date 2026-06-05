import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MOCK_DOCS, CATEGORY_OPTIONS, formatSize, loadFavs, loadPins } from "../data/upload.js";
import { IconClose } from "./Icons.jsx";

const MOCK_ME = {
  name: "김개발",
  handle: "@kimdev",
  email: "kimdev@studio.com",
  joinedAt: "2024-05-12",
  questions: 124,
};

const AVATAR_BG = [
  ["#2dd4bf","#0d9488"], ["#60a5fa","#2563eb"], ["#f472b6","#db2777"],
  ["#fbbf24","#d97706"], ["#a78bfa","#7c3aed"], ["#34d399","#059669"],
];

const catLabel = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.label]));
const catColor = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.color]));
const extBg = { pdf:"#c97070", md:"#36E0A1", txt:"#8A93FF", docx:"#5BC8FF", doc:"#5BC8FF" };

const TABS = ["내 정보", "내 문서", "설정"];

function Avatar({ name }) {
  const [a, b] = AVATAR_BG[(name?.charCodeAt(0) ?? 0) % AVATAR_BG.length];
  return (
    <div
      className="gd-mypage-avatar"
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
      aria-hidden
    >
      {name?.slice(0, 1)}
    </div>
  );
}

export default function MyPageDrawer({ open, onClose }) {
  const [tab, setTab] = useState("내 정보");
  const navigate = useNavigate();

  const myDocs   = MOCK_DOCS.filter((d) => !d.isPublic);
  const favCount = loadFavs().length || 3;
  const pinCount = loadPins().length;

  const [animType, setAnimTypeState] = useState(() => localStorage.getItem("gamedocs_anim") ?? "1");
  const [streaming, setStreaming] = useState(true);
  const [korean, setKorean]       = useState(true);
  const [sources, setSources]     = useState(true);

  const setAnimType = (val) => {
    setAnimTypeState(val);
    localStorage.setItem("gamedocs_anim", val);
    window.dispatchEvent(new Event("gamedocs:anim"));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="mp-overlay"
            className="gd-mypage-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.aside
            key="mp-drawer"
            className="gd-mypage-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* 상단 브랜드 스트립 */}
            <div className="gd-sb-brand-strip" />

            {/* 헤더 */}
            <div className="gd-mypage-head">
              <div className="gd-mypage-headrow">
                <span className="gd-mypage-kicker">마이페이지</span>
                <button className="gd-mypage-close" onClick={onClose} aria-label="닫기">
                  <IconClose width={16} height={16} />
                </button>
              </div>

              <div className="gd-mypage-profile">
                <Avatar name={MOCK_ME.name} />
                <div>
                  <div className="gd-mypage-name">
                    {MOCK_ME.name}
                    <span className="gd-mypage-badge">USER</span>
                  </div>
                  <div className="gd-mypage-email">{MOCK_ME.email}</div>
                </div>
              </div>
            </div>

            {/* 탭 */}
            <div className="gd-mypage-tabs">
              {TABS.map((t) => (
                <button
                  key={t}
                  className={"gd-mypage-tab" + (tab === t ? " active" : "")}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* 본문 */}
            <div className="gd-mypage-body">

              {/* ── 내 정보 ── */}
              {tab === "내 정보" && (
                <>
                  {/* 통계 */}
                  <div className="gd-mypage-stats">
                    <div className="gd-mypage-stat">
                      <div className="gd-mypage-stat-val">{MOCK_ME.questions}</div>
                      <div className="gd-mypage-stat-lbl">질문</div>
                    </div>
                    <div className="gd-mypage-stat">
                      <div className="gd-mypage-stat-val" style={{ color: "#8A93FF" }}>{myDocs.length}</div>
                      <div className="gd-mypage-stat-lbl">문서</div>
                    </div>
                    <div className="gd-mypage-stat">
                      <div className="gd-mypage-stat-val" style={{ color: "#FFB454" }}>{favCount}</div>
                      <div className="gd-mypage-stat-lbl">즐겨찾기</div>
                    </div>
                  </div>

                  <div className="gd-mypage-section-div" style={{ margin: "10px 0 0" }} />

                  {/* 기본 정보 */}
                  <div className="gd-mypage-section-label">기본 정보</div>
                  <div>
                    {[
                      { key: "닉네임",  val: MOCK_ME.handle },
                      { key: "이메일",  val: MOCK_ME.email },
                      { key: "가입일",  val: MOCK_ME.joinedAt },
                      { key: "고정",    val: `${pinCount}개` },
                    ].map(({ key, val }) => (
                      <div key={key} className="gd-mypage-inforow">
                        <span className="gd-mypage-infokey">{key}</span>
                        <span className="gd-mypage-infoval">{val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="gd-mypage-section-div" style={{ margin: "8px 0 4px" }} />

                  <button
                    className="gd-mypage-action danger"
                    onClick={() => { onClose(); navigate("/login"); }}
                    style={{ marginTop: 8 }}
                  >
                    로그아웃
                  </button>
                </>
              )}

              {/* ── 내 문서 ── */}
              {tab === "내 문서" && (
                <>
                  <div className="gd-mypage-section-label">업로드한 문서 <span style={{ color:"var(--border-strong)", marginLeft:4 }}>{myDocs.length}</span></div>

                  {myDocs.length === 0 ? (
                    <div style={{ padding:"40px 16px", textAlign:"center", color:"var(--faint)", fontSize:13 }}>
                      업로드된 문서가 없습니다.
                    </div>
                  ) : (
                    myDocs.map((doc) => (
                      <button
                        key={doc.id}
                        className="gd-mypage-docitem"
                        onClick={() => { onClose(); navigate(`/docs/${encodeURIComponent(doc.name)}`); }}
                        title={doc.name}
                      >
                        <div
                          className="gd-mypage-docext"
                          style={{ background: extBg[doc.ext] || "var(--dim)" }}
                        >
                          {doc.ext.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="gd-mypage-docname">{doc.name}</div>
                          <div className="gd-mypage-docmeta">
                            <span className="gd-mypage-doccat" style={{ background: catColor[doc.category] }} />
                            <span>{catLabel[doc.category]}</span>
                            <span style={{ color:"var(--border-strong)" }}>·</span>
                            <span>{formatSize(doc.size)}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}

                  <div className="gd-mypage-section-div" style={{ margin:"8px 0 4px" }} />
                  <button
                    className="gd-mypage-action mint"
                    onClick={() => { onClose(); navigate("/upload"); }}
                  >
                    + 문서 업로드
                  </button>
                </>
              )}

              {/* ── 설정 ── */}
              {tab === "설정" && (
                <div className="gd-mypage-settings">
                  {/* 애니메이션 세그먼트 */}
                  <div className="gd-setting-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                    <div className="lbl">애니메이션</div>
                    <div className="gd-anim-segment">
                      {[{ v:"0", label:"끄기" }, { v:"1", label:"1" }, { v:"2", label:"2" }].map((o) => (
                        <button
                          key={o.v}
                          className={"gd-anim-seg-btn" + (animType === o.v ? " active" : "")}
                          onClick={() => setAnimType(o.v)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {[
                    { label:"스트리밍 응답", desc:"AI 답변을 타이핑 애니메이션으로 표시", on:streaming, toggle:() => setStreaming(v=>!v) },
                    { label:"한국어 우선",   desc:"답변을 한국어로 우선 생성",            on:korean,    toggle:() => setKorean(v=>!v) },
                    { label:"출처 표시",     desc:"답변 하단에 참고 문서 링크 노출",       on:sources,   toggle:() => setSources(v=>!v) },
                  ].map(({ label, desc, on, toggle }) => (
                    <div key={label} className="gd-setting-row">
                      <div>
                        <div className="lbl">{label}</div>
                        <div className="desc">{desc}</div>
                      </div>
                      <button
                        className={"gd-toggle" + (on ? " on" : "")}
                        onClick={toggle}
                        aria-pressed={on}
                        aria-label={label}
                      />
                    </div>
                  ))}
                </div>
              )}

            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
