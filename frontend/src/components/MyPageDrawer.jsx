import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CATEGORY_OPTIONS, formatSize, loadFavs } from "../data/upload.js";
import { IconClose, IconGoogle, IconKakao, IconNaver } from "./Icons.jsx";
import { getLinkedOAuth, unlinkOAuth, setPrimaryEmail } from "../api/auth.js";
import { document_list, documentPinList } from "../api/document.js";
import { useAuth } from "../context/AuthContext.jsx";


const AVATAR_BG = [
  ["#2dd4bf", "#0d9488"], ["#60a5fa", "#2563eb"], ["#f472b6", "#db2777"],
  ["#fbbf24", "#d97706"], ["#a78bfa", "#7c3aed"], ["#34d399", "#059669"],
];

const catLabel = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.label]));
const catColor = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.color]));
const extBg = { pdf: "#c97070", md: "#36E0A1", txt: "#8A93FF", docx: "#5BC8FF", doc: "#5BC8FF" };

const API_BASE = "/api";

const PROVIDERS = [
  { key: "google", label: "Google", Icon: IconGoogle },
  { key: "kakao", label: "Kakao", Icon: IconKakao },
  { key: "naver", label: "Naver", Icon: IconNaver },
];

const TABS = ["내 정보", "내 문서", "설정"];

const THEMES = [
  { id: "mint",  label: "민트",   sub: "기본 다크",  color: "#36E0A1", bg: "#07090A", textColor: "#EAF0EC" },
  { id: "light", label: "라이트", sub: "밝은 화면",  color: "#059669", bg: "#F4F6F5", textColor: "#111827" },
];

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
  const { user, login, logout } = useAuth();

  const [myDocs, setMyDocs] = useState([]);
  const [pinCount, setPinCount] = useState(0);
  const favCount = loadFavs().length;

  const [animType, setAnimTypeState] = useState(() => localStorage.getItem("gamedocs_anim") ?? "1");
  const [theme, setThemeState] = useState(() => localStorage.getItem("gamedocs_theme") ?? "mint");
  const [streaming, setStreaming] = useState(true);
  const [korean, setKorean] = useState(true);
  const [sources, setSources] = useState(true);

  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    document_list(1, { size: 50 })
      .then((data) => {
        const docs = Array.isArray(data) ? data : (data?.documents ?? []);
        setMyDocs(docs.map((d) => ({
          id: d.id,
          name: d.filename ?? "",
          size: d.file_size ?? 0,
          ext: (d.extension ?? "").toLowerCase().replace(/^\./, "") || "file",
          category: d.category ?? "OTHER",
        })));
      })
      .catch(() => { });
    documentPinList()
      .then((data) => setPinCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setPinCount(0));
  }, [open]);

  useEffect(() => {
    if (open && tab === "내 정보") {
      getLinkedOAuth()
        .then((data) => setLinkedAccounts(data.accounts))
        .catch(() => { });
    }
  }, [open, tab]);

  const handleLink = (provider) => {
    window.location.href = `${API_BASE}/auth/link/${provider}/init`;
  };

  const handleUnlink = async (provider) => {
    setOauthLoading(true);
    try {
      await unlinkOAuth(provider);
      setLinkedAccounts((prev) => prev.filter((a) => a.provider !== provider));
    } catch {
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSetPrimary = async (email) => {
    setOauthLoading(true);
    try {
      const updatedUser = await setPrimaryEmail(email);
      login(updatedUser);
    } catch {
    } finally {
      setOauthLoading(false);
    }
  };

  const setAnimType = (val) => {
    setAnimTypeState(val);
    localStorage.setItem("gamedocs_anim", val);
    window.dispatchEvent(new Event("gamedocs:anim"));
  };

  const applyTheme = (val) => {
    setThemeState(val);
    localStorage.setItem("gamedocs_theme", val);
    document.documentElement.setAttribute("data-theme", val);
    window.dispatchEvent(new Event("gamedocs:theme"));
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
                <Avatar name={user?.name} />
                <div>
                  <div className="gd-mypage-name">
                    {user?.name}
                    <span className="gd-mypage-badge">{user?.role}</span>
                  </div>
                  <div className="gd-mypage-email">{user?.email}</div>
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
                      <div className="gd-mypage-stat-val">{user?.ask_count ?? 0}</div>
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
                      { key: "아이디", val: user?.user_id },
                      { key: "이메일", val: user?.email },
                      { key: "가입일", val: user?.created_at },
                      { key: "고정", val: `${pinCount}개` },
                    ].map(({ key, val }) => (
                      <div key={key} className="gd-mypage-inforow">
                        <span className="gd-mypage-infokey">{key}</span>
                        <span className="gd-mypage-infoval">{val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="gd-mypage-section-div" style={{ margin: "8px 0 4px" }} />

                  {/* 연결된 소셜 계정 */}
                  <div className="gd-mypage-section-label">연결된 계정</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {PROVIDERS.map(({ key, label, Icon }) => {
                      const account = linkedAccounts.find((a) => a.provider === key);
                      const linked = !!account;
                      const isPrimary = account?.email && account.email === user?.email;
                      return (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Icon />
                            <span style={{ fontSize: 13, color: "var(--fg)" }}>{label}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {linked && account.email && (
                              isPrimary ? (
                                <span style={{
                                  fontSize: 10, padding: "2px 7px", borderRadius: 5,
                                  background: "rgba(54,224,161,.12)",
                                  color: "var(--mint)",
                                  border: "1px solid rgba(54,224,161,.25)",
                                  whiteSpace: "nowrap",
                                }}>
                                  대표 이메일
                                </span>
                              ) : (
                                <button
                                  style={{
                                    fontSize: 11, padding: "2px 8px", borderRadius: 5,
                                    border: "1px solid var(--border-strong)", background: "transparent",
                                    color: "var(--text)", cursor: "pointer", whiteSpace: "nowrap",
                                  }}
                                  disabled={oauthLoading}
                                  onClick={() => handleSetPrimary(account.email)}
                                >
                                  대표로 설정
                                </button>
                              )
                            )}
                            {linked ? (
                              <button
                                style={{
                                  fontSize: 11, padding: "3px 10px", borderRadius: 6,
                                  border: "1px solid var(--border-strong)", background: "transparent",
                                  color: "var(--faint)", cursor: "pointer"
                                }}
                                disabled={oauthLoading}
                                onClick={() => handleUnlink(key)}
                              >
                                연결 해제
                              </button>
                            ) : (
                              <button
                                style={{
                                  fontSize: 11, padding: "3px 10px", borderRadius: 6,
                                  border: "none", background: "var(--accent)",
                                  color: "#fff", cursor: "pointer"
                                }}
                                disabled={oauthLoading}
                                onClick={() => handleLink(key)}
                              >
                                연결하기
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="gd-mypage-section-div" style={{ margin: "8px 0 4px" }} />

                  <button
                    className="gd-mypage-action danger"
                    onClick={async () => { await logout(); onClose(); navigate("/login"); }}
                    style={{ marginTop: 8 }}
                  >
                    로그아웃
                  </button>
                </>
              )}

              {/* ── 내 문서 ── */}
              {tab === "내 문서" && (
                <>
                  <div className="gd-mypage-section-label">업로드한 문서 <span style={{ color: "var(--border-strong)", marginLeft: 4 }}>{myDocs.length}</span></div>

                  {myDocs.length === 0 ? (
                    <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--faint)", fontSize: 13 }}>
                      업로드된 문서가 없습니다.
                    </div>
                  ) : (
                    myDocs.map((doc) => (
                      <button
                        key={doc.id}
                        className="gd-mypage-docitem"
                        onClick={() => { onClose(); navigate(`/docs/${doc.id}`); }}
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
                            <span style={{ color: "var(--border-strong)" }}>·</span>
                            <span>{formatSize(doc.size)}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}

                </>
              )}

              {/* ── 설정 ── */}
              {tab === "설정" && (
                <div className="gd-mypage-settings">
                  {/* 테마 선택 */}
                  <div className="gd-setting-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8, paddingBottom: 12 }}>
                    <div className="lbl">테마</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                      {THEMES.map(({ id, label, sub, color, bg, textColor }) => {
                        const active = theme === id;
                        return (
                          <button
                            key={id}
                            onClick={() => applyTheme(id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              width: "100%", padding: "9px 12px",
                              border: `1px solid ${active ? color : "var(--border-strong)"}`,
                              borderRadius: 10, background: bg, cursor: "pointer",
                              transition: "border-color .15s, box-shadow .15s",
                              boxShadow: active ? `0 0 0 2px ${color}40` : "none",
                              textAlign: "left",
                            }}
                          >
                            <span style={{
                              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                              background: color,
                              boxShadow: active ? `0 0 8px ${color}` : "none",
                            }} />
                            <span style={{ flex: 1 }}>
                              <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: textColor, fontFamily: "var(--font-sans)" }}>{label}</span>
                              <span style={{ display: "block", fontSize: 11, color: textColor + "88", fontFamily: "var(--font-mono)" }}>{sub}</span>
                            </span>
                            {active && (
                              <span style={{ fontSize: 10, color, fontFamily: "var(--font-mono)", letterSpacing: ".04em" }}>ACTIVE</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* 애니메이션 세그먼트 */}
                  <div className="gd-setting-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                    <div className="lbl">애니메이션</div>
                    <div className="gd-anim-segment">
                      {[
                        { v: "0", label: "끄기" },
                        { v: "1", label: "1" }, { v: "2", label: "2" }, { v: "3", label: "3" },
                      ].map((o) => (
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
                    { label: "스트리밍 응답", desc: "AI 답변을 타이핑 애니메이션으로 표시", on: streaming, toggle: () => setStreaming(v => !v) },
                    { label: "한국어 우선", desc: "답변을 한국어로 우선 생성", on: korean, toggle: () => setKorean(v => !v) },
                    { label: "출처 표시", desc: "답변 하단에 참고 문서 링크 노출", on: sources, toggle: () => setSources(v => !v) },
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

            {tab === "내 문서" && (
              <div className="gd-mypage-footer">
                <button
                  className="gd-mypage-action mint"
                  onClick={() => { onClose(); navigate("/upload"); }}
                >
                  + 문서 업로드
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
