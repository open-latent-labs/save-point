import React, { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate, useLocation } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import { getDocContent } from "../data/docsData.js";

export default function Docs() {
  const { docId = "atlassian-intro" } = useParams();
  const { onMenu, onProfile } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [docData, setDocData] = useState(() => {
    const saved = localStorage.getItem(`gamedocs_edited_${docId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return getDocContent(docId);
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draftDesc, setDraftDesc] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(`gamedocs_edited_${docId}`);
    if (saved) {
      try {
        setDocData(JSON.parse(saved));
        setIsEditing(false);
        return;
      } catch (e) { console.error(e); }
    }
    setDocData(getDocContent(docId));
    setIsEditing(false);
  }, [docId]);

  const normalizedDesc = docData.desc === "요약 내용이 비어 있습니다." ? "" : (docData.desc || "");
  const isEmpty = !normalizedDesc;

  const handleEditStart = () => {
    setDraftDesc(normalizedDesc);
    setIsEditing(true);
  };

  const handleSave = () => {
    const updated = { ...docData, desc: draftDesc };
    setDocData(updated);
    localStorage.setItem(`gamedocs_edited_${docId}`, JSON.stringify(updated));
    setIsEditing(false);
  };

  const handleCancel = () => setIsEditing(false);

  const textareaStyle = {
    width: "100%",
    minHeight: "160px",
    background: "rgba(7, 9, 10, .6)",
    border: "1px solid var(--border-strong)",
    borderRadius: "8px",
    padding: "12px 14px",
    color: "var(--text)",
    fontFamily: "var(--font-sans)",
    fontSize: "13.5px",
    lineHeight: "1.75",
    outline: "0",
    resize: "vertical",
    marginBottom: 8,
    boxSizing: "border-box",
  };

  return (
    <div className="gd-page">
      <Topbar onMenu={onMenu} onProfile={onProfile} />
      <div className="gd-page-scroll">
        <div className="gd-doc-wrap">
          <div className="gd-doc-card">
            {/* 브레드크럼 */}
            <nav className="gd-breadcrumb">
              {docData.breadcrumb.map((item, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <span className="gd-breadcrumb-sep">/</span>}
                  <span className={i === docData.breadcrumb.length - 1 ? "gd-breadcrumb-item last" : "gd-breadcrumb-item"}>
                    {item}
                  </span>
                </span>
              ))}
            </nav>

            {/* 제목 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 className="gd-doc-title" style={{ margin: 0 }}>{docData.title}</h1>
              {!location.pathname.includes("original") && (
                <button
                  onClick={() => navigate(location.pathname.replace(/\/$/, "") + "/original")}
                  className="flex-shrink-0 px-3 py-1 rounded-md text-xs border border-[var(--border)] text-[var(--dim)] bg-transparent cursor-pointer whitespace-nowrap transition-[border-color,color] duration-150 hover:border-[var(--text)] hover:text-[var(--text)]"
                >
                  원문내용 보기
                </button>
              )}
            </div>

            {/* 메타 */}
            {docData.meta && <p className="gd-doc-meta">{docData.meta}</p>}

            {/* 전체 요약 영역 */}
            <div style={{ marginTop: 16, marginBottom: 24 }}>
              {isEditing ? (
                <div>
                  <textarea
                    value={draftDesc}
                    onChange={(e) => setDraftDesc(e.target.value)}
                    placeholder="요약 내용을 입력해주세요."
                    style={textareaStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--mint)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(54, 224, 161, .12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--border-strong)";
                      e.target.style.boxShadow = "none";
                    }}
                    autoFocus
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleSave}
                      style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "var(--mint-strong)", color: "var(--mint-deep)", border: "none", cursor: "pointer" }}
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancel}
                      style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, border: "1px solid var(--border)", color: "var(--dim)", background: "transparent", cursor: "pointer" }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {isEmpty ? (
                    <p style={{ color: "var(--faint)", fontSize: "13.5px", margin: "0 0 12px" }}>
                      요약 내용이 비어 있습니다.
                    </p>
                  ) : (
                    <div
                      className="gd-doc-desc"
                      style={{ margin: "0 0 12px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {normalizedDesc}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={handleEditStart}
                      className="px-3 py-1 rounded-md text-xs border border-[var(--border)] text-[var(--dim)] bg-transparent cursor-pointer whitespace-nowrap transition-[border-color,color] duration-150 hover:border-[var(--text)] hover:text-[var(--text)]"
                    >
                      {isEmpty ? "내용 추가" : "전체 수정"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 섹션 테이블 */}
            {docData.sections.length > 0 ? (
              docData.sections.map((section, si) => (
                <section key={si} style={{ marginTop: si > 0 ? 36 : 0 }}>
                  <div className="gd-section-heading">{section.title}</div>
                  <div className="gd-doc-table-wrap">
                    <table className="gd-doc-table">
                      <thead>
                        <tr>
                          <th style={{ width: "30%" }}>제품</th>
                          <th>요약</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row, ri) => (
                          <tr key={ri}>
                            <td className="name">{row.name}</td>
                            <td className="desc">
                              <span style={{
                                color: row.desc ? "var(--dim)" : "var(--faint)",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}>
                                {row.desc || "요약 내용이 비어 있습니다."}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            ) : (
              <div className="gd-doc-empty">
                <p>요약 내용이 비어 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
