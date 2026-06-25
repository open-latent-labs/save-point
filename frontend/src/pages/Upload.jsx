import React, { useState, useRef, useCallback, useEffect, useDeferredValue } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import UploadItem from "../components/UploadItem.jsx";
import { IconUpload, IconStar, IconPin, IconTrash, IconGlobe } from "../components/Icons.jsx";
import {
  ACCEPT, validateFile, extOf, guessCategory, formatSize,
  loadFavs, saveFavs, loadPins, savePins,
  loadPending, savePending, loadRejected, loadApproved,
  CATEGORY_OPTIONS,
} from "../data/upload.js";
import { document_list, documentBookmark, documentBookmarkDelete, documentPin, documentPinDelete, requestPublicDocument } from "../api/document.js";
import { document_delete } from "../api/docs.js";
import { adminPublishDocument } from "../api/admin.js";
import { useAuth } from "../context/AuthContext.jsx";

let _uid = 0;
const uid = () => `f${++_uid}_${Date.now()}`;

// 카테고리 색상 맵
const catColor = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.color]));
const catLabel = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.label]));

// 확장자별 뱃지 색
const extColors = {
  pdf: "#E08A8A",
  pptx: "#E0A35B",
};

function DocItem({ doc, isFav, onFav, isPin, onPin, onDelete, isPending, isRejected, onPublish, isAdmin, onAdminPublish }) {
  const navigate = useNavigate();
  return (
    <div
      className={"gd-docitem" + (isPin ? " pinned" : "")}
      onClick={() => navigate(`/docs/${doc.id}`)}
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
        {!isPending && !isRejected && !doc.isPublic && (
          isAdmin ? (
            <button
              className="gd-docitem-pub"
              onClick={() => onAdminPublish(doc.id)}
              aria-label="바로 공용 등록"
              title="바로 공용 등록"
            >
              <IconGlobe width="14" height="14" />
            </button>
          ) : (
            <button
              className="gd-docitem-pub"
              onClick={() => onPublish(doc.id)}
              aria-label="공용 등록 신청"
              title="공용 등록 신청"
            >
              <IconGlobe width="14" height="14" />
            </button>
          )
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
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // ── 업로드 진행 state ──
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const xhrRef = useRef({});
  const esRef = useRef({});
  const notifiedItemIds = useRef(new Set());

  // ── 내 문서 state ──
  const [myDocs, setMyDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiTotalPages, setApiTotalPages] = useState(1);
  const [apiTotalCount, setApiTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [favIds, setFavIds] = useState(() => loadFavs());
  const [pinIds, setPinIds] = useState(() => loadPins());
  const [pinError, setPinError] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [visFilter, setVisFilter] = useState("all");
  const [pendingIds, setPendingIds] = useState(() => loadPending());
  const [rejectedIds, setRejectedIds] = useState(() => loadRejected());
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const deferredKeyword = useDeferredValue(searchInput);

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

  // 내 문서 목록 fetch
  useEffect(() => {
    let cancelled = false;
    const fetchDocs = async () => {
      setLoading(true);
      try {
        const data = await document_list(page, {
          sort: sortBy,
          ...(catFilter !== "all" && { category: catFilter }),
          ...(visFilter === "public"   && { access_type: "PUBLIC" }),
          ...(visFilter === "private"  && { access_type: "PRIVATE" }),
          ...(visFilter === "fav"      && { is_bookmarked: true }),
          ...(visFilter === "pending"  && { status: "PENDING" }),
          ...(deferredKeyword.trim() && { keyword: deferredKeyword.trim() }),
        });
        if (cancelled) return;
        const docs = Array.isArray(data) ? data : (data?.documents ?? []);
        setMyDocs(docs.map((d) => ({
          id: d.id,
          name: d.filename ?? "",
          size: d.file_size ?? 0,
          ext: (d.extension ?? "").toLowerCase().replace(/^\./, "") || "file",
          category: d.category ?? "OTHER",
          date: d.created_at ? d.created_at.slice(0, 10) : "-",
          isPublic: d.access_type === "PUBLIC",
          status: d.status ?? "",
        })));
        setFavIds(docs.filter((d) => d.is_bookmarked).map((d) => d.id));
        setPinIds(docs.filter((d) => d.is_pinned).map((d) => d.id));
        if (data?.total_pages) setApiTotalPages(data.total_pages);
        if (data?.total_count !== undefined) setApiTotalCount(data.total_count);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDocs();
    return () => { cancelled = true; };
  }, [page, refreshKey, catFilter, sortBy, visFilter, deferredKeyword]);

  // 필터/정렬/검색 변경 시 페이지 초기화
  useEffect(() => { setPage(1); }, [catFilter, sortBy, visFilter, deferredKeyword]);

  // ── 즐겨찾기 토글 ──
  const toggleFav = async (id) => {
    const isCurrentlyFav = favIds.includes(id);
    const next = isCurrentlyFav ? favIds.filter((f) => f !== id) : [...favIds, id];
    setFavIds(next);
    saveFavs(next);
    try {
      if (isCurrentlyFav) {
        await documentBookmarkDelete(id);
      } else {
        await documentBookmark(id, true);
      }
    } catch (e) {
      console.error(e);
      setFavIds(favIds);
      saveFavs(favIds);
    }
  };

  // ── 고정핀 토글 ──
  const togglePin = async (id) => {
    const isCurrentlyPinned = pinIds.includes(id);
    if (!isCurrentlyPinned && pinIds.length >= 3) {
      setPinError("고정 문서는 최대 3개까지 설정할 수 있습니다.");
      setTimeout(() => setPinError(""), 3000);
      return;
    }
    const next = isCurrentlyPinned ? pinIds.filter((p) => p !== id) : [...pinIds, id];
    setPinIds(next);
    savePins(next);
    try {
      if (isCurrentlyPinned) {
        await documentPinDelete(id);
      } else {
        await documentPin(id, true);
      }
      window.dispatchEvent(new Event("gamedocs:pins"));
    } catch (e) {
      console.error(e);
      setPinIds(pinIds);
      savePins(pinIds);
      if (e.message?.includes("3개")) {
        setPinError("고정 문서는 최대 3개까지 설정할 수 있습니다.");
        setTimeout(() => setPinError(""), 3000);
      }
    }
  };

  // ── 문서 삭제 ──
  const deleteDoc = async (id) => {
    try {
      await document_delete(id);
      setMyDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  // ── 공용 문서 등록 신청 ──
  const requestPublic = async (id) => {
    try {
      await requestPublicDocument(id);
      setPage(1);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      console.error(e);
    }
  };

  // ── 관리자 직접 공용 등록 ──
  const adminPublish = async (id) => {
    try {
      await adminPublishDocument(id);
      setPage(1);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      console.error(e);
    }
  };

  // 모든 필터(fav, pending 포함)는 서버에서 처리하므로 클라이언트 필터링 불필요
  const filteredDocs = myDocs;

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
        try {
          const res = JSON.parse(xhr.responseText);
          const documentId = res.document_id;

          setItems((prev) =>
            prev.map((it) =>
              it.id === id ? { ...it, status: "processing", progress: 100, documentId } : it
            )
          );
          setPage(1);
          setRefreshKey((k) => k + 1);

          if (documentId) {
            const es = new EventSource(
              `/api/documents/${documentId}/status/stream`,
              { withCredentials: true }
            );
            esRef.current[id] = es;

            const finish = () => {
              es.close();
              delete esRef.current[id];
              setItems((prev) =>
                prev.map((it) => (it.id === id ? { ...it, status: "done", progress: 100 } : it))
              );
              setPage(1);
              setRefreshKey((k) => k + 1);
              // 3초 후 항목 자동 제거 (문서 목록에 반영됨)
              setTimeout(
                () => setItems((prev) => prev.filter((it) => it.id !== id)),
                1500
              );
            };

            // 처리 단계 실패/타임아웃 → 오류로 표시
            const fail = (message) => {
              es.close();
              delete esRef.current[id];
              setItems((prev) =>
                prev.map((it) =>
                  it.id === id ? { ...it, status: "error", error: message } : it
                )
              );
              setPage(1);
              setRefreshKey((k) => k + 1);
            };

            es.addEventListener("status", (e) => {
              const data = JSON.parse(e.data);
              setItems((prev) =>
                prev.map((it) =>
                  it.id === id
                    ? { ...it, processingJobs: data.jobs, documentStatus: data.document_status }
                    : it
                )
              );
              if (["DONE", "PENDING", "APPROVED"].includes(data.document_status)) finish();
            });

            es.addEventListener("failed", (e) => {
              let message = "문서 처리 중 오류가 발생했습니다.";
              try { message = JSON.parse(e.data).message || message; } catch { /* 기본 메시지 사용 */ }
              fail(message);
            });
            es.addEventListener("timeout", (e) => {
              let message = "처리 시간이 초과되었습니다.";
              try { message = JSON.parse(e.data).message || message; } catch { /* 기본 메시지 사용 */ }
              fail(message);
            });
            es.onerror = () => fail("문서 처리 상태를 받아오지 못했습니다.");
          }
        } catch {
          // JSON 파싱 실패 시 업로드 성공으로 처리
          setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, status: "done", progress: 100 } : it))
          );
          setPage(1);
          setRefreshKey((k) => k + 1);
          setTimeout(
            () => setItems((prev) => prev.filter((it) => it.id !== id)),
            1500
          );
        }
      } else {
        let message = `서버 오류 (${xhr.status})`;
        try {
          const detail = JSON.parse(xhr.responseText)?.detail;
          if (detail) message = typeof detail === "string" ? detail : JSON.stringify(detail);
        } catch { /* 본문 파싱 실패 시 기본 메시지 사용 */ }
        setItems((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, status: "error", error: message } : it
          )
        );
      }
      delete xhrRef.current[id];
    };

    xhr.onerror = () => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: "error", error: "네트워크 오류" } : it))
      );
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
          documentId: null,
          processingJobs: [],
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
    esRef.current[id]?.close();
    delete esRef.current[id];
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const setCategory = (id, category) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, category } : it)));

  // 언마운트 시 진행 중인 모든 XHR·EventSource 정리
  useEffect(() => () => {
    Object.values(xhrRef.current).forEach((xhr) => xhr.abort());
    Object.values(esRef.current).forEach((es) => es.close());
  }, []);

  const processingItems = items.filter((i) => i.status === "processing" || i.status === "done");
  const errorItems = items.filter((i) => i.status === "error");
  const uploading = items.some((i) => i.status === "uploading");
  const uploadingItems = items.filter((i) => i.status === "uploading");
  const overallProgress = uploadingItems.length > 0
    ? Math.round(uploadingItems.reduce((sum, i) => sum + i.progress, 0) / uploadingItems.length)
    : 0;

  // 처리 완료 알림 (Notification API)
  useEffect(() => {
    const newlyDone = items.filter(
      (i) => i.status === "done" && !notifiedItemIds.current.has(i.id)
    );
    if (!newlyDone.length) return;

    newlyDone.forEach((i) => notifiedItemIds.current.add(i.id));

    const catCounts = newlyDone.reduce((acc, i) => {
      const cat = i.category || "기타";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "기타";
    const docNames = newlyDone.map((i) => i.name).join(", ");

    const showNotification = async () => {
      const icon = await makeSquareIcon("/logo.png");
      new Notification("문서 처리 완료", {
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
  }, [items]);

  return (
    <div className="gd-page">
      <Topbar onMenu={onMenu} onProfile={onProfile} />

      {/* <UploadCompleteModal isOpen={showModal} onClose={() => setShowModal(false)} stats={modalStats} /> */}
      {pinError && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: "rgba(255,77,79,.15)", border: "1px solid rgba(255,77,79,.6)",
          color: "#ff8080", padding: "12px 20px", borderRadius: 10,
          zIndex: 9999, fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)",
          boxShadow: "0 8px 32px rgba(255,77,79,.15)", whiteSpace: "nowrap",
        }}>
          ⚠ {pinError}
        </div>
      )}
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
            <div className="gd-drop-sub">PDF · PPTX · 최대 20MB</div>

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
                  {overallProgress}% 업로드 중 · {uploadingItems.length}개 남음
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

          {/* ── AI 처리 중인 항목 ── */}
          {processingItems.length > 0 && (
            <div className="gd-up-list">
              <div className="gd-up-listhead">
                <span>
                  AI 처리 중 {processingItems.filter((i) => i.status === "processing").length}개
                </span>
              </div>
              {processingItems.map((it) => (
                <UploadItem key={it.id} item={it} onRemove={removeItem} onCategory={setCategory} />
              ))}
            </div>
          )}

          {/* ── 업로드 오류 항목 ── */}
          {errorItems.length > 0 && (
            <div className="gd-up-list">
              <div className="gd-up-listhead">
                <span>오류 {errorItems.length}개</span>
                <button
                  className="gd-up-clear"
                  onClick={() => setItems((prev) => prev.filter((i) => i.status !== "error"))}
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
              <span className="gd-mydocs-count">{apiTotalCount}개</span>
            </div>

            {/* 필터 바 — 검색 + 콤보 + 상태 탭 한 줄 */}
            <div className="gd-docs-filterbar">
              <div style={{ position: "relative", flex: "1 1 160px", minWidth: 0 }}>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--dim)", pointerEvents: "none" }}
                >
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="파일명 검색..."
                  style={{
                    width: "100%", boxSizing: "border-box",
                    paddingLeft: 30, paddingRight: searchInput ? 28 : 10,
                    height: 32, borderRadius: 6, fontSize: 13,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border)",
                    color: "var(--text)", outline: "none",
                    fontFamily: "var(--font-sans)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--mint)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    style={{
                      position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--dim)", padding: 2, lineHeight: 1,
                    }}
                    aria-label="검색어 지우기"
                  >
                    ✕
                  </button>
                )}
              </div>
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
              const totalPages = apiTotalPages;
              const pagedDocs = filteredDocs;

              const PAGE_GROUP_SIZE = 10;
              const pageGroup = Math.floor((page - 1) / PAGE_GROUP_SIZE);
              const groupStart = pageGroup * PAGE_GROUP_SIZE + 1;
              const groupEnd = Math.min(groupStart + PAGE_GROUP_SIZE - 1, totalPages);

              return filteredDocs.length === 0 ? (
                <div className="gd-mydocs-empty">
                  {deferredKeyword.trim()
                    ? `"${deferredKeyword.trim()}"에 해당하는 문서가 없습니다.`
                    : ({ fav: "즐겨찾기한 문서가 없습니다.", pending: "승인 대기 중인 문서가 없습니다.", public: "공용 문서가 없습니다.", private: "개인 문서가 없습니다." }[visFilter] ?? "조건에 맞는 문서가 없습니다.")}
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
                        isPending={doc.status === "PENDING"}
                        isRejected={doc.status === "REJECTED"}
                        onPublish={requestPublic}
                        isAdmin={isAdmin}
                        onAdminPublish={adminPublish}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 mt-4">
                      {totalPages > 10 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setPage(Math.max(1, groupStart - PAGE_GROUP_SIZE))}
                            disabled={groupStart === 1}
                            className="h-[30px] min-w-[30px] px-1.5 rounded-[7px] border text-[13px] transition-all duration-150 font-sans bg-transparent border-transparent text-[#aaa] hover:bg-white/[0.06] hover:text-white disabled:text-[#555] disabled:cursor-default cursor-pointer"
                          >
                            {"<<"}
                          </button>
                          {Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPage(p)}
                              className={`h-[30px] min-w-[30px] px-1.5 rounded-[7px] border text-[13px] cursor-pointer transition-all duration-150 font-sans
                                ${p === page
                                  ? "bg-[rgba(34,197,94,0.15)] border-[rgba(34,197,94,0.5)] text-[#22c55e] font-semibold"
                                  : "bg-transparent border-transparent text-[#aaa] hover:bg-white/[0.06] hover:text-white"
                                }`}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setPage(Math.min(groupStart + PAGE_GROUP_SIZE, totalPages))}
                            disabled={groupEnd === totalPages}
                            className="h-[30px] min-w-[30px] px-1.5 rounded-[7px] border text-[13px] transition-all duration-150 font-sans bg-transparent border-transparent text-[#aaa] hover:bg-white/[0.06] hover:text-white disabled:text-[#555] disabled:cursor-default cursor-pointer"
                          >
                            {">>"}
                          </button>
                        </>
                      ) : (
                        Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            className={`h-[30px] min-w-[30px] px-1.5 rounded-[7px] border text-[13px] cursor-pointer transition-all duration-150 font-sans
                              ${p === page
                                ? "bg-[rgba(34,197,94,0.15)] border-[rgba(34,197,94,0.5)] text-[#22c55e] font-semibold"
                                : "bg-transparent border-transparent text-[#aaa] hover:bg-white/[0.06] hover:text-white"
                              }`}
                          >
                            {p}
                          </button>
                        ))
                      )}
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