/*
 * SummaryCompleteModal — 독립형 재사용 컴포넌트 (Tailwind CSS 전용)
 * ─────────────────────────────────────────────────────────────────────────────
 * Props:
 *   isOpen        {boolean}            필수  모달 표시 여부
 *   onClose       {() => void}         필수  닫기 콜백 (ESC 키 / 배경 클릭 시 호출)
 *   onConfirm     {() => void}         선택  확인 버튼 클릭 콜백 (호출 후 onClose도 자동 호출)
 *   title         {string}             선택  모달 제목       (기본값: "문서요약 완료")
 *   subtitle      {string}             선택  부제목          (기본값: "문서가 성공적으로 요약 및 분류되었습니다.")
 *   confirmLabel  {string}             선택  버튼 레이블     (기본값: "확인")
 *   stats         {StatItem[]}         선택  통계 카드 배열 (비어있으면 섹션 숨김)
 *
 * StatItem:
 *   {
 *     value:    string | number   — 표시할 값
 *     label:    string            — 카드 하단 레이블
 *     iconType: 'document'        — 파일 아이콘  (기본값)
 *              | 'lines'          — 텍스트 줄 아이콘
 *              | 'tag'            — 태그 아이콘
 *   }
 *
 * 사용 예시:
 *   <SummaryCompleteModal
 *     isOpen={isOpen}
 *     onClose={() => setIsOpen(false)}
 *     onConfirm={() => router.push('/dashboard')}
 *     stats={[
 *       { value: 1,              label: '처리 문서',     iconType: 'document' },
 *       { value: '6,842',        label: '요약 토큰',     iconType: 'lines'    },
 *       { value: '게임 프로그래밍', label: '분류 카테고리', iconType: 'tag'      },
 *     ]}
 *   />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useCallback } from 'react';

// ─── 아이콘 ──────────────────────────────────────────────────────────────────

const iconPaths = {
  document: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  ),
  lines: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
  ),
  tag: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
    />
  ),
};

const StatIcon = ({ iconType = 'document' }) => (
  <svg
    className="w-4 h-4 text-emerald-400 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
    aria-hidden="true"
  >
    {iconPaths[iconType] ?? iconPaths.document}
  </svg>
);

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

const SummaryCompleteModal = ({
  isOpen = false,
  onClose,
  onConfirm,
  title = '문서요약 완료',
  subtitle = '문서가 성공적으로 요약 및 분류되었습니다.',
  confirmLabel = '확인',
  stats = [],
}) => {
  const confirmBtnRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    // 모달이 열리면 확인 버튼에 포커스
    const id = setTimeout(() => confirmBtnRef.current?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(id);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleConfirm = () => {
    onConfirm?.();
    onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* 배경 글로우 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <div className="w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      {/* 메인 카드 */}
      <div className="relative w-full max-w-[480px] rounded-2xl border border-emerald-500/40 bg-[#0d1117]/90 p-8 shadow-[0_0_40px_rgba(16,185,129,0.15),inset_0_1px_1px_rgba(255,255,255,0.05)]">
        {/* 상단 글로우 라인 */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
        />

        {/* 체크 아이콘 */}
        <div className="flex justify-center mb-6" aria-hidden="true">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl scale-150" />
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-lg scale-125" />
            <div className="absolute -top-1 -right-2 w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <div className="absolute -bottom-0.5 -left-3 w-1 h-1 rounded-full bg-emerald-400/60 shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
            <div className="absolute top-1/2 -right-4 w-0.5 h-0.5 rounded-full bg-emerald-300/50" />
            <div className="absolute -top-2 left-1/2 w-1 h-1 rounded-full bg-emerald-400/40" />
            <div className="relative w-16 h-16 rounded-full border-2 border-emerald-400/70 bg-[#0d1117] flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <svg
                className="w-8 h-8 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* 제목 */}
        <h2
          id="scm-title"
          className="text-center text-white text-xl font-bold tracking-tight mb-2"
        >
          {title}
        </h2>

        {/* 부제목 */}
        <p className="text-center text-gray-400 text-sm mb-8">{subtitle}</p>

        {/* 통계 그리드 */}
        {stats.length > 0 && (
          <dl className="grid grid-cols-3 gap-3 mb-8">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="rounded-xl bg-[#161b22] border border-gray-800/60 p-4 flex flex-col items-center"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <StatIcon iconType={stat.iconType} />
                  <dd className="text-emerald-400 text-sm font-semibold truncate max-w-[80px] m-0">
                    {stat.value}
                  </dd>
                </div>
                <dt className="text-gray-500 text-xs">{stat.label}</dt>
              </div>
            ))}
          </dl>
        )}

        {/* 확인 버튼 */}
        <button
          ref={confirmBtnRef}
          type="button"
          onClick={handleConfirm}
          className="w-full py-3 rounded-lg border border-emerald-500/50 bg-transparent text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 hover:border-emerald-400/70 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-2 focus:ring-offset-[#0d1117]"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
};

export default SummaryCompleteModal;
