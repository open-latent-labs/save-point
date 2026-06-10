import React, { useState, useRef, useEffect } from "react";
import { useUserRole } from "../../context/UserRoleContext.jsx";

/**
 * UserDetailSidebar (Tailwind CSS 버전)
 * 사용자 관리 테이블에서 행을 선택하면 우측에서 열리는 상세 드로어.
 *
 * 요구사항: Tailwind CSS 가 설정된 프로젝트.
 * 커스텀 색상은 arbitrary value 로 작성되어 tailwind.config 수정이 필요 없습니다.
 * 아이콘은 의존성 없는 인라인 SVG 입니다.
 *
 * 사용 예:
 *   const [selected, setSelected] = useState(null);
 *   <UserDetailSidebar
 *     user={selected}
 *     open={!!selected}
 *     onClose={() => setSelected(null)}
 *     onResetPassword={(u) => ...}
 *     onSuspend={(u) => ...}
 *     onDelete={(u) => ...}
 *   />
 */

const SAMPLE_USER = {
    name: "김개발",
    handle: "@kimdev",
    email: "kimdev@gmail.com",
    role: "USER",
    plan: "Free",
    joinedAt: "2024-05-12",
    lastSeenAgo: "5분 전",
    questions: 124,
    docs: 7,
};

const TABS = ["기본 정보", "활동 통계"];
const ROLE_OPTIONS = ["ADMIN", "USER"];
// const STATUS_OPTIONS = ["승인", "반려"];

/* ---------- 아이콘 (의존성 없는 인라인 SVG) ---------- */
const Icon = ({ name, size = 20, className = "" }) => {
    const common = {
        width: size, height: size, viewBox: "0 0 24 24", fill: "none",
        stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className,
    };
    switch (name) {
        case "x": return (<svg {...common}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
        case "chevron-down": return (<svg {...common}><polyline points="6 9 12 15 18 9" /></svg>);
        case "message": return (<svg {...common}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>);
        case "file": return (<svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>);
        case "star": return (<svg {...common}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>);
        case "bookmark": return (<svg {...common}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>);
        case "key": return (<svg {...common}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>);
        case "alert": return (<svg {...common}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
        case "trash": return (<svg {...common}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
        default: return null;
    }
};

/* ---------- 아바타 ---------- */
const AVATAR_COLORS = [
    ["#2dd4bf", "#0d9488"], ["#60a5fa", "#2563eb"], ["#f472b6", "#db2777"],
    ["#fbbf24", "#d97706"], ["#a78bfa", "#7c3aed"], ["#34d399", "#059669"],
];
const Avatar = ({ name }) => {
    const [a, b] = AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
    return (
        <div
            className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center text-2xl font-bold text-white ring-2 ring-[#22c55e]/40"
            style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
            aria-hidden
        >
            {name?.slice(0, 1)}
        </div>
    );
};

/* ---------- 셀렉트 ---------- */
const Select = ({ value, options, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center justify-between gap-2 w-full bg-gradient-to-b from-[#151b20] to-[#11161a] border border-white/[0.08] rounded-[10px] pl-3.5 pr-3 py-2.5 text-[13.5px] text-[#c3ccd2] cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/[0.16] hover:text-[#e7ecef] transition-all duration-150"
            >
                <span>{value}</span>
                <Icon name="chevron-down" size={14} className={`opacity-50 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-[#11161a] border border-white/[0.08] rounded-[10px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                    {options.map((o) => (
                        <button
                            key={o}
                            type="button"
                            onClick={() => { onChange?.(o); setOpen(false); }}
                            className={`w-full text-left px-3.5 py-2.5 text-[13.5px] transition-colors ${value === o
                                ? "text-[#34d399] bg-[#22c55e]/[0.08]"
                                : "text-[#c3ccd2] hover:bg-white/[0.05] hover:text-[#e7ecef]"
                                }`}
                        >
                            {o}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ---------- 통계 항목 ---------- */
const StatItem = ({ icon, label, value }) => (
    <div className="flex items-start gap-3">
        <span className="text-[#5b656d] mt-0.5"><Icon name={icon} size={18} /></span>
        <div>
            <div className="text-[12.5px] text-[#8a949c] mb-0.5">{label}</div>
            <div className="text-xl font-bold text-[#e7ecef] leading-none">{value}</div>
        </div>
    </div>
);

export default function UserDetailSidebar({
    user = SAMPLE_USER,
    open = true,
    onClose = () => { },
    onSuspend = () => { },
    onUnsuspend = () => { },
    onDelete = () => { },
}) {
    const [tab, setTab] = useState("기본 정보");
    const { getRole, updateRole } = useUserRole();

    // open=false 로 닫힐 때도 슬라이드 아웃 애니메이션이 재생되도록
    // user가 null이 되어도 마지막 데이터를 유지
    const lastUserRef = useRef(user);
    if (user) lastUserRef.current = user;
    const displayUser = lastUserRef.current;

    const role = getRole(displayUser);

    const handleRoleChange = (newRole) => {
        if (displayUser) updateRole(displayUser.id, newRole);
    };

    // 새 user로 바뀔 때 탭 초기화
    useEffect(() => {
        if (user) setTab("기본 정보");
    }, [user?.id]);

    if (!displayUser) return null;

    return (
        <>
            {/* 배경 오버레이 */}
            <div
                onClick={onClose}
                className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                aria-hidden
            />

            {/* 드로어 */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="사용자 상세"
                className={`fixed top-0 right-0 z-50 h-full w-full max-w-[400px] bg-[#0c1013] border-l border-white/[0.07] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col font-sans text-[#e7ecef] transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                {/* 상단: 닫기 + 프로필 */}
                <div className="px-6 pt-5 pb-4 shrink-0">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="닫기"
                            className="text-[#8a949c] hover:text-[#e7ecef] hover:bg-white/[0.06] p-1.5 rounded-lg transition-colors"
                        >
                            <Icon name="x" size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mt-1">
                        <Avatar name={displayUser.name} />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-xl font-extrabold tracking-[-0.3px]">{displayUser.name}</span>
                                <span className="inline-flex items-center text-[11.5px] font-semibold px-2.5 py-0.5 rounded-md bg-[#22c55e]/[0.13] text-[#34d399]">
                                    {role}
                                </span>
                            </div>
                            <div className="text-[13px] text-[#8a949c] mt-0.5">{displayUser.handle}</div>
                        </div>
                    </div>
                </div>

                {/* 탭 */}
                <div className="px-6 border-b border-white/[0.07] shrink-0">
                    <div className="flex gap-6">
                        {TABS.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                className={`relative pb-3 pt-1 text-[13.5px] transition-colors ${tab === t ? "text-[#e7ecef] font-semibold" : "text-[#8a949c] hover:text-[#e7ecef]"
                                    }`}
                            >
                                {t}
                                {tab === t && (
                                    <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#22c55e] rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 본문 (스크롤) */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {tab === "기본 정보" && (
                        <>
                            {/* 기본 정보 카드 */}
                            <section className="bg-[#11161a] border border-white/[0.06] rounded-2xl p-5">
                                <dl className="space-y-3.5">
                                    <Row label="이메일"><span className="text-[#e7ecef]">{displayUser.email}</span></Row>
                                    <Row label="가입일"><span className="text-[#e7ecef]">{displayUser.joinedAt}</span></Row>
                                    <Row label="상태"><Select value={role} options={ROLE_OPTIONS} onChange={handleRoleChange} /></Row>
                                    <Row label="최근 접속" align="start">
                                        <div>
                                            <div className="text-[#34d399] text-[12.5px] mt-0.5">({displayUser.lastSeenAgo})</div>
                                        </div>
                                    </Row>
                                </dl>
                            </section>

                            {/* 사용자 통계 */}
                            <section className="bg-[#11161a] border border-white/[0.06] rounded-2xl p-5">
                                <h3 className="text-[13.5px] font-semibold text-[#c3ccd2] mb-4">사용자 통계</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                                    <StatItem icon="message" label="질문 수" value={displayUser.questions} />
                                    <StatItem icon="file" label="업로드 문서 수" value={displayUser.docs} />
                                </div>
                            </section>

                            {/* 관리 기능 */}
                            <section className="bg-[#11161a] border border-white/[0.06] rounded-2xl p-5">
                                <h3 className="text-[13.5px] font-semibold text-[#c3ccd2] mb-4">관리 기능</h3>
                                <div className="grid gap-3">
                                    {displayUser.ban !== "BAN" && (
                                        <ActionButton icon="alert" label="사용자 정지" onClick={() => onSuspend(displayUser)} variant="warning" />
                                    )}
                                    {displayUser.ban === "BAN" && (
                                        <ActionButton icon="alert" label="활동 재개" onClick={() => onUnsuspend(displayUser)} variant="success" />
                                    )}
                                </div>
                            </section>
                        </>
                    )}

                    {tab === "활동 통계" && (
                        <div className="text-[#5b656d] text-sm text-center py-16">활동 통계 내용이 여기에 표시됩니다.</div>
                    )}
                </div>
            </aside>
        </>
    );
}

/* ---------- 라벨/값 행 ---------- */
const Row = ({ label, children, align = "center" }) => (
    <div className={`grid grid-cols-[72px_1fr] gap-4 items-${align === "start" ? "start" : "center"}`}>
        <dt className="text-[13px] text-[#8a949c] pt-0.5">{label}</dt>
        <dd className="text-[13.5px]">{children}</dd>
    </div>
);

/* ---------- 관리 기능 버튼 ---------- */
const ACTION_VARIANTS = {
    neutral: "bg-white/[0.04] text-[#c3ccd2] border border-white/[0.1] hover:bg-white/[0.08]",
    warning: "bg-[#f5b94a]/[0.08] text-[#f5b94a] border border-[#f5b94a]/30 hover:bg-[#f5b94a]/[0.14]",
    danger: "bg-[#ef4444]/[0.1] text-[#f87171] border border-[#ef4444]/35 hover:bg-[#ef4444]/[0.18]",
    success: "bg-[#22c55e]/[0.08] text-[#34d399] border border-[#22c55e]/30 hover:bg-[#22c55e]/[0.14]",
};
const ActionButton = ({ icon, label, onClick, variant = "neutral", className = "" }) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-colors ${ACTION_VARIANTS[variant]} ${className}`}
    >
        <Icon name={icon} size={16} />
        <span>{label}</span>
    </button>
);
