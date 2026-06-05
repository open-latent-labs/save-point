import React, { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import Topbar from "../../components/Topbar.jsx";
import UserDetailSidebar from "../../components/superAdmin/MyInformationSide.jsx";
import MyPageDrawer from "../../components/MyPageDrawer.jsx";
import { useUserRole } from "../../context/UserRoleContext.jsx";


const SAMPLE_USERS = [
    { id: 1, name: "김개발", handle: "@kimdev", email: "kimdev@gmail.com", role: "USER", questions: 124, docs: 7, favorites: 23, bookmarks: 15, lastSeen: "5분 전", lastSeenAt: "2026-06-02 09:55:00", lastSeenAgo: "5분 전", joinedAt: "2024-05-12" },
    { id: 2, name: "이유니티", handle: "@unitylee", email: "unitylee@gmail.com", role: "USER", questions: 892, docs: 23, favorites: 61, bookmarks: 44, lastSeen: "12분 전", lastSeenAt: "2026-06-02 09:48:00", lastSeenAgo: "12분 전", joinedAt: "2023-11-03" },
    { id: 3, name: "박엔진", handle: "@enginepark", email: "enginepark@gmail.com", role: "USER", questions: 56, docs: 3, favorites: 9, bookmarks: 5, lastSeen: "1시간 전", lastSeenAt: "2026-06-02 09:00:00", lastSeenAgo: "1시간 전", joinedAt: "2024-08-21" },
    { id: 4, name: "관리자", handle: "@admin", email: "admin@gamedocs.ai", role: "ADMIN", questions: 0, docs: 156, favorites: 0, bookmarks: 0, lastSeen: "현재 접속", lastSeenAt: "2026-06-02 10:00:00", lastSeenAgo: "현재 접속", joinedAt: "2023-01-01", online: true },
    { id: 5, name: "최그래픽", handle: "@graphicchoi", email: "graphicchoi@gmail.com", role: "USER", questions: 421, docs: 18, favorites: 37, bookmarks: 29, lastSeen: "3시간 전", lastSeenAt: "2026-06-02 07:00:00", lastSeenAgo: "3시간 전", joinedAt: "2024-02-14" },
    { id: 6, name: "정쉐이더", handle: "@shaderjung", email: "shaderjung@gmail.com", role: "USER", questions: 73, docs: 5, favorites: 12, bookmarks: 8, lastSeen: "1일 전", lastSeenAt: "2026-06-01 10:30:00", lastSeenAgo: "1일 전", joinedAt: "2024-06-30" },
    { id: 7, name: "한시", handle: "@aihan", email: "aihan@gmail.com", role: "USER", questions: 611, docs: 31, favorites: 55, bookmarks: 40, lastSeen: "2일 전", lastSeenAt: "2026-05-31 14:00:00", lastSeenAgo: "2일 전", joinedAt: "2023-09-05" },
    { id: 8, name: "오렌더링", handle: "@renderoh", email: "renderoh@gmail.com", role: "USER", questions: 39, docs: 2, favorites: 4, bookmarks: 2, lastSeen: "3일 전", lastSeenAt: "2026-05-30 18:00:00", lastSeenAgo: "3일 전", joinedAt: "2025-01-17" },
    { id: 9, name: "강게임", handle: "@gamekang", email: "gamekang@gmail.com", role: "USER", questions: 11, docs: 1, favorites: 1, bookmarks: 0, lastSeen: "5일 전", lastSeenAt: "2026-05-28 20:00:00", lastSeenAgo: "5일 전", joinedAt: "2025-03-08" },
    { id: 10, name: "정지유저", handle: "@blocked", email: "blocked@gmail.com", role: "USER", questions: 3, docs: 0, favorites: 0, bookmarks: 0, lastSeen: "14일 전", lastSeenAt: "2026-05-19 12:00:00", lastSeenAgo: "14일 전", joinedAt: "2024-12-01" },
];

const SAMPLE_STATS = [
    { key: "total", label: "전체 사용자", value: "1,248", sub: "전체 가입 사용자", icon: "users", tone: "green" },
    { key: "active", label: "활성 사용자", value: "837", sub: "최근 30일 접속", icon: "activity", tone: "teal" },
    { key: "admin", label: "관리자", value: "4", sub: "전체 관리자 계정", icon: "shield", tone: "violet" },
    { key: "blocked", label: "정지 사용자", value: "18", sub: "접근이 제한된 계정", icon: "ban", tone: "red" },
];

const STAT_TONES = {
    green: "bg-[#22c55e]/[0.13] text-[#34d399]",
    teal: "bg-[#2dd4bf]/[0.13] text-[#2dd4bf]",
    violet: "bg-[#a78bfa]/[0.14] text-[#a78bfa]",
    red: "bg-[#f87171]/[0.13] text-[#f87171]",
};

/* ---------- 아이콘 (의존성 없는 인라인 SVG) ---------- */
const Icon = ({ name, size = 20, className = "" }) => {
    const common = {
        width: size, height: size, viewBox: "0 0 24 24", fill: "none",
        stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className,
    };
    switch (name) {
        case "users": return (<svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
        case "activity": return (<svg {...common}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>);
        case "shield": return (<svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
        case "ban": return (<svg {...common}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>);
        case "search": return (<svg {...common}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);
        case "plus": return (<svg {...common}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);
        case "refresh": return (<svg {...common}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>);
        case "chevron-down": return (<svg {...common}><polyline points="6 9 12 15 18 9" /></svg>);
        case "chevron-left": return (<svg {...common}><polyline points="15 18 9 12 15 6" /></svg>);
        case "chevron-right": return (<svg {...common}><polyline points="9 18 15 12 9 6" /></svg>);
        case "dots": return (<svg {...common}><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>);
        case "alert": return (<svg {...common}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
        default: return null;
    }
};

/* ---------- 아바타 (이니셜 + 결정적 색상) ---------- */
const AVATAR_COLORS = [
    ["#2dd4bf", "#0d9488"], ["#60a5fa", "#2563eb"], ["#f472b6", "#db2777"],
    ["#fbbf24", "#d97706"], ["#a78bfa", "#7c3aed"], ["#34d399", "#059669"],
    ["#f87171", "#dc2626"], ["#38bdf8", "#0284c7"],
];
const Avatar = ({ name, status }) => {
    const base = "w-[34px] h-[34px] rounded-full shrink-0 flex items-center justify-center text-[13px] font-bold";
    if (status === "정지") {
        return <div className={`${base} bg-[#f87171]/[0.15] text-[#f87171] border border-[#f87171]/30`} aria-hidden><Icon name="alert" size={16} /></div>;
    }
    if (name === "관리자") {
        return <div className={`${base} bg-[#22c55e]/[0.16] text-[#34d399] border border-[#22c55e]/30`} aria-hidden><Icon name="shield" size={16} /></div>;
    }
    const [a, b] = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
    return (
        <div className={`${base} text-white`} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} aria-hidden>
            {name.slice(0, 1)}
        </div>
    );
};

/* ---------- 배지 ---------- */
const BADGE_BASE = "inline-flex items-center text-[11.5px] font-semibold px-2.5 py-1 rounded-md tracking-wide";
const ROLE_STYLES = {
    USER: "bg-white/5 text-[#8a949c] border border-white/10",
    ADMIN: "bg-[#a78bfa]/[0.15] text-[#a78bfa] border border-[#a78bfa]/25",
};
const RoleBadge = ({ role }) => <span className={`${BADGE_BASE} ${ROLE_STYLES[role]}`}>{role}</span>;

/* ---------- 셀렉트(필터) ---------- */
const FilterSelect = ({ label, className = "" }) => (
    <button type="button" className={`inline-flex items-center justify-between gap-2 bg-gradient-to-b from-[#151b20] to-[#11161a] text-[#8a949c] border border-white/[0.08] rounded-[10px] px-3.5 py-2 text-[13px] cursor-pointer min-w-[112px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/[0.16] hover:text-[#c3ccd2] transition-all duration-150 ${className}`}>
        <span>{label}</span>
        <Icon name="chevron-down" size={14} className="opacity-50 shrink-0" />
    </button>
);

export default function UserManagement({
    users = SAMPLE_USERS,
    stats = SAMPLE_STATS,
    total = 1248,
    onInvite = () => { },
}) {
    const ctx = useOutletContext();
    const onMenu = ctx?.onMenu ?? (() => { });
    const sbVisible = ctx?.sbVisible ?? false;
    const [myPageOpen, setMyPageOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState(() => new Set());
    const [detailUser, setDetailUser] = useState(null);
    const [page, setPage] = useState(1);
    const { getRole, updateRole } = useUserRole();

    const toggleRole = (e, user) => {
        e.stopPropagation();
        const current = getRole(user);
        const next = current === "ADMIN" ? "USER" : "ADMIN";
        updateRole(user.id, next);
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return users;
        return users.filter(
            (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q)
        );
    }, [users, query]);

    const allChecked = filtered.length > 0 && filtered.every((u) => selected.has(u.id));

    const toggleAll = () =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (allChecked) filtered.forEach((u) => next.delete(u.id));
            else filtered.forEach((u) => next.add(u.id));
            return next;
        });

    const toggleOne = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const checkboxCls =
        "appearance-none w-4 h-4 rounded-[5px] border-[1.5px] border-white/[0.12] bg-[#0a0d0c] cursor-pointer align-middle relative " +
        "checked:bg-[#22c55e] checked:border-[#22c55e] " +
        "after:content-[''] after:absolute after:hidden checked:after:block after:left-[4.5px] after:top-[1.5px] after:w-1 after:h-2 after:border-[#06210f] after:border-solid after:border-r-2 after:border-b-2 after:rotate-45";

    const pages = [1, 2, 3, 4, 5];

    return (
        <div className="w-full min-h-full bg-[#0a0d0c] text-[#e7ecef] font-sans [font-feature-settings:'tnum']">
            <Topbar onMenu={onMenu} onProfile={() => setMyPageOpen(true)} />
            <div className={`transition-[padding-left] duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.7,0.2,1)] pl-4 pr-4 sm:pr-8 py-[18px] sm:pt-7 sm:pb-10 ${sbVisible ? 'min-[861px]:pl-[264px]' : ''}`}>
                {/* 헤더 */}
                <header className="flex flex-col sm:flex-row sm:justify-between items-start gap-6 mb-6">
                    <div>
                        <h1 className="text-[26px] font-extrabold m-0 mb-1.5 tracking-[-0.5px]">사용자 관리</h1>
                        <p className="text-[13.5px] text-[#8a949c] m-0">플랫폼에 등록된 사용자 정보를 관리하고 역할과 권한을 설정할 수 있습니다.</p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-3.5">
                        <nav className="text-[13px] text-[#5b656d] flex gap-2 items-center">
                            <span>홈</span>
                            <span className="opacity-50">/</span>
                            <span className="text-[#8a949c]">사용자 관리</span>
                        </nav>

                    </div>
                </header>

                {/* 통계 카드 */}
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-[22px]">
                    {stats.map((s) => (
                        <div
                            key={s.key}
                            className="flex items-center gap-4 bg-gradient-to-b from-[#151b20] to-[#11161a] border border-white/[0.07] rounded-2xl px-[22px] py-5 hover:border-white/[0.12] hover:-translate-y-0.5 transition-[border-color,transform]"
                        >
                            <div className={`w-12 h-12 rounded-[13px] flex items-center justify-center shrink-0 ${STAT_TONES[s.tone]}`}>
                                <Icon name={s.icon} size={22} />
                            </div>
                            <div>
                                <div className="text-[13px] text-[#8a949c] mb-1">{s.label}</div>
                                <div className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.5px]">{s.value}</div>
                                <div className="text-[11.5px] text-[#5b656d] mt-1.5">{s.sub} <span className="text-[#22c55e]">›</span></div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* 메인 패널 */}
                <section className="bg-[#11161a] border border-white/[0.07] rounded-2xl overflow-hidden">
                    {/* 검색 + 필터 */}
                    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-[18px]">
                        <div className="flex items-center gap-2.5 flex-1 min-w-[220px] max-w-[420px] bg-[#0a0d0c] border border-white/[0.07] rounded-[10px] px-3.5 py-2.5 text-[#5b656d] focus-within:border-[#22c55e]/50">
                            <Icon name="search" size={18} />
                            <input
                                type="text"
                                placeholder="이름, 이메일 검색"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-[#e7ecef] text-[13.5px] placeholder:text-[#5b656d]"
                            />
                        </div>
                        <div className="flex gap-2.5 flex-wrap">
                            <FilterSelect label="전체 역할" />
                            <FilterSelect label="전체 플랜" />
                            <FilterSelect label="전체 상태" />
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                className="inline-flex items-center gap-[7px] bg-transparent text-[#8a949c] border border-white/[0.07] rounded-[10px] px-3.5 py-2.5 text-[13px] cursor-pointer hover:border-white/[0.12] hover:text-[#e7ecef] transition-colors"
                            >
                                <Icon name="refresh" size={16} />
                                <span>필터 초기화</span>
                            </button>
                        </div>
                    </div>

                    {/* 테이블 */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[880px]">
                            <thead>
                                <tr className="[&>th]:text-center [&>th]:text-xs [&>th]:font-semibold [&>th]:text-[#5b656d] [&>th]:px-3.5 [&>th]:py-3 [&>th]:border-t [&>th]:border-b [&>th]:border-white/[0.07] [&>th]:bg-white/[0.012] [&>th]:whitespace-nowrap">
                                    <th className="!w-11">
                                        <input type="checkbox" className={checkboxCls} checked={allChecked} onChange={toggleAll} aria-label="전체 선택" />
                                    </th>
                                    <th>사용자</th>
                                    <th>이메일</th>
                                    <th>권한</th>
                                    <th>질문 수</th>
                                    <th>업로드 문서 수</th>
                                    <th>최근 접속</th>
                                    <th className="!w-14 !text-center">권한 변경</th>
                                </tr>
                            </thead>
                            <tbody className="[&>tr>td]:px-3.5 [&>tr>td]:py-3.5 [&>tr>td]:border-b [&>tr>td]:border-white/[0.07] [&>tr>td]:text-[13.5px] [&>tr>td]:align-middle [&>tr>td]:whitespace-nowrap [&>tr>td]:text-center [&>tr:last-child>td]:border-b-0">
                                {filtered.map((u) => (
                                    <tr
                                        key={u.id}
                                        onClick={() => setDetailUser(u)}
                                        className={`cursor-pointer transition-colors ${selected.has(u.id) ? "bg-[#22c55e]/[0.05]" : "hover:bg-white/[0.025]"}`}
                                    >
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" className={checkboxCls} checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} aria-label={`${u.name} 선택`} />
                                        </td>
                                        <td className="!text-left">
                                            <div className="flex gap-[11px]">
                                                <Avatar name={u.name} status={u.status} />
                                                <div className="flex flex-col gap-px">
                                                    <span className="font-semibold text-[13.5px]">{u.name}</span>
                                                    <span className="text-xs text-[#5b656d]">{u.handle}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-[#8a949c]">{u.email}</td>
                                        <td><RoleBadge role={getRole(u)} /></td>
                                        <td className="font-semibold text-[#e7ecef]">{u.questions.toLocaleString()}</td>
                                        <td className="font-semibold text-[#e7ecef]">{u.docs.toLocaleString()}</td>
                                        <td>
                                            <span className="inline-flex items-center gap-2 text-[#8a949c]">
                                                <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${u.online ? "bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.18)]" : "bg-[#5b656d]"}`} />
                                                {u.lastSeen}
                                            </span>
                                        </td>
                                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                            {(() => {
                                                const current = getRole(u);
                                                const isAdmin = current === "ADMIN";
                                                return (
                                                    <button
                                                        type="button"
                                                        aria-label={isAdmin ? "강등" : "승급"}
                                                        onClick={(e) => toggleRole(e, u)}
                                                        className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-md border cursor-pointer transition-colors ${isAdmin
                                                            ? "bg-[#f87171]/[0.12] text-[#f87171] border-[#f87171]/25 hover:bg-[#f87171]/[0.22]"
                                                            : "bg-[#a78bfa]/[0.12] text-[#a78bfa] border-[#a78bfa]/25 hover:bg-[#a78bfa]/[0.22]"
                                                            }`}
                                                    >
                                                        {isAdmin ? "강등" : "승급"}
                                                    </button>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="!text-center text-[#5b656d] !py-10">검색 결과가 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* 푸터 / 페이지네이션 */}
                    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-t border-white/[0.07]">
                        <span className="text-[13px] text-[#8a949c]">전체 {total.toLocaleString()}명</span>
                        <div className="flex items-center gap-1.5">
                            <button type="button" aria-label="이전" onClick={() => setPage((p) => Math.max(1, p - 1))} className="min-w-8 h-8 px-2 rounded-lg text-[#8a949c] inline-flex items-center justify-center hover:bg-white/[0.06] hover:text-[#e7ecef] transition-colors">
                                <Icon name="chevron-left" size={16} />
                            </button>
                            {pages.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPage(p)}
                                    className={`min-w-8 h-8 px-2 rounded-lg text-[13px] inline-flex items-center justify-center transition-colors ${page === p ? "bg-[#22c55e] text-[#06210f] font-bold" : "text-[#8a949c] hover:bg-white/[0.06] hover:text-[#e7ecef]"
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                            <span className="text-[#5b656d] px-1">…</span>
                            <button
                                type="button"
                                onClick={() => setPage(125)}
                                className={`min-w-8 h-8 px-2 rounded-lg text-[13px] inline-flex items-center justify-center transition-colors ${page === 125 ? "bg-[#22c55e] text-[#06210f] font-bold" : "text-[#8a949c] hover:bg-white/[0.06] hover:text-[#e7ecef]"
                                    }`}
                            >
                                125
                            </button>
                            <button type="button" aria-label="다음" onClick={() => setPage((p) => p + 1)} className="min-w-8 h-8 px-2 rounded-lg text-[#8a949c] inline-flex items-center justify-center hover:bg-white/[0.06] hover:text-[#e7ecef] transition-colors">
                                <Icon name="chevron-right" size={16} />
                            </button>
                        </div>
                        <FilterSelect label="10 / 페이지" className="!min-w-0" />
                    </div>
                </section>
            </div>
            <UserDetailSidebar
                user={detailUser}
                open={!!detailUser}
                onClose={() => setDetailUser(null)}
                onResetPassword={() => { }}
                onSuspend={() => { }}
                onDelete={() => { }}
            />
            <MyPageDrawer open={myPageOpen} onClose={() => setMyPageOpen(false)} />
        </div>
    );
}
