import React, { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate, useLocation } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import { document_content, document_original, document_delete, document_update_access } from "../api/docs.js";

export default function Docs() {
  const { docId = "atlassian-intro" } = useParams();
  const { onMenu, onProfile } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const isOriginalView = location.pathname.includes("/original");

  const [docData, setDocData] = useState(null);
  const [originalData, setOriginalData] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draftDesc, setDraftDesc] = useState("");

  useEffect(() => {
    if (isOriginalView) {
      document_original(docId).then((data) => setOriginalData(data));
    } else {
      const saved = localStorage.getItem(`gamedocs_edited_${docId}`);
      if (saved) {
        try {
          setDocData(JSON.parse(saved));
          setIsEditing(false);
          return;
        } catch (e) { console.error(e); }
      }
      document_content(docId).then((data) => {
        setDocData(data);
        setIsEditing(false);
      });
    }
  }, [docId, isOriginalView]);

  const activeData = isOriginalView ? originalData : docData;

  if (!activeData) {
    return (
      <div className="gd-page">
        <Topbar onMenu={onMenu} onProfile={onProfile} />
        <div className="gd-page-scroll">
          <div className="gd-doc-wrap">
            <div className="gd-doc-card">
              <p style={{ color: "var(--dim)", fontSize: "13.5px" }}>불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const normalizedDesc = docData?.summary?.summary || "";
  const isEmpty = !normalizedDesc;

  const handleEditStart = () => {
    setDraftDesc(normalizedDesc);
    setIsEditing(true);
  };

  const handleSave = async () => {
    await document_update_access(docId, draftDesc);
    setDocData({ ...docData, summary: { ...docData.summary, summary: draftDesc } });
    setIsEditing(false);
  };

  const handleCancel = () => setIsEditing(false);

  const handleDelete = async () => {
    if (!window.confirm("문서를 삭제하시겠습니까?")) return;
    await document_delete(docId);
    navigate(-1);
  };

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

  const btnStyle = "flex-shrink-0 px-3 py-1 rounded-md text-xs border border-[var(--mint-strong)]/40 text-[var(--mint)]/70 bg-transparent cursor-pointer whitespace-nowrap transition-[border-color,color] duration-150 hover:border-[var(--mint)] hover:text-[var(--mint)]";

  return (
    <div className="gd-page">
      <Topbar onMenu={onMenu} onProfile={onProfile} />
      <div className="gd-page-scroll">
        <div className="gd-doc-wrap">
          <div className="gd-doc-card">
            {/* 브레드크럼 */}
            {!isOriginalView && docData?.summary?.category && (
              <nav className="gd-breadcrumb">
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="gd-breadcrumb-item">{docData.summary.category}</span>
                </span>
              </nav>
            )}

            {/* 제목 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 className="gd-doc-title" style={{ margin: 0 }}>{activeData.document.filename}</h1>
              {isOriginalView ? (
                <button
                  onClick={() => navigate(location.pathname.replace("/original", ""))}
                  className={btnStyle}
                >
                  요약내용 보기
                </button>
              ) : (
                <button
                  onClick={() => navigate(location.pathname.replace(/\/$/, "") + "/original")}
                  className={btnStyle}
                >
                  원문내용 보기
                </button>
              )}
              <button
                onClick={handleDelete}
                className="flex-shrink-0 ml-auto px-3 py-1 rounded-md text-xs border border-red-900/60 text-red-400/80 border-[var(--border)] text-[var(--dim)] bg-transparent cursor-pointer whitespace-nowrap transition-[border-color,color] duration-150 hover:border-red-400 hover:text-red-400"
              >
                삭제
              </button>
            </div>

            {/* 메타 */}
            {activeData.document?.created_at && (
              <p className="gd-doc-meta">{activeData.document.created_at}</p>
            )}

            {/* 원문 내용 */}
            {isOriginalView ? (
              <div style={{ marginTop: 16, marginBottom: 24 }}>
                {originalData?.raw_text ? (
                  <div
                    className="gd-doc-desc"
                    style={{ margin: "0 0 12px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-mono, monospace)", fontSize: "13px", lineHeight: 1.8 }}
                  >
                    {originalData.raw_text}
                  </div>
                ) : (
                  <p style={{ color: "var(--faint)", fontSize: "13.5px", margin: "0 0 12px" }}>
                    원문 내용이 없습니다.
                  </p>
                )}
              </div>
            ) : (
              /* 요약 영역 */
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
                        전체 수정
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
