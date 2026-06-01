import React from "react";
import { IconFile, IconTrash, IconCheck } from "./Icons.jsx";
import { formatSize, CATEGORY_OPTIONS } from "../data/upload.js";

export default function UploadItem({ item, onRemove, onCategory }) {
  const { name, size, status, progress, error, category, ext } = item;

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
          {status === "uploading" && <span className="dim">· 업로드 중 {progress}%</span>}
          {status === "done" && <span className="ok">· 완료</span>}
          {status === "error" && <span className="err">· {error}</span>}
        </div>

        {status === "uploading" && (
          <div className="gd-up-bar"><i style={{ width: progress + "%" }} /></div>
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
        {status === "done" && <span className="gd-up-check"><IconCheck width="15" height="15" /></span>}
        <button className="gd-up-del" onClick={() => onRemove(item.id)} aria-label="파일 제거">
          <IconTrash width="16" height="16" />
        </button>
      </div>
    </div>
  );
}
