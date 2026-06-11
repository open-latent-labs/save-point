import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import { IconTrash, IconGlobe } from "../components/Icons.jsx";
import { CATEGORY_OPTIONS, formatSize } from "../data/upload.js";
import { adminApprovalList, adminApproveDocument, adminRejectDocument, adminCancelPending } from "../api/admin.js";
import { useAuth } from "../context/AuthContext.jsx";

const extColors = {
  pdf: "#E08A8A", md: "#36E0A1", txt: "#8A93FF", docx: "#5BC8FF", doc: "#5BC8FF",
};
const catColor = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.color]));
const catLabel = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.label]));

export default function Approval() {
  const { onMenu, onProfile } = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingDocs, setPendingDocs] = useState([]);
  const [approvalCount, setApprovalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      alert("접근 권한이 없습니다.");
      navigate(-1);
      return;
    }
    adminApprovalList(currentPage).then((data) => {
      if (data && Array.isArray(data.items)) {
        setPendingDocs(data.items);
        setApprovalCount(data.total);
        setTotalPages(data.total_pages);
      }
    });
  }, [user, currentPage]);

  const refreshList = () => {
    adminApprovalList(currentPage).then((data) => {
      if (data && Array.isArray(data.items)) {
        setPendingDocs(data.items);
        setApprovalCount(data.total);
        setTotalPages(data.total_pages);
        window.dispatchEvent(new Event("gamedocs:approval-count"));
      }
    });
  };

  const approveDoc = async (id) => {
    try { await adminApproveDocument(id); } catch (e) { console.error(e); }
    refreshList();
  };

  const rejectDoc = async (id) => {
    try { await adminRejectDocument(id); } catch (e) { console.error(e); }
    refreshList();
  };

  const cancelPending = async (id) => {
    try { await adminCancelPending(id); } catch (e) { console.error(e); }
    refreshList();
  };

  return (
    <div className="gd-page">
      <Topbar onMenu={onMenu} onProfile={onProfile} />
      <div className="gd-page-scroll">
        <div className="gd-up-wrap">

          <div className="gd-up-head">
            <h1 className="gd-up-title">승인 문서함</h1>
            <p className="gd-up-desc">
              공용 문서로 등록 신청한 문서 목록입니다. 관리자 승인 후 공개됩니다.
            </p>
          </div>

          {pendingDocs.length === 0 ? (
            <div className="gd-approval-empty">
              <IconGlobe width="32" height="32" style={{ opacity: 0.25 }} />
              <p>승인 대기 중인 문서가 없습니다.</p>
              <span>내 문서에서 공용 등록 신청을 해보세요.</span>
            </div>
          ) : (
            <>
              <div className="gd-mydocs-head" style={{ marginBottom: 12 }}>
                <span className="gd-mydocs-title">대기 목록</span>
                <span className="gd-mydocs-count">{approvalCount}건</span>
              </div>
              <div className="gd-doclist">
                {pendingDocs.map((doc) => (
                  <div key={doc.id} className="gd-docitem">
                    <div className="gd-docitem-ext" style={{ background: extColors[doc.extension] || "var(--dim)" }}>
                      {doc.extension?.toUpperCase()}
                    </div>

                    <div className="gd-docitem-body">
                      <div className="gd-docitem-name" title={doc.filename}>
                        {doc.filename}
                        <span className={"gd-vis-badge " + (doc.access_type === "PUBLIC" ? "public" : "private")}>
                          {doc.access_type === "PUBLIC" ? "PUBLIC" : "PRIVATE"}
                        </span>
                      </div>
                      <div className="gd-docitem-meta">
                        {doc.category && (
                          <>
                            <span className="gd-cat-dot" style={{ background: catColor[doc.category] }} />
                            <span className="gd-cat-name">{catLabel[doc.category] || doc.category}</span>
                            <span className="gd-meta-sep">·</span>
                          </>
                        )}
                        <span>{formatSize(doc.file_size)}</span>
                        <span className="gd-meta-sep">·</span>
                        <span>{doc.created_at}</span>
                        <span className="gd-meta-sep">·</span>
                        <span className="gd-public-badge">
                          <IconGlobe width="10" height="10" />
                          승인 대기중
                        </span>
                      </div>
                    </div>

                    <div className="gd-docitem-actions">
                      <button
                        className="gd-approval-approve-btn"
                        onClick={() => approveDoc(doc.id)}
                        title="승인"
                      >
                        승인
                      </button>
                      <button
                        className="gd-approval-reject-btn"
                        onClick={() => rejectDoc(doc.id)}
                        title="반려"
                      >
                        반려
                      </button>
                      <button
                        className="gd-docitem-del"
                        onClick={() => cancelPending(doc.id)}
                        aria-label="신청 취소"
                        title="신청 취소"
                      >
                        <IconTrash width="14" height="14" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="gd-pagination">
                  <button
                    className="gd-page-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    이전
                  </button>
                  <span className="gd-page-info">{currentPage} / {totalPages}</span>
                  <button
                    className="gd-page-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
