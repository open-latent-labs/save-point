import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMergePreview, confirmMerge, cancelMerge } from "../api/auth.js";

const PROVIDER_NAMES = { google: "Google", kakao: "Kakao", naver: "Naver" };

const ROWS = [
  { key: "chat_sessions",        label: "채팅 기록" },
  { key: "pinned_documents",     label: "핀" },
  { key: "bookmarked_documents", label: "북마크" },
  { key: "uploaded_documents",   label: "업로드 문서" },
];

export default function MergeConfirmModal({ provider, onDone }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider) { setPreview(null); return; }
    getMergePreview().then(setPreview).catch(() => setPreview({}));
  }, [provider]);

  const handleConfirm = async () => {
    setLoading(true);
    try { await confirmMerge(); onDone("success"); }
    catch { onDone("error"); }
  };

  const handleCancel = async () => {
    await cancelMerge().catch(() => {});
    onDone("cancel");
  };

  return (
    <AnimatePresence>
      {provider && (
        <>
          {/* 오버레이 */}
          <motion.div
            className="gd-mypage-overlay"
            style={{ zIndex: 200 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCancel}
          />

          {/* 모달 */}
          <motion.div
            style={{
              position: "fixed", top: "50%", left: "50%",
              zIndex: 201,
              width: "min(400px, calc(100vw - 32px))",
              background: "linear-gradient(180deg, #0e1113 0%, #07090a 100%)",
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 32px 80px -16px rgba(0,0,0,.95), 0 0 0 1px rgba(54,224,161,.06)",
            }}
            initial={{ opacity: 0, scale: 0.94, x: "-50%", y: "-44%" }}
            animate={{ opacity: 1, scale: 1,    x: "-50%", y: "-50%" }}
            exit={{   opacity: 0, scale: 0.94, x: "-50%", y: "-44%" }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {/* 민트 스트립 */}
            <div style={{
              height: 3,
              background: "linear-gradient(90deg, #11b981 0%, #36e0a1 55%, #00b8d9 100%)",
            }} />

            {/* 헤더 */}
            <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                letterSpacing: ".07em",
                textTransform: "uppercase",
                color: "#36e0a1",
                marginBottom: 10,
              }}>
                계정 병합 확인
              </div>
              <p style={{
                margin: 0,
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 500,
                color: "#eaf0ec",
                lineHeight: 1.65,
                wordBreak: "keep-all",
              }}>
                이{" "}
                <strong style={{ color: "#36e0a1", fontWeight: 700 }}>
                  {PROVIDER_NAMES[provider] ?? provider}
                </strong>{" "}
                계정은 이미 다른 계정과 연결되어 있습니다.
              </p>
            </div>

            {/* 이전 데이터 */}
            <div style={{ padding: "14px 20px 8px" }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "#8a938f",
                marginBottom: 8,
              }}>
                다른 계정에서 이전될 데이터
              </div>

              <div style={{
                border: "1px solid rgba(255,255,255,.07)",
                borderRadius: 10,
                overflow: "hidden",
              }}>
                {ROWS.map(({ key, label }, i) => {
                  const val = preview?.[key] ?? null;
                  return (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 14px",
                        borderBottom: i < ROWS.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none",
                        background: i % 2 === 0 ? "rgba(255,255,255,.015)" : "transparent",
                      }}
                    >
                      <span style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "#c0c8c4",
                      }}>
                        {label}
                      </span>
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: val > 0 ? 700 : 400,
                        color: val === null ? "#565c59" : val > 0 ? "#36e0a1" : "#8a938f",
                      }}>
                        {val === null ? "…" : `${val}개`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 안내 문구 */}
            <p style={{
              margin: "10px 20px 16px",
              padding: "9px 12px",
              borderRadius: 8,
              background: "rgba(54,224,161,.05)",
              border: "1px solid rgba(54,224,161,.14)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "#8a938f",
              lineHeight: 1.65,
              wordBreak: "keep-all",
            }}>
              병합 후 다른 계정은 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>

            {/* 버튼 */}
            <div style={{ display: "flex", gap: 8, padding: "0 20px 20px" }}>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="gd-mypage-action"
                style={{ flex: 1, margin: 0, justifyContent: "center", fontSize: 13 }}
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="gd-mypage-action mint"
                style={{
                  flex: 1, margin: 0, justifyContent: "center", fontSize: 13, fontWeight: 600,
                  opacity: loading ? 0.6 : 1,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {loading
                  ? <><span className="gd-spin-sm" style={{ borderTopColor: "#04130e", width: 13, height: 13 }} />병합 중…</>
                  : "병합하기"
                }
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
