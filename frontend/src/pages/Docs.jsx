import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useOutletContext, useNavigate, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Topbar from "../components/Topbar.jsx";
import { document_content, document_original, document_delete, document_update_access } from "../api/docs.js";
import { documentBookmark, documentBookmarkDelete, documentPin, documentPinDelete, requestPublicDocument } from "../api/document.js";
import { adminPublishDocument } from "../api/admin.js";
import { IconStar, IconPin, IconGlobe } from "../components/Icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Docs() {
  const { docId = "atlassian-intro" } = useParams();
  const { onMenu, onProfile } = useOutletContext();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const navigate = useNavigate();
  const location = useLocation();

  const isOriginalView = location.pathname.includes("/original");

  const [docData, setDocData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [isFav, setIsFav] = useState(false);
  const [isPin, setIsPin] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [draftDesc, setDraftDesc] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const categoryTimerRef = useRef(null);

  useEffect(() => {
    clearTimeout(categoryTimerRef.current);
    if (isOriginalView) {
      document_original(docId).then((data) => setOriginalData(data));
    } else {
      const saved = localStorage.getItem(`gamedocs_edited_${docId}`);
      let loadedFromCache = false;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setDocData(parsed);
          setIsEditing(false);
          categoryTimerRef.current = setTimeout(() => window.__droneDocCategory?.(parsed?.summary?.category), 2800);
          loadedFromCache = true;
        } catch (e) { console.error(e); }
      }
      if (!loadedFromCache) {
        document_content(docId).then((data) => {
          setDocData(data);
          setIsFav(data?.document?.is_bookmarked ?? false);
          setIsPin(data?.document?.is_pinned ?? false);
          setIsEditing(false);
          categoryTimerRef.current = setTimeout(() => window.__droneDocCategory?.(data?.summary?.category), 2800);
        });
      }
    }
    return () => clearTimeout(categoryTimerRef.current);
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

  const handleDelete = () => setDeleteConfirmOpen(true);

  const handleDeleteConfirm = async () => {
    setDeleteConfirmOpen(false);
    await document_delete(docId);
    localStorage.removeItem(`gamedocs_edited_${docId}`);
    window.dispatchEvent(new Event("gamedocs:pins"));
    window.dispatchEvent(new Event("gamedocs:public-docs"));
    window.dispatchEvent(new Event("gamedocs:doc-deleted"));
    navigate(-1);
  };

  const toggleFav = async () => {
    const next = !isFav;
    setIsFav(next);
    try {
      if (next) await documentBookmark(docId, true);
      else await documentBookmarkDelete(docId);
    } catch { setIsFav(!next); }
  };

  const togglePin = async () => {
    const next = !isPin;
    setIsPin(next);
    try {
      if (next) await documentPin(docId, true);
      else await documentPinDelete(docId);
      window.dispatchEvent(new Event("gamedocs:pins"));
    } catch { setIsPin(!next); }
  };

  const handlePublish = async () => {
    try {
      if (isAdmin) await adminPublishDocument(docId);
      else await requestPublicDocument(docId);
      setDocData((prev) => ({
        ...prev,
        document: {
          ...prev.document,
          access_type: isAdmin ? "PUBLIC" : prev.document.access_type,
          status: isAdmin ? "APPROVED" : "PENDING",
        },
      }));
    } catch (e) { console.error(e); }
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
    <>
    <div className="gd-page">
      <Topbar onMenu={onMenu} onProfile={onProfile} />
      <div className="gd-page-scroll">
        <div className="gd-doc-wrap">
          <div className="gd-doc-card">
            {/* 상단 바: 카테고리 · 텍스트 버튼들 · 아이콘 버튼들 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              {/* 카테고리 뱃지 */}
              {!isOriginalView && docData?.summary?.category && (
                <span className="gd-breadcrumb-item" style={{ flexShrink: 0 }}>{docData.summary.category}</span>
              )}

              {/* 텍스트 버튼들 */}
              {isOriginalView ? (
                <button onClick={() => navigate(location.pathname.replace("/original", ""))} className={btnStyle}>
                  요약내용 보기
                </button>
              ) : (
                <button onClick={() => navigate(location.pathname.replace(/\/$/, "") + "/original")} className={btnStyle}>
                  원문내용 보기
                </button>
              )}
              {!isOriginalView && !isEditing && (
                <button onClick={handleEditStart} className={btnStyle}>
                  전체 수정
                </button>
              )}

              {/* 아이콘 버튼들 */}
              <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: "auto" }}>
                {docData?.document?.access_type !== "PUBLIC" && docData?.document?.status !== "PENDING" && (
                  <button
                    onClick={handlePublish}
                    title={isAdmin ? "공용 등록" : "공용 등록 신청"}
                    className="gd-docitem-pub"
                    style={{ color: "var(--dim)" }}
                  >
                    <IconGlobe width="15" height="15" />
                  </button>
                )}
                {docData?.document?.status === "PENDING" && (
                  <span style={{ fontSize: 11, color: "var(--dim)", marginRight: 4 }}>승인 대기중</span>
                )}
                <button
                  onClick={togglePin}
                  title={isPin ? "고정 해제" : "고정"}
                  className={`gd-docitem-pin${isPin ? " on" : ""}`}
                  style={{ color: isPin ? "var(--mint)" : "var(--dim)" }}
                >
                  <IconPin filled={isPin} width="15" height="15" />
                </button>
                <button
                  onClick={toggleFav}
                  title={isFav ? "즐겨찾기 해제" : "즐겨찾기"}
                  className={`gd-docitem-fav${isFav ? " on" : ""}`}
                  style={{ color: isFav ? "#FFB454" : "var(--dim)" }}
                >
                  <IconStar filled={isFav} width="15" height="15" />
                </button>
                <button
                  onClick={handleDelete}
                  title="삭제"
                  className="gd-docitem-del"
                  style={{ color: "var(--dim)" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* 제목 */}
            <h1 className="gd-doc-title" style={{ margin: "0 0 4px" }}>{activeData.document.filename}</h1>

            {/* 메타 */}
            {activeData.document?.created_at && (
              <p className="gd-doc-meta">{new Date(activeData.document.created_at).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16).replace('T', ' ')}</p>
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
                        className="gd-doc-desc gd-markdown"
                        style={{ margin: "0 0 12px", wordBreak: "break-word" }}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {normalizedDesc}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>

    {/* ── 삭제 확인 모달 ── */}
    <AnimatePresence>
      {deleteConfirmOpen && (
        <>
          {/* 오버레이 */}
          <motion.div
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,.55)",
              backdropFilter: "blur(3px)",
            }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDeleteConfirmOpen(false)}
          />

          {/* 모달 본체 */}
          <motion.div
            style={{
              position: "fixed", top: "50%", left: "50%",
              zIndex: 201,
              width: "min(380px, calc(100vw - 32px))",
              background: "var(--elev)",
              border: "1px solid var(--border-strong)",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 32px 80px -16px rgba(0,0,0,.6), 0 0 0 1px rgba(224,138,138,.08)",
            }}
            initial={{ opacity: 0, scale: 0.94, x: "-50%", y: "-44%" }}
            animate={{ opacity: 1, scale: 1,    x: "-50%", y: "-50%" }}
            exit={{   opacity: 0, scale: 0.94, x: "-50%", y: "-44%" }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={e => e.stopPropagation()}
          >
            {/* 위험 컬러 스트립 */}
            <div style={{ height: 3, background: "linear-gradient(90deg, #c97070 0%, #e08a8a 100%)" }} />

            <div style={{ padding: "22px 24px 24px" }}>
              {/* 아이콘 */}
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(224,138,138,.10)",
                border: "1px solid rgba(224,138,138,.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16, color: "#e08a8a",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </div>

              {/* 제목 */}
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-sans)" }}>
                문서를 삭제하시겠습니까?
              </h3>

              {/* 파일명 */}
              <p style={{
                margin: "0 0 14px", fontSize: 13, color: "var(--dim)",
                fontFamily: "var(--font-sans)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {activeData?.document?.filename}
              </p>

              {/* 경고 박스 */}
              <div style={{
                padding: "9px 12px", borderRadius: 8,
                background: "rgba(224,138,138,.07)",
                border: "1px solid rgba(224,138,138,.18)",
                fontSize: 12, color: "var(--faint)",
                fontFamily: "var(--font-sans)", lineHeight: 1.65,
                marginBottom: 20,
              }}>
                삭제된 문서는 복구할 수 없습니다.
              </div>

              {/* 버튼 */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="gd-mypage-action"
                  style={{ flex: 1, margin: 0, justifyContent: "center", fontSize: 13 }}
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="gd-del-confirm-btn"
                >
                  삭제
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
