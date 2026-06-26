import React, { useState, useRef, useCallback, useEffect, useDeferredValue } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOutletContext, useNavigate, useBlocker } from "react-router-dom";
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

// 동시에 진행할 업로드(네트워크 전송) 최대 개수
const MAX_CONCURRENT_UPLOADS = 2;

// 카테고리 색상 맵
const catColor = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.color]));
const catLabel = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.key, c.label]));

// 확장자별 뱃지 색
const extColors = {
  pdf: "#E08A8A",
  pptx: "#E0A35B",
};

function DocItem({ doc, isFav, onFav, isPin, onPin, onDelete, isPending, isRejected, isFailed, onPublish, isAdmin, onAdminPublish, onItemClick }) {
  return (
    <div
      className={"gd-docitem" + (isPin ? " pinned" : "")}
      onClick={() => { if (!isFailed) onItemClick?.(); }}
      style={{ cursor: isFailed ? "default" : "pointer" }}
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
          {isFailed && (
            <>
              <span className="gd-meta-sep">·</span>
              <span className="gd-rejected-badge">처리 실패</span>
            </>
          )}
        </div>
      </div>

      <div className="gd-docitem-actions" onClick={(e) => e.stopPropagation()}>
        {!isPending && !isRejected && !isFailed && !doc.isPublic && (
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
        {!isFailed && (
          <>
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
          </>
        )}
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
  const navigate = useNavigate();

  // ── 업로드 진행 state ──
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const xhrRef = useRef({});
  const esRef = useRef({});
  const notifiedItemIds = useRef(new Set());
  // 동시성 제어용: 대기열, 현재 슬롯을 점유 중인 항목 id 집합, 최신 startUpload 참조
  // 슬롯은 '전송 완료'가 아니라 '처리(SSE) 완료/실패' 시점에 반환된다.
  const queueRef = useRef([]);
  const activeIdsRef = useRef(new Set());
  const startUploadRef = useRef(null);
  const prevFiltersRef = useRef({ catFilter: "all", sortBy: "date", visFilter: "all", deferredKeyword: "" });

  // ── 내 문서 state ──
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
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
  const [page, setPage] = useState(() => {
    const saved = parseInt(sessionStorage.getItem("upload_page") || "1", 10);
    return saved > 0 ? saved : 1;
  });
  const [searchInput, setSearchInput] = useState("");
  const deferredKeyword = useDeferredValue(searchInput);

  // 승인 문서함에서 변경 시 동기화
  useEffect(() => {
    const syncPending = () => setPendingIds(loadPending());
    const syncRejected = () => setRejectedIds(loadRejected());
    const syncApproved = () => {
      const ids = loadApproved();
      setMyDocs((prev) => prev.map((d) => ids.includes(d.id) ? { ...d, isPublic: true, status: "APPROVED" } : d));
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
    const prev = prevFiltersRef.current;
    const filterChanged =
      catFilter !== prev.catFilter ||
      sortBy !== prev.sortBy ||
      visFilter !== prev.visFilter ||
      deferredKeyword !== prev.deferredKeyword;

    prevFiltersRef.current = { catFilter, sortBy, visFilter, deferredKeyword };

    // 필터 변경 시 page=1로 즉시 fetch (state 비동기 업데이트와 무관)
    const effectivePage = filterChanged ? 1 : page;
    if (filterChanged && page !== 1) setPage(1);

    let cancelled = false;
    const fetchDocs = async () => {
      setLoading(true);
      try {
        const data = await document_list(effectivePage, {
          sort: sortBy,
          ...(catFilter !== "all" && { category: catFilter }),
          ...(visFilter === "public" && { access_type: "PUBLIC" }),
          ...(visFilter === "private" && { access_type: "PRIVATE" }),
          ...(visFilter === "fav" && { is_bookmarked: true }),
          ...(visFilter === "pending" && { status: "PENDING" }),
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

  // sessionStorage 복원 후 즉시 비움 (뒤로가기가 아닌 신규 방문 시 stale 방지)
  useEffect(() => { sessionStorage.removeItem("upload_page"); }, []);


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
  const requestDelete = (id) => {
    const doc = myDocs.find((d) => d.id === id);
    setDeleteTarget({ id, name: doc?.name ?? "" });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    try {
      await document_delete(id);
      setMyDocs((prev) => prev.filter((d) => d.id !== id));
      window.dispatchEvent(new Event("gamedocs:pins"));
      window.dispatchEvent(new Event("gamedocs:public-docs"));
    } catch (e) {
      console.error(e);
    }
  };

  // ── 공용 문서 등록 신청 ──
  const requestPublic = async (id) => {
    try {
      await requestPublicDocument(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      console.error(e);
    }
  };

  // ── 관리자 직접 공용 등록 ──
  const adminPublish = async (id) => {
    try {
      await adminPublishDocument(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      console.error(e);
    }
  };

  // 모든 필터(fav, pending 포함)는 서버에서 처리하므로 클라이언트 필터링 불필요
  const filteredDocs = myDocs;

  // 대기열에서 빈 슬롯만큼 업로드를 꺼내 시작 (전송+처리 동시 실행 수 제한)
  const drainQueue = useCallback(() => {
    while (activeIdsRef.current.size < MAX_CONCURRENT_UPLOADS && queueRef.current.length > 0) {
      const { id, file } = queueRef.current.shift();
      activeIdsRef.current.add(id);
      startUploadRef.current?.(id, file);
    }
  }, []);

  // 한 항목이 처리 완료/실패/제거되어 슬롯을 비울 때 호출 (멱등 — 중복 호출 안전)
  const releaseSlot = useCallback((id) => {
    if (activeIdsRef.current.delete(id)) drainQueue();
  }, [drainQueue]);

  // ── 실제 업로드 ──
  const startUpload = useCallback((id, file) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current[id] = xhr;

    // 대기열에서 꺼내 실제 전송을 시작하는 순간 'uploading'으로 전환
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "uploading" } : it)));

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
              releaseSlot(id); // 처리 완료 → 다음 업로드 시작
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
              releaseSlot(id); // 처리 실패 → 다음 업로드 시작
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
          } else {
            // document_id가 없어 처리 스트림을 못 여는 경우 → 슬롯 반환
            releaseSlot(id);
          }
        } catch {
          // JSON 파싱 실패 시 업로드 성공으로 처리
          releaseSlot(id);
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
        // 서버 오류 → 처리 단계로 못 넘어가므로 즉시 슬롯 반환
        releaseSlot(id);
      }
      delete xhrRef.current[id];
    };

    xhr.onerror = () => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: "error", error: "네트워크 오류" } : it))
      );
      delete xhrRef.current[id];
      // 네트워크 오류 → 슬롯 반환
      releaseSlot(id);
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^.]+$/, ""));

    xhr.open("POST", "/api/documents/upload");
    xhr.send(formData);
  }, [releaseSlot]);

  // drainQueue가 항상 최신 startUpload를 호출하도록 참조 유지
  startUploadRef.current = startUpload;

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
          status: error ? "error" : "queued",
          progress: 0,
          error,
          file: f,
          documentId: null,
          processingJobs: [],
        };
      });
      setItems((prev) => [...prev, ...created]);

      created.forEach((it) => {
        if (it.status === "queued") queueRef.current.push({ id: it.id, file: it.file });
      });
      drainQueue();
    },
    [drainQueue]
  );

  const onDrop = (e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); };
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); if (e.currentTarget.contains(e.relatedTarget)) return; setDragging(false); };

  const removeItem = (id) => {
    queueRef.current = queueRef.current.filter((q) => q.id !== id);

    xhrRef.current[id]?.abort();
    delete xhrRef.current[id];
    esRef.current[id]?.close();
    delete esRef.current[id];

    releaseSlot(id);
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
  const uploadingItems = items.filter((i) => i.status === "uploading");
  const queuedItems = items.filter((i) => i.status === "queued");
  const uploading = uploadingItems.length > 0;
  const overallProgress = uploadingItems.length > 0
    ? Math.round(uploadingItems.reduce((sum, i) => sum + i.progress, 0) / uploadingItems.length)
    : 0;

  // ── 업로드/처리 진행 중 페이지 이동 차단 ──
  // 대기·전송·처리 중인 항목이 하나라도 있으면 이동을 막는다.
  const isBusy = items.some((i) =>
    i.status === "queued" || i.status === "uploading" || i.status === "processing"
  );

  // SPA 내부 라우팅 이동 차단 (react-router data router 전용 useBlocker)
  const blocker = useBlocker(isBusy);

  // 더 이상 진행 중인 항목이 없으면 막혀 있던 이동을 자동 해제
  useEffect(() => {
    if (!isBusy && blocker.state === "blocked") blocker.reset();
  }, [isBusy, blocker]);

  // 새로고침·탭 닫기·외부 이동 차단 (브라우저 기본 확인창)
  useEffect(() => {
    if (!isBusy) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isBusy]);

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
    <>
      <div className="gd-page">
        <Topbar onMenu={onMenu} onProfile={onProfile} />

        {/* <UploadCompleteModal isOpen={showModal} onClose={() => setShowModal(false)} stats={modalStats} /> */}

        {/* ── 업로드 진행 중 이동 차단 팝업 ── */}
        {blocker.state === "blocked" && (
          <>
            <div
              onClick={() => blocker.reset()}
              style={{
                position: "fixed", inset: 0, zIndex: 10000,
                background: "rgba(0,0,0,.55)",
              }}
            />
            <div
              role="alertdialog"
              aria-modal="true"
              style={{
                position: "fixed", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)", zIndex: 10001,
                width: "min(360px, calc(100vw - 32px))",
                background: "linear-gradient(180deg, #0e1113 0%, #07090a 100%)",
                border: "1px solid rgba(255,255,255,.16)",
                borderRadius: 18, overflow: "hidden",
                boxShadow: "0 32px 80px -16px rgba(0,0,0,.95)",
              }}
            >
              <div style={{
                height: 3,
                background: "linear-gradient(90deg, #f0a35b 0%, #f0c45b 55%, #f08a8a 100%)",
              }} />
              <div style={{ padding: "20px 22px 8px" }}>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".07em",
                  textTransform: "uppercase", color: "#f0a35b", marginBottom: 10,
                }}>
                  페이지 이동 불가
                </div>
                <p style={{
                  margin: 0, fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
                  color: "#eaf0ec", lineHeight: 1.65, wordBreak: "keep-all",
                }}>
                  업로드가 진행 중입니다. 완료되기 전에는 다른 페이지로 이동할 수 없습니다.
                </p>
              </div>
              <div style={{ display: "flex", padding: "12px 22px 20px" }}>
                <button
                  onClick={() => blocker.reset()}
                  className="gd-mypage-action mint"
                  style={{
                    flex: 1, margin: 0, justifyContent: "center",
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  확인
                </button>
              </div>
            </div>
          </>
        )}

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
                    {overallProgress}% 업로드 중 · 전송 {uploadingItems.length}개
                    {queuedItems.length > 0 && ` · 대기 ${queuedItems.length}개`}
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

            {/* ── 업로드 대기 중인 항목 ── */}
            {queuedItems.length > 0 && (
              <div className="gd-up-list">
                <div className="gd-up-listhead">
                  <span>대기 중 {queuedItems.length}개</span>
                </div>
                {queuedItems.map((it) => (
                  <UploadItem key={it.id} item={it} onRemove={removeItem} onCategory={setCategory} />
                ))}
              </div>
            )}

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

              {/* 검색 */}
              <div style={{ position: "relative", marginBottom: 6 }}>
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

              {/* 탭(좌) | 카테고리 + 정렬(우) */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" }}>
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
                      : catFilter !== "all"
                        ? `${catLabel[catFilter] || catFilter} 카테고리의 문서가 없습니다.`
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
                          onDelete={requestDelete}
                          isPending={doc.status === "PENDING"}
                          isRejected={doc.status === "REJECTED"}
                          isFailed={doc.status === "FAILED"}
                          onPublish={requestPublic}
                          isAdmin={isAdmin}
                          onAdminPublish={adminPublish}
                          onItemClick={() => {
                            sessionStorage.setItem("upload_page", String(page));
                            navigate(`/docs/${doc.id}`);
                          }}
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

      {/* ── 삭제 확인 모달 ── */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(0,0,0,.55)",
                backdropFilter: "blur(3px)",
              }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDeleteTarget(null)}
            />
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
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.94, x: "-50%", y: "-44%" }}
              transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ height: 3, background: "linear-gradient(90deg, #c97070 0%, #e08a8a 100%)" }} />
              <div style={{ padding: "22px 24px 24px" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(224,138,138,.10)",
                  border: "1px solid rgba(224,138,138,.22)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16, color: "#e08a8a",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-sans)" }}>
                  문서를 삭제하시겠습니까?
                </h3>
                <p style={{
                  margin: "0 0 14px", fontSize: 13, color: "var(--dim)",
                  fontFamily: "var(--font-sans)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {deleteTarget.name}
                </p>
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
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="gd-mypage-action"
                    style={{ flex: 1, margin: 0, justifyContent: "center", fontSize: 13 }}
                  >
                    취소
                  </button>
                  <button onClick={confirmDelete} className="gd-del-confirm-btn">
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