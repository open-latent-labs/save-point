import React from "react";
import { IconFile, IconTrash, IconCheck } from "./Icons.jsx";
import { formatSize, CATEGORY_OPTIONS } from "../data/upload.js";

const STAGE_LABEL = { OCR: "OCR", CLASSIFY_SUMMARIZE: "분류", EMBED: "임베딩" };
const STAGE_COLOR = {
  DONE: "#22c55e",
  RUNNING: "#f59e0b",
  FAILED: "#ef4444",
  QUEUED: "#555",
  RETRYING: "#f59e0b",
};

export default function UploadItem({ item, onRemove, onCategory }) {
  const { name, size, status, progress, error, category, ext, processingJobs = [] } = item;

  return (
    <div className={"gd-up-item status-" + status}>
      <div className="gd-up-icon">
        <IconFile width="18" height="18" />
        <span className="ext">{ext}</span>
      </div>

      <div className="gd-up-meta">
        <div className="gd-up-name" title={name}>{name}</div>
        <div className="gd-up-sub">
          <span>{formatSize(size)}</span>
          {status === "uploading"   && <span className="dim">· 업로드 중 {progress}%</span>}
          {status === "processing"  && <span className="dim">· 문서 처리 중</span>}
          {status === "done"        && <span className="ok">· 완료</span>}
          {status === "error"       && <span className="err">· {error}</span>}
        </div>

        {status === "uploading" && (
          <div className="gd-up-bar"><i style={{ width: progress + "%" }} /></div>
        )}

        {status === "processing" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
            {processingJobs.length === 0 ? (
              <span style={{ fontSize: 11, color: "#555" }}>대기 중...</span>
            ) : (
              processingJobs.map((job, idx) => {
                const color = STAGE_COLOR[job.status] || "#555";
                return (
                  <React.Fragment key={job.type}>
                    {idx > 0 && (
                      <span style={{ fontSize: 10, color: "#444" }}>›</span>
                    )}
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: color, display: "inline-block", flexShrink: 0,
                      }} />
                      <span style={{ color }}>{STAGE_LABEL[job.type] || job.type}</span>
                    </span>
                  </React.Fragment>
                );
              })
            )}
          </div>
        )}

        {status === "done" && (
          <div className="gd-up-catrow">
            <span className="lbl">분류</span>
            <select
              className="gd-up-select"
              value={category}
              onChange={(e) => onCategory(item.id, e.target.value)}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="gd-up-right">
        {(status === "done" || status === "processing") && (
          <span className="gd-up-check" style={{ opacity: status === "processing" ? 0.3 : 1 }}>
            <IconCheck width="15" height="15" />
          </span>
        )}
        <button className="gd-up-del" onClick={() => onRemove(item.id)} aria-label="파일 제거">
          <IconTrash width="16" height="16" />
        </button>
      </div>
    </div>
  );
}
