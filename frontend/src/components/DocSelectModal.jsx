import React, { useState, useEffect, useMemo } from "react";
import { document_list, publicDocumentList } from "../api/document";

export default function DocSelectModal({ onConfirm, onClose, initialSelected = [] }) {
  const [myDocs, setMyDocs] = useState([]);
  const [publicDocs, setPublicDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "mine" | "public"
  const [selected, setSelected] = useState(new Set(initialSelected.map((d) => d.id)));
  const [selectedMeta, setSelectedMeta] = useState(
    Object.fromEntries(initialSelected.map((d) => [d.id, d.filename]))
  );

  useEffect(() => {
    Promise.all([
      document_list(1, { size: 100 }),
      publicDocumentList(),
    ]).then(([myRes, pubRes]) => {
      setMyDocs(myRes?.documents ?? []);
      setPublicDocs(pubRes ?? []);
      setLoading(false);
    });
  }, []);

  const allDocs = useMemo(() => {
    const mine = myDocs.map((d) => ({ ...d, _type: "mine" }));
    const pub = publicDocs
      .filter((d) => !myDocs.find((m) => m.id === d.id))
      .map((d) => ({ ...d, _type: "public" }));
    return [...mine, ...pub];
  }, [myDocs, publicDocs]);

  const filtered = useMemo(() => {
    return allDocs.filter((d) => {
      const matchFilter =
        filter === "all" || (filter === "mine" && d._type === "mine") || (filter === "public" && d._type === "public");
      const matchSearch = !search || d.filename.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [allDocs, filter, search]);

  const toggle = (doc) => {
    const id = doc.id;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setSelectedMeta((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: doc.filename };
    });
  };

  const handleConfirm = () => {
    const result = [...selected].map((id) => ({ id, filename: selectedMeta[id] ?? id }));
    onConfirm(result);
  };

  return (
    <div className="gd-doc-modal-overlay" onClick={onClose}>
      <div className="gd-doc-modal" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="gd-doc-modal-header">
          <span className="gd-doc-modal-title">RAG 문서 선택</span>
          <button className="gd-doc-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* 검색 바 */}
        <div className="gd-doc-modal-search-wrap">
          <input
            className="gd-doc-modal-search"
            placeholder="파일명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* 필터 탭 */}
        <div className="gd-doc-modal-tabs">
          {[["all", "전체"], ["mine", "내 문서"], ["public", "공용 문서"]].map(([key, label]) => (
            <button
              key={key}
              className={`gd-doc-modal-tab${filter === key ? " active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
          {selected.size > 0 && (
            <span className="gd-doc-modal-count">{selected.size}개 선택됨</span>
          )}
        </div>

        {/* 문서 목록 */}
        <div className="gd-doc-modal-list">
          {loading ? (
            <p className="gd-doc-modal-empty">불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p className="gd-doc-modal-empty">문서가 없습니다.</p>
          ) : (
            filtered.map((doc) => {
              const id = doc.id;
              const checked = selected.has(id);
              return (
                <label key={id} className={`gd-doc-modal-item${checked ? " checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(doc)}
                    className="gd-doc-modal-checkbox"
                  />
                  <span className="gd-doc-modal-filename">{doc.filename}</span>
                  <span className="gd-doc-modal-badge">{doc._type === "mine" ? "내 문서" : "공용"}</span>
                </label>
              );
            })
          )}
        </div>

        {/* 푸터 */}
        <div className="gd-doc-modal-footer">
          <button className="gd-doc-modal-cancel" onClick={onClose}>취소</button>
          <button className="gd-doc-modal-confirm" onClick={handleConfirm}>
            {selected.size > 0 ? `${selected.size}개 문서로 질문` : "선택 없이 질문 (전체 검색)"}
          </button>
        </div>
      </div>
    </div>
  );
}
