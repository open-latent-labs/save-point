import React, { useState, useRef, useEffect } from "react";
import { useUserRole } from "../../context/UserRoleContext.jsx";
import { formatLastSeen } from "../../api/connect.js";
import { changeRole, getUserRoleLog } from "../../api/superAdmin.js";

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

/* ---------- 아이콘 ---------- */
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
        case "calendar": return (<svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>);
        case "activity": return (<svg {...common}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>);
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


export default function UserDetailSidebar({
    user = SAMPLE_USER,
    open = true,
    onClose = () => { },
    onSuspend = () => { },
    onUnsuspend = () => { },
    onDelete = () => { },
    onlineIds = new Set(),
    lt = false,
}) {
    const [tab, setTab] = useState("기본 정보");
    const [roleLog, setRoleLog] = useState([]);
    const [roleLogLoading, setRoleLogLoading] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [roleConfirm, setRoleConfirm] = useState(null);
    const [isBanned, setIsBanned] = useState(user?.ban === "BAN");
    const { getRole, updateRole } = useUserRole();

    const lastUserRef = useRef(user);
    if (user) lastUserRef.current = user;
    const displayUser = lastUserRef.current;

    const role = getRole(displayUser);

    const handleRoleChange = async (newRole) => {
        if (!displayUser) return;
        const current = getRole(displayUser);
        if (current === newRole) return;
        try {
            await changeRole({ id: displayUser.id, role: current });
            updateRole(displayUser.id, newRole);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (user) {
            setTab("기본 정보");
            setRoleLog([]);
            setIsBanned(user.ban === "BAN");
        }
    }, [user?.id]);

    useEffect(() => {
        if (!roleConfirm && !confirm) return;
        const handler = (e) => {
            if (e.key !== "Escape") return;
            if (roleConfirm) setRoleConfirm(null);
            else if (confirm) setConfirm(null);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [roleConfirm, confirm]);

    useEffect(() => {
        if (tab !== "활동 통계" || !displayUser?.id) return;
        setRoleLogLoading(true);
        getUserRoleLog(displayUser.id)
            .then(setRoleLog)
            .catch(() => setRoleLog([]))
            .finally(() => setRoleLogLoading(false));
    }, [tab, displayUser?.id]);

    if (!displayUser) return null;

    return (
        <>
            {/* 배경 오버레이 */}
            <div
                onClick={onClose}
                className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                aria-hidden
            />

            {/* 드로어 */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="사용자 상세"
                className={`fixed top-0 right-0 z-50 h-full w-full max-w-[400px] flex flex-col font-sans transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"} ${
                    lt
                    ? "bg-[#F9FAFB] border-l border-black/[0.08] shadow-[-20px_0_50px_rgba(0,0,0,0.10)] text-[#111827]"
                    : "bg-[#0c1013] border-l border-white/[0.07] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] text-[#e7ecef]"
                }`}
            >
                {/* 상단: 닫기 + 프로필 */}
                <div className="px-6 pt-5 pb-4 shrink-0">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="닫기"
                            className={`p-1.5 rounded-lg transition-colors ${
                                lt
                                ? "text-[#9CA3AF] hover:text-[#111827] hover:bg-black/[0.05]"
                                : "text-[#8a949c] hover:text-[#e7ecef] hover:bg-white/[0.06]"
                            }`}
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
                            <div className={`text-[13px] mt-0.5 ${lt ? "text-[#9CA3AF]" : "text-[#8a949c]"}`}>{displayUser.handle}</div>
                        </div>
                    </div>
                </div>

                {/* 탭 */}
                <div className={`px-6 border-b shrink-0 ${lt ? "border-black/[0.08]" : "border-white/[0.07]"}`}>
                    <div className="flex gap-6">
                        {TABS.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                className={`relative pb-3 pt-1 text-[13.5px] transition-colors outline-none ${
                                    tab === t
                                    ? `${lt ? "text-[#111827]" : "text-[#e7ecef]"} font-semibold`
                                    : lt ? "text-[#6B7280] hover:text-[#111827]" : "text-[#8a949c] hover:text-[#e7ecef]"
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
                            <section className={`border rounded-2xl p-5 ${lt ? "bg-white border-black/[0.07] shadow-sm" : "bg-[#11161a] border-white/[0.06]"}`}>
                                <dl className="space-y-3.5">
                                    <Row label="등급" lt={lt}>
                                        <div className="inline-flex items-center gap-2 shrink-0">
                                            <span className={`text-[13px] font-semibold ${lt ? "text-[#111827]" : "text-[#e7ecef]"}`}>{role}</span>
                                            <button
                                                type="button"
                                                onClick={() => setRoleConfirm(role === "ADMIN" ? "USER" : "ADMIN")}
                                                className={`px-3 py-1 text-[12px] font-medium rounded-[8px] border transition-colors ${
                                                    role === "ADMIN"
                                                        ? lt
                                                            ? "bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100"
                                                            : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                                                        : lt
                                                            ? "bg-green-50 border-green-300 text-green-600 hover:bg-green-100"
                                                            : "bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/20"
                                                }`}
                                            >
                                                {role === "ADMIN" ? "USER" : "ADMIN"}으로 변경
                                            </button>
                                        </div>
                                    </Row>
                                    <Row label="이메일" lt={lt}><span className={lt ? "text-[#111827]" : "text-[#e7ecef]"}>{displayUser.email}</span></Row>
                                    <Row label="가입일" lt={lt}><span className={lt ? "text-[#111827]" : "text-[#e7ecef]"}>{displayUser.joinedAt}</span></Row>
                                    <Row label="최근 접속" align="start" lt={lt}>
                                        <div>
                                            {onlineIds.has(displayUser.id) ? (
                                                <div className="inline-flex items-center gap-1.5 mt-0.5">
                                                    <span className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.7)] shrink-0" />
                                                    <span className="text-[#22c55e] text-[12.5px] font-semibold">현재 활동 중</span>
                                                </div>
                                            ) : (() => {
                                                const seen = formatLastSeen(displayUser.lastActiveAt);
                                                return (
                                                    <div className="inline-flex items-center gap-1.5 mt-0.5">
                                                        <span className="w-2 h-2 rounded-full bg-[#f87171] shrink-0" />
                                                        <span className={`text-[12.5px] ${lt ? "text-[#6B7280]" : "text-[#b0bdc5]"}`}>
                                                            {seen != null ? `${seen} 전에 활동` : "접속 기록 없음"}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </Row>
                                </dl>
                            </section>

                            {/* 관리 기능 */}
                            <section className={`border rounded-2xl p-5 ${lt ? "bg-white border-black/[0.07] shadow-sm" : "bg-[#11161a] border-white/[0.06]"}`}>
                                <h3 className={`text-[13.5px] font-semibold mb-4 ${lt ? "text-[#374151]" : "text-[#c3ccd2]"}`}>관리 기능</h3>
                                <div className="grid gap-3">
                                    <ActionButton
                                        icon="alert"
                                        label={isBanned ? "활동 재개" : "사용자 정지"}
                                        variant={isBanned ? "success" : "warning"}
                                        onClick={() => setConfirm(isBanned ? "unsuspend" : "suspend")}
                                    />
                                </div>
                            </section>
                        </>
                    )}

                    {tab === "활동 통계" && (() => {
                        const joinedMs = displayUser.joinedAt ? new Date(displayUser.joinedAt).getTime() : null;
                        const daysSince = joinedMs ? Math.max(1, Math.floor((Date.now() - joinedMs) / 86_400_000)) : null;
                        const avgPerDay = daysSince ? (displayUser.questions / daysSince).toFixed(2) : "-";

                        return (
                            <>
                                {/* 활동 지표 카드 */}
                                <section className={`border rounded-2xl p-5 ${lt ? "bg-white border-black/[0.07] shadow-sm" : "bg-[#11161a] border-white/[0.06]"}`}>
                                    <h3 className={`text-[13.5px] font-semibold mb-4 ${lt ? "text-[#374151]" : "text-[#c3ccd2]"}`}>활동 지표</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { icon: "message", label: "질문 수", value: displayUser.questions.toLocaleString(), unit: "회" },
                                            { icon: "file",    label: "업로드 문서", value: displayUser.docs.toLocaleString(), unit: "개" },
                                            { icon: "calendar", label: "가입 경과", value: daysSince?.toLocaleString() ?? "-", unit: "일" },
                                            { icon: "activity", label: "일평균 질문", value: avgPerDay, unit: "회/일" },
                                        ].map(({ icon, label, value, unit }) => (
                                            <div key={label} className={`border rounded-xl p-3.5 flex flex-col gap-1.5 ${lt ? "bg-white border-black/[0.09] shadow-sm" : "bg-[#0c1013] border-white/[0.08]"}`}>
                                                <div className={`flex items-center gap-1.5 ${lt ? "text-[#6B7280]" : "text-[#b0bdc5]"}`}>
                                                    <Icon name={icon} size={13} />
                                                    <span className="text-[11px] font-medium">{label}</span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-[22px] font-extrabold leading-none ${lt ? "text-[#111827]" : "text-[#e7ecef]"}`}>{value}</span>
                                                    <span className={`text-[11px] ${lt ? "text-[#6B7280]" : "text-[#b0bdc5]"}`}>{unit}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* 권한 변경 이력 */}
                                <section className={`border rounded-2xl p-5 ${lt ? "bg-white border-black/[0.07] shadow-sm" : "bg-[#11161a] border-white/[0.06]"}`}>
                                    <h3 className={`text-[13.5px] font-semibold mb-4 ${lt ? "text-[#374151]" : "text-[#c3ccd2]"}`}>권한 변경 이력</h3>
                                    {roleLogLoading ? (
                                        <p className={`text-center text-[13px] py-6 ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>불러오는 중...</p>
                                    ) : roleLog.length === 0 ? (
                                        <p className={`text-center text-[13px] py-6 ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>변경 이력이 없습니다</p>
                                    ) : (
                                        <ol className={`relative border-l ml-2 space-y-4 ${lt ? "border-black/[0.12]" : "border-white/[0.12]"}`}>
                                            {roleLog.map((entry) => {
                                                const isPromotion = entry.after_role === "ADMIN";
                                                return (
                                                    <li key={entry.id} className="pl-5 relative">
                                                        <span className={`absolute -left-[5px] top-[3px] w-2.5 h-2.5 rounded-full border-2 ${lt ? "border-[#F9FAFB]" : "border-[#0c1013]"} ${isPromotion ? "bg-[#a78bfa]" : "bg-[#f87171]"}`} />
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className={`text-[11.5px] font-bold ${isPromotion ? "text-[#a78bfa]" : "text-[#f87171]"}`}>
                                                                {entry.before_role} → {entry.after_role}
                                                            </span>
                                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isPromotion ? "bg-[#a78bfa]/[0.12] text-[#a78bfa]" : "bg-[#f87171]/[0.12] text-[#f87171]"}`}>
                                                                {isPromotion ? "승급" : "강등"}
                                                            </span>
                                                        </div>
                                                        <div className={`text-[12px] ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>by <span className={`font-medium ${lt ? "text-[#374151]" : "text-[#e7ecef]"}`}>{entry.changed_by_name}</span></div>
                                                        <div className={`text-[11px] font-mono mt-0.5 ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>{entry.created_at.slice(0, 10)}</div>
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    )}
                                </section>
                            </>
                        );
                    })()}
                </div>
            </aside>
            {/* 권한 변경 확인 모달 */}
            {roleConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                    <div className={`rounded-2xl p-6 w-[320px] shadow-2xl ${lt ? "bg-white border border-black/[0.08]" : "bg-[#11161a] border border-white/[0.08]"}`}>
                        <h3 className={`text-[15px] font-bold mb-2 ${lt ? "text-[#111827]" : "text-[#e7ecef]"}`}>
                            권한 변경
                        </h3>
                        <p className={`text-[13px] leading-relaxed ${lt ? "text-[#6B7280]" : "text-[#8a949c]"}`}>
                            <span className="font-semibold">{displayUser.name}</span> 사용자의 권한을{" "}
                            <span className={`font-semibold ${roleConfirm === "ADMIN" ? "text-[#22c55e]" : "text-amber-400"}`}>
                                {roleConfirm}
                            </span>
                            으로 변경하시겠습니까?
                        </p>
                        <div className="flex gap-2 mt-5">
                            <button
                                type="button"
                                onClick={() => setRoleConfirm(null)}
                                className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors ${lt ? "bg-black/[0.05] text-[#374151] hover:bg-black/[0.09]" : "bg-white/[0.06] text-[#c3ccd2] hover:bg-white/[0.10]"}`}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => { handleRoleChange(roleConfirm); setRoleConfirm(null); }}
                                className="flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors bg-[#22c55e]/[0.12] text-[#34d399] hover:bg-[#22c55e]/[0.22]"
                            >
                                변경
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* 확인 다이얼로그 */}
            {confirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                    <div className={`rounded-2xl p-6 w-[320px] shadow-2xl ${lt ? "bg-white border border-black/[0.08]" : "bg-[#11161a] border border-white/[0.08]"}`}>
                        <h3 className={`text-[15px] font-bold mb-2 ${lt ? "text-[#111827]" : "text-[#e7ecef]"}`}>
                            {confirm === "suspend" ? "사용자 정지" : "활동 재개"}
                        </h3>
                        <p className={`text-[13px] ${lt ? "text-[#6B7280]" : "text-[#8a949c]"}`}>
                            {confirm === "suspend"
                                ? `${displayUser.name} 사용자를 정지하시겠습니까?`
                                : `${displayUser.name} 사용자의 활동을 재개하시겠습니까?`}
                        </p>
                        <div className="flex gap-2 mt-5">
                            <button
                                type="button"
                                onClick={() => setConfirm(null)}
                                className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors ${lt ? "bg-black/[0.05] text-[#374151] hover:bg-black/[0.09]" : "bg-white/[0.06] text-[#c3ccd2] hover:bg-white/[0.10]"}`}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm === "suspend") { onSuspend(displayUser); setIsBanned(true); }
                                    else { onUnsuspend(displayUser); setIsBanned(false); }
                                    setConfirm(null);
                                }}
                                className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors ${confirm === "suspend" ? "bg-[#f5b94a]/[0.15] text-[#f5b94a] hover:bg-[#f5b94a]/[0.25]" : "bg-[#22c55e]/[0.12] text-[#34d399] hover:bg-[#22c55e]/[0.22]"}`}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ---------- 라벨/값 행 ---------- */
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

/* ---------- 라벨/값 행 ---------- */
const Row = ({ label, children, align = "center", lt = false }) => (
    <div className={`grid grid-cols-[72px_1fr] gap-4 items-${align === "start" ? "start" : "center"}`}>
        <dt className={`text-[13px] pt-0.5 ${lt ? "text-[#6B7280]" : "text-[#8a949c]"}`}>{label}</dt>
        <dd className="text-[13.5px]">{children}</dd>
    </div>
);

/* ---------- 관리 기능 버튼 ---------- */
