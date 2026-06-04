import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import { IconTrash, IconGlobe } from "../components/Icons.jsx";
import {
  loadPending, savePending, loadRejected, saveRejected,
  loadApproved, saveApproved,
  MOCK_DOCS, CATEGORY_OPTIONS, formatSize,
} from "../data/upload.js";

const extColors = {
  pdf: "#E08A8A", md: "#36E0A1", txt: "#8A93FF", docx: "#5BC8FF", doc: "#5BC8FF",
};
const catColor = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.color]));
const catLabel = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.label]));

export default function Approval() {
  const { onMenu } = useOutletContext();
  const [pendingIds, setPendingIds] = useState(() => loadPending());
  const [rejectedIds, setRejectedIds] = useState(() => loadRejected());
  const [approvedIds, setApprovedIds] = useState(() => loadApproved());

  const pendingDocs = MOCK_DOCS.filter((d) => pendingIds.includes(d.id));

  const cancelPending = (id) => {
    const next = pendingIds.filter((p) => p !== id);
    setPendingIds(next);
    savePending(next);
  };

  const rejectDoc = (id) => {
    const nextPending = pendingIds.filter((p) => p !== id);
    const nextRejected = [...new Set([...rejectedIds, id])];
    setPendingIds(nextPending);
    setRejectedIds(nextRejected);
    savePending(nextPending);
    saveRejected(nextRejected);
  };

  const approveDoc = (id) => {
    const nextPending = pendingIds.filter((p) => p !== id);
    const nextApproved = [...new Set([...approvedIds, id])];
    setPendingIds(nextPending);
    setApprovedIds(nextApproved);
    savePending(nextPending);
    saveApproved(nextApproved);
  };

  return (
    <div className="gd-page">
      <Topbar onMenu={onMenu} />
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
                <span className="gd-mydocs-count">{pendingDocs.length}건</span>
              </div>
              <div className="gd-doclist">
                {pendingDocs.map((doc) => (
                  <div key={doc.id} className="gd-docitem">
                    <div className="gd-docitem-ext" style={{ background: extColors[doc.ext] || "var(--dim)" }}>
                      {doc.ext.toUpperCase()}
                    </div>

                    <div className="gd-docitem-body">
                      <div className="gd-docitem-name" title={doc.name}>
                        {doc.name}
                        <span className={"gd-vis-badge " + (doc.isPublic ? "public" : "private")}>
                          {doc.isPublic ? "PUBLIC" : "PRIVATE"}
                        </span>
                      </div>
                      <div className="gd-docitem-meta">
                        <span className="gd-cat-dot" style={{ background: catColor[doc.category] }} />
                        <span className="gd-cat-name">{catLabel[doc.category] || doc.category}</span>
                        <span className="gd-meta-sep">·</span>
                        <span>{formatSize(doc.size)}</span>
                        <span className="gd-meta-sep">·</span>
                        <span>{doc.date}</span>
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
            </>
          )}

        </div>
      </div>
    </div>
  );
}
