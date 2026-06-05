import React, { useState, useRef, useCallback, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import UploadItem from "../components/UploadItem.jsx";
// import UploadCompleteModal from "../components/UploadCompleteModal.jsx";
import { IconUpload, IconStar, IconPin, IconTrash, IconGlobe } from "../components/Icons.jsx";
import {
  ACCEPT, validateFile, extOf, guessCategory, formatSize,
  loadFavs, saveFavs, loadPins, savePins,
  loadPending, savePending, loadRejected, loadApproved,
  MOCK_DOCS, CATEGORY_OPTIONS,
} from "../data/upload.js";

let _uid = 0;
const uid = () => `f${++_uid}_${Date.now()}`;

const PAGE_SIZE = 4;

// 카테고리 색상 맵
const catColor = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.color]));
const catLabel = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.label]));

// 확장자별 뱃지 색
const extColors = {
  pdf: "#E08A8A",
  md: "#36E0A1",
  txt: "#8A93FF",
  docx: "#5BC8FF",
  doc: "#5BC8FF",
};

function DocItem({ doc, isFav, onFav, isPin, onPin, onDelete, isPending, isRejected, onPublish }) {
  const navigate = useNavigate();
  return (
    <div
      className={"gd-docitem" + (isPin ? " pinned" : "")}
      onClick={() => navigate(`/docs/${encodeURIComponent(doc.name)}`)}
      style={{ cursor: "pointer" }}
    >
      <div className="gd-docitem-ext" style={{ background: extColors[doc.ext] || "var(--dim)" }}>
        {doc.ext.toUpperCase()}
      </div>

      <div className="gd-docitem-body">
        <div className="gd-docitem-name" title={doc.name}>
          {isPin && <span className="gd-docitem-pin-badge" title="고정됨" />}
          {doc.name}
          <span className={"gd-vis-badge" + (doc.isPublic ? " public" : " private")}>
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
          {isPending && (
            <>
              <span className="gd-meta-sep">·</span>
              <span className="gd-public-badge">
                <IconGlobe width="10" height="10" />
                승인 대기중
              </span>
            </>
          )}
          {isRejected && (
            <>
              <span className="gd-meta-sep">·</span>
              <span className="gd-rejected-badge">승인 거절됨</span>
            </>
          )}
        </div>
      </div>

      <div className="gd-docitem-actions" onClick={(e) => e.stopPropagation()}>
        {!isPending && !isRejected && (
          <button
            className="gd-docitem-pub"
            onClick={() => onPublish(doc.id)}
            aria-label="공용 문서로 등록 신청"
            title="공용 문서로 등록 신청"
          >
            <IconGlobe width="14" height="14" />
          </button>
        )}
        <button
          className={"gd-docitem-pin" + (isPin ? " on" : "")}
          onClick={() => onPin(doc.id)}
          aria-label={isPin ? "고정 해제" : "고정하기"}
          title={isPin ? "고정 해제" : "고정하기"}
        >
          <IconPin filled={isPin} width="14" height="14" />
        </button>
        <button
          className={"gd-docitem-fav" + (isFav ? " on" : "")}
          onClick={() => onFav(doc.id)}
          aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          title={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          <IconStar filled={isFav} width="15" height="15" />
        </button>
        {onDelete && !isPending && !doc.isPublic && (
          <button
            className="gd-docitem-del"
            onClick={() => onDelete(doc.id)}
            aria-label="삭제"
            title="삭제"
          >
            <IconTrash width="14" height="14" />
          </button>
        )}
      </div>
    </div>
  );
}

// 로고를 정사각형 캔버스 중앙에 배치해 크롭 방지
function makeSquareIcon(src, size = 192) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export default function Upload() {
  const { onMenu, onProfile } = useOutletContext();

  // ── 업로드 진행 state ──
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  // const [showModal, setShowModal] = useState(false);
  // const [modalStats, setModalStats] = useState([
  //   { value: 1, label: "처리 문서", iconType: "document" },
  //   { value: "6,842", label: "요약 토큰", iconType: "lines" },
  //   { value: "게임 프로그래밍", label: "분류 카테고리", iconType: "tag" },
  // ]);
  const inputRef = useRef(null);
  const xhrRef = useRef({});
  const prevUploadingRef = useRef(false);

  // ── 내 문서 state ──
  const [myDocs, setMyDocs] = useState(MOCK_DOCS);
  const [favIds, setFavIds] = useState(() => loadFavs());
  const [pinIds, setPinIds] = useState(() => loadPins());
  const [catFilter, setCatFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [visFilter, setVisFilter] = useState("all");
  const [pendingIds, setPendingIds] = useState(() => loadPending());
  const [rejectedIds, setRejectedIds] = useState(() => loadRejected());
  const [page, setPage] = useState(1);

  // 승인 문서함에서 변경 시 동기화
  useEffect(() => {
    const syncPending = () => setPendingIds(loadPending());
    const syncRejected = () => setRejectedIds(loadRejected());
    const syncApproved = () => {
      const ids = loadApproved();
      setMyDocs((prev) => prev.map((d) => ids.includes(d.id) ? { ...d, isPublic: true } : d));
    };
    window.addEventListener("gamedocs:pending", syncPending);
    window.addEventListener("gamedocs:rejected", syncRejected);
    window.addEventListener("gamedocs:approved", syncApproved);
    return () => {
      window.removeEventListener("gamedocs:pending", syncPending);
      window.removeEventListener("gamedocs:rejected", syncRejected);
      window.removeEventListener("gamedocs:approved", syncApproved);
    };
  }, []);

  // 필터/정렬 변경 시 페이지 초기화
  useEffect(() => { setPage(1); }, [catFilter, sortBy, visFilter]);

  // ── 즐겨찾기 토글 ──
  const toggleFav = (id) => {
    const next = favIds.includes(id) ? favIds.filter((f) => f !== id) : [...favIds, id];
    setFavIds(next);
    saveFavs(next);
  };

  // ── 고정핀 토글 ──
  const togglePin = (id) => {
    const next = pinIds.includes(id) ? pinIds.filter((p) => p !== id) : [...pinIds, id];
    setPinIds(next);
    savePins(next);
  };

  // ── 문서 삭제 (더미) ──
  const deleteDoc = (id) => setMyDocs((prev) => prev.filter((d) => d.id !== id));

  // ── 공용 문서 등록 신청 ──
  const requestPublic = (id) => {
    const next = [...pendingIds, id];
    setPendingIds(next);
    savePending(next);
  };

  // ── 필터 + 정렬 ──
  const filteredDocs = myDocs
    .filter((d) => catFilter === "all" || d.category === catFilter)
    .filter((d) => {
      if (visFilter === "fav") return favIds.includes(d.id);
      if (visFilter === "pending") return pendingIds.includes(d.id);
      if (visFilter === "public") return d.isPublic;
      if (visFilter === "private") return !d.isPublic;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.date) - new Date(a.date);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return b.size - a.size;
      if (sortBy === "category") return a.category.localeCompare(b.category);
      return 0;
    });

  // ── 실제 업로드 ──
  const startUpload = useCallback((id, file) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current[id] = xhr;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, progress: pct } : it)));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setItems((prev) => {
          const finished = prev.find((it) => it.id === id);
          if (finished) {
            setMyDocs((docs) => {
              if (docs.some((d) => d.id === finished.id)) return docs;
              return [
                {
                  id: finished.id,
                  name: finished.name,
                  size: finished.size,
                  ext: finished.ext,
                  category: finished.category,
                  date: new Date().toISOString().slice(0, 10),
                  isPublic: false,
                },
                ...docs,
              ];
            });
          }
          return prev.map((it) => (it.id === id ? { ...it, status: "done", progress: 100 } : it));
        });
      } else {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "error", error: `서버 오류 (${xhr.status})` } : it)));
      }
      delete xhrRef.current[id];
    };

    xhr.onerror = () => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "error", error: "네트워크 오류" } : it)));
      delete xhrRef.current[id];
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^.]+$/, ""));

    xhr.open("POST", "/api/documents/upload");
    xhr.send(formData);
  }, []);

  const addFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      const created = files.map((f) => {
        const error = validateFile(f);
        return {
          id: uid(),
          name: f.name,
          size: f.size,
          ext: extOf(f.name) || "file",
          category: guessCategory(f.name),
          status: error ? "error" : "uploading",
          progress: 0,
          error,
          file: f,
        };
      });
      setItems((prev) => [...prev, ...created]);
      created.forEach((it) => {
        if (it.status === "uploading") startUpload(it.id, it.file);
      });
    },
    [startUpload]
  );

  const onDrop = (e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); };
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); if (e.currentTarget.contains(e.relatedTarget)) return; setDragging(false); };

  const removeItem = (id) => {
    xhrRef.current[id]?.abort();
    delete xhrRef.current[id];
    setItems((prev) => prev.filter((it) => it.id !== id));
  };
  const setCategory = (id, category) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, category } : it)));

  useEffect(() => () => { Object.values(xhrRef.current).forEach((xhr) => xhr.abort()); }, []);

  const doneCount = items.filter((i) => i.status === "done").length;
  const errorItems = items.filter((i) => i.status === "error");
  const uploading = items.some((i) => i.status === "uploading");
  const overallProgress = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + i.progress, 0) / items.length)
    : 0;
  // 업로드 완료 → 요약 완료 알림 (Notification API)
  useEffect(() => {
    if (prevUploadingRef.current && !uploading && doneCount > 0) {
      const doneItems = items.filter((i) => i.status === "done");
      const catCounts = doneItems.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {});
      const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "기타";
      const docNames = doneItems.map((i) => i.name).join(", ");

      // const [모달 비활성]
      // setModalStats([...]);
      // setTimeout(() => setShowModal(true), 400);

      const showNotification = async () => {
        const icon = await makeSquareIcon("/logo.png");
        new Notification("문서 요약 완료", {
          body: `${docNames} · ${catLabel[topCat] || topCat}`,
          icon,
        });
      };

      if (Notification.permission === "granted") {
        setTimeout(showNotification, 400);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((p) => {
          if (p === "granted") setTimeout(showNotification, 400);
        });
      }
    }
    prevUploadingRef.current = uploading;
  }, [uploading, doneCount, items]);

  return (
    <div className="gd-page">
      <Topbar onMenu={onMenu} onProfile={onProfile} />

      {/* <UploadCompleteModal isOpen={showModal} onClose={() => setShowModal(false)} stats={modalStats} /> */}
      <div className="gd-page-scroll">
        <div className="gd-up-wrap" style={{ paddingTop: "0px" }}>

          {/* ── 새 문서 업로드 ── */}
          <div className="gd-up-head">
            <h1 className="gd-up-title">문서 업로드</h1>
            <p className="gd-up-desc">
              엔진 레퍼런스·포스트모템·성능 분석 문서를 올리면 AI가 요약·분류해 검색에 활용합니다.
            </p>
          </div>

          <div
            className={"gd-dropzone" + (dragging ? " dragging" : "")}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragEnter={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          >
            <span className="gd-drop-ic"><IconUpload width="26" height="26" /></span>
            <div className="gd-drop-main">
              파일을 여기로 끌어다 놓거나 <span className="mint">클릭해서 선택</span>하세요
            </div>
            <div className="gd-drop-sub">PDF · MD · TXT · DOCX · 최대 20MB</div>

            {uploading && (
              <div style={{ width: "100%", marginTop: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                  <div style={{
                    width: `${overallProgress}%`, height: "100%", borderRadius: 3,
                    background: "#22c55e",
                    transition: "width 0.18s ease",
                  }} />
                </div>
                <span style={{ fontSize: 12, color: "var(--dim)" }}>
                  {overallProgress}% 업로드 중 · {doneCount} / {items.length} 완료
                </span>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              style={{ display: "none" }}
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          {errorItems.length > 0 && (
            <div className="gd-up-list">
              <div className="gd-up-listhead">
                <span>오류 {errorItems.length}개</span>
                <button
                  className="gd-up-clear"
                  onClick={() => { items.forEach((i) => clearTimeout(timersRef.current[i.id])); timersRef.current = {}; setItems([]); }}
                >
                  전체 비우기
                </button>
              </div>
              {errorItems.map((it) => (
                <UploadItem key={it.id} item={it} onRemove={removeItem} onCategory={setCategory} />
              ))}
            </div>
          )}


          {/* ── 내 문서 목록 ── */}
          <div className="gd-mydocs">
            <div className="gd-mydocs-head">
              <span className="gd-mydocs-title">내 문서</span>
              <span className="gd-mydocs-count">{filteredDocs.length}개</span>
            </div>

            {/* 필터 바 — 콤보 + 상태 탭 한 줄 */}
            <div className="gd-docs-filterbar">
              <select className="gd-combo" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="all">전체 카테고리</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <select className="gd-combo" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="date">최신순</option>
                <option value="name">이름순</option>
                <option value="size">크기순</option>
                <option value="category">카테고리순</option>
              </select>
            </div>

            <div className="gd-vis-filterbar">
              {[
                { key: "all", label: "전체" },
                { key: "fav", label: "즐겨찾기" },
                { key: "pending", label: "승인 대기중" },
                { key: "public", label: "PUBLIC" },
                { key: "private", label: "PRIVATE" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`gd-vis-tab ${key}${visFilter === key ? " on" : ""}`}
                  onClick={() => setVisFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 문서 리스트 + 페이지네이션 */}
            {(() => {
              const totalPages = Math.ceil(filteredDocs.length / PAGE_SIZE);
              const pagedDocs = filteredDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

              const btn = (label, onClick, active = false, disabled = false) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  disabled={disabled}
                  style={{
                    minWidth: 32, height: 32, padding: "0 8px", borderRadius: 8,
                    fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center",
                    border: "none", cursor: disabled ? "default" : "pointer", transition: "all .15s",
                    background: active ? "#22c55e" : "transparent",
                    color: active ? "#06210f" : disabled ? "var(--faint)" : "var(--dim)",
                    fontWeight: active ? 700 : 400,
                  }}
                  onMouseEnter={(e) => { if (!active && !disabled) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text)"; } }}
                  onMouseLeave={(e) => { if (!active && !disabled) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = disabled ? "var(--faint)" : "var(--dim)"; } }}
                >
                  {label}
                </button>
              );

              return filteredDocs.length === 0 ? (
                <div className="gd-mydocs-empty">
                  {{ fav: "즐겨찾기한 문서가 없습니다.", pending: "승인 대기 중인 문서가 없습니다.", public: "공용 문서가 없습니다.", private: "개인 문서가 없습니다." }[visFilter] ?? "조건에 맞는 문서가 없습니다."}
                </div>
              ) : (
                <>
                  <div className="gd-doclist">
                    {pagedDocs.map((doc) => (
                      <DocItem
                        key={doc.id}
                        doc={doc}
                        isFav={favIds.includes(doc.id)}
                        onFav={toggleFav}
                        isPin={pinIds.includes(doc.id)}
                        onPin={togglePin}
                        onDelete={deleteDoc}
                        isPending={pendingIds.includes(doc.id)}
                        isRejected={rejectedIds.includes(doc.id)}
                        onPublish={requestPublic}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 16 }}>
                      {btn("‹", () => setPage((p) => Math.max(1, p - 1)), false, page === 1)}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) =>
                        btn(p, () => setPage(p), p === page)
                      )}
                      {btn("›", () => setPage((p) => Math.min(totalPages, p + 1)), false, page === totalPages)}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

        </div>
      </div>
    </div>
  );
}