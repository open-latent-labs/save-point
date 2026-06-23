import React, { useState, useEffect, useMemo } from "react";
import { document_list, publicDocumentList } from "../api/document";
import { CATEGORIES } from "../data/mock.js";

const catColor = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.color]));
const catLabel = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

export default function DocSelectModal({ onConfirm, onClose, initialSelected = [] }) {
  const [myDocs, setMyDocs] = useState([]);
  const [publicDocs, setPublicDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ownership, setOwnership] = useState("all"); // "all" | "mine" | "public"
  const [categories, setCategories] = useState(new Set()); // 빈 Set = 전체
  const [sort, setSort] = useState("latest");         // "latest" | "name"
  const [selected, setSelected] = useState(new Set(initialSelected.map((d) => d.id)));
  const [selectedMeta, setSelectedMeta] = useState(
    Object.fromEntries(initialSelected.map((d) => [d.id, d.filename]))
  );
  const [clearToast, setClearToast] = useState(false);

  useEffect(() => {
    Promise.all([
      document_list(1, { size: 200 }),
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

  // 현재 목록에 실제로 존재하는 카테고리만 추출 (소유 필터 반영)
  const availableCategories = useMemo(() => {
    const base = ownership === "mine"
      ? allDocs.filter((d) => d._type === "mine")
      : ownership === "public"
      ? allDocs.filter((d) => d._type === "public")
      : ownership === "bookmarked"
      ? allDocs.filter((d) => d.is_bookmarked)
      : allDocs;
    const keys = new Set(base.map((d) => d.category).filter(Boolean));
    return CATEGORIES.filter((c) => keys.has(c.key));
  }, [allDocs, ownership]);

  const filtered = useMemo(() => {
    let docs = allDocs.filter((d) => {
      const matchOwnership =
        ownership === "all" ||
        (ownership === "mine" && d._type === "mine") ||
        (ownership === "public" && d._type === "public") ||
        (ownership === "bookmarked" && d.is_bookmarked);
      const matchCategory = categories.size === 0 || categories.has(d.category);
      const matchSearch = !search || (d.filename ?? d.name ?? "").toLowerCase().includes(search.toLowerCase());
      return matchOwnership && matchCategory && matchSearch;
    });

    if (sort === "name") {
      docs = [...docs].sort((a, b) =>
        (a.filename ?? a.name ?? "").localeCompare(b.filename ?? b.name ?? "", "ko")
      );
    } else {
      // latest: 이미 서버에서 최신순으로 왔지만, 혼합 목록이므로 created_at으로 재정렬
      docs = [...docs].sort((a, b) => {
        const ta = a.created_at ?? a.date ?? "";
        const tb = b.created_at ?? b.date ?? "";
        return tb.localeCompare(ta);
      });
    }

    // 선택된 항목 맨 위 고정
    docs.sort((a, b) => {
      const aChecked = selected.has(a.id) ? 0 : 1;
      const bChecked = selected.has(b.id) ? 0 : 1;
      return aChecked - bChecked;
    });

    return docs;
  }, [allDocs, ownership, categories, search, sort, selected]);

  const toggle = (doc) => {
    const id = doc.id;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSelectedMeta((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: doc.filename ?? doc.name ?? id };
    });
  };

  const handleConfirm = () => {
    const result = [...selected].map((id) => ({ id, filename: selectedMeta[id] ?? id }));
    onConfirm(result);
  };

  const toggleCategory = (key) => {
    setCategories((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // 소유 필터 변경 시 카테고리 선택 초기화
  const handleOwnership = (val) => {
    setOwnership(val);
    setCategories(new Set());
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

        {/* 소유 필터 탭 + 정렬 */}
        <div className="gd-doc-modal-toolbar">
          <div className="gd-doc-modal-tabs">
            {[["all", "전체"], ["mine", "내 문서"], ["public", "공용"], ["bookmarked", "★ 즐겨찾기"]].map(([key, label]) => (
              <button
                key={key}
                className={`gd-doc-modal-tab${ownership === key ? " active" : ""}`}
                onClick={() => handleOwnership(key)}
              >
                {label}
              </button>
            ))}
            {selected.size > 0 && (
              <span className="gd-doc-modal-count">{selected.size}개 선택됨</span>
            )}
          </div>

          <div className="gd-doc-modal-sort">
            {[["latest", "최신순"], ["name", "제목순"]].map(([key, label]) => (
              <button
                key={key}
                className={`gd-doc-modal-sort-btn${sort === key ? " active" : ""}`}
                onClick={() => setSort(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리 필터 칩 */}
        {availableCategories.length > 0 && (
          <div className="gd-doc-modal-cats">
            <button
              className={`gd-doc-cat-chip${categories.size === 0 ? " active" : ""}`}
              onClick={() => setCategories(new Set())}
            >
              전체
            </button>
            {availableCategories.map((c) => (
              <button
                key={c.key}
                className={`gd-doc-cat-chip${categories.has(c.key) ? " active" : ""}`}
                style={{ "--cat-color": c.color }}
                onClick={() => toggleCategory(c.key)}
              >
                <span className="gd-doc-cat-dot" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* 전체 선택 취소 토스트 */}
        {clearToast && (
          <div className="gd-doc-clear-toast">전체 취소 완료!</div>
        )}

        {/* 문서 목록 */}
        <div className="gd-doc-modal-list">
          {loading ? (
            <p className="gd-doc-modal-empty">불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p className="gd-doc-modal-empty">문서가 없습니다.</p>
          ) : (
            filtered.map((doc) => {
              const id = doc.id;
              const name = doc.filename ?? doc.name ?? id;
              const checked = selected.has(id);
              return (
                <label key={id} className={`gd-doc-modal-item${checked ? " checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(doc)}
                    className="gd-doc-modal-checkbox"
                  />
                  <span className="gd-doc-modal-item-info">
                    <span className="gd-doc-modal-filename">{name}</span>
                    {doc.category && (
                      <span className="gd-doc-modal-cat-tag" style={{ color: catColor[doc.category] ?? "var(--dim)" }}>
                        {catLabel[doc.category] ?? doc.category}
                      </span>
                    )}
                  </span>
                  <span className="gd-doc-modal-badge">{doc._type === "mine" ? "내 문서" : "공용"}</span>
                </label>
              );
            })
          )}
        </div>

        {/* 푸터 */}
        <div className="gd-doc-modal-footer">
          <button
            className="gd-doc-modal-cancel"
            onClick={() => {
              setSelected(new Set());
              setSelectedMeta({});
              setClearToast(true);
              setTimeout(() => setClearToast(false), 1600);
            }}
            disabled={selected.size === 0}
          >
            전체 선택 취소
          </button>
          <button className="gd-doc-modal-confirm" onClick={handleConfirm}>
            {selected.size > 0 ? `${selected.size}개 문서 선택` : "선택 없이 질문 (전체 검색)"}
          </button>
        </div>
      </div>
    </div>
  );
}
