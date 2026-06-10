import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMergePreview, confirmMerge, cancelMerge } from "../api/auth.js";

const PROVIDER_NAMES = { google: "Google", kakao: "Kakao", naver: "Naver" };

export default function MergeConfirmModal({ provider, onDone }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider) return;
    getMergePreview()
      .then(setPreview)
      .catch(() => setPreview({}));
  }, [provider]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await confirmMerge();
      onDone("success");
    } catch {
      onDone("error");
    }
  };

  const handleCancel = async () => {
    await cancelMerge().catch(() => {});
    onDone("cancel");
  };

  return (
    <AnimatePresence>
      {provider && (
        <>
          <motion.div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
              zIndex: 1200,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCancel}
          />
          <motion.div
            style={{
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              background: "var(--surface-2, #1e1e2e)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "28px 28px 24px",
              width: "min(360px, 90vw)",
              zIndex: 1201,
              display: "flex", flexDirection: "column", gap: 14,
            }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ fontSize: 28, textAlign: "center" }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, textAlign: "center", color: "var(--fg)" }}>
              계정 병합 확인
            </div>
            <p style={{ fontSize: 13, color: "var(--fg)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
              이 <strong>{PROVIDER_NAMES[provider] ?? provider}</strong> 계정은<br />
              이미 다른 계정과 연결되어 있습니다.
            </p>

            {preview && (
              <div style={{
                background: "var(--surface)", borderRadius: 10,
                padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
              }}>
                <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 4 }}>
                  다른 계정에서 현재 계정으로 이전될 데이터
                </div>
                {[
                  { label: "채팅 기록", val: preview.chat_sessions ?? 0 },
                  { label: "핀",       val: preview.pinned_documents ?? 0 },
                  { label: "북마크",   val: preview.bookmarked_documents ?? 0 },
                  { label: "업로드 문서", val: preview.uploaded_documents ?? 0 },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--faint)" }}>{label}</span>
                    <span style={{ color: val > 0 ? "var(--accent)" : "var(--faint)", fontWeight: val > 0 ? 600 : 400 }}>
                      {val}개
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 12, color: "var(--faint)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
              병합 후 다른 계정은 삭제됩니다.<br />이 작업은 되돌릴 수 없습니다.
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={handleCancel}
                disabled={loading}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--fg)", fontSize: 13, cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                  background: "#ef4444", color: "#fff", fontSize: 13,
                  fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "병합 중…" : "병합하기"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
