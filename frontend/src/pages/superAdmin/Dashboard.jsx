import React, { useState, useMemo, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import Topbar from "../../components/Topbar.jsx";
import UserDetailSidebar from "../../components/superAdmin/MyInformationSide.jsx";
import MyPageDrawer from "../../components/MyPageDrawer.jsx";
import { useUserRole } from "../../context/UserRoleContext.jsx";
import { allUserList, banUser, unbanUser, changeRole, dashboardNum } from "../../api/superAdmin.js";
import { usePresence, formatLastSeen } from "../../api/connect.js";

const STATS_TEMPLATE = [
    { key: "total", label: "전체 사용자", sub: "전체 가입 사용자", icon: "users", tone: "green" },
    { key: "active", label: "활성 사용자", sub: "최근 30일 접속", icon: "activity", tone: "teal" },
    { key: "admin", label: "관리자", sub: "전체 관리자 계정", icon: "shield", tone: "violet" },
    { key: "blocked", label: "정지 사용자", sub: "접근이 제한된 계정", icon: "ban", tone: "red" },
];

const STAT_TONES = {
    green: "bg-[#22c55e]/[0.13] text-[#34d399]",
    teal: "bg-[#2dd4bf]/[0.13] text-[#2dd4bf]",
    violet: "bg-[#a78bfa]/[0.14] text-[#a78bfa]",
    red: "bg-[#f87171]/[0.13] text-[#f87171]",
};

/* ---------- 접속 상태 셀 ---------- */
const PresenceCell = ({ userId, lastActiveAt, onlineIds }) => {
    const isOnline = onlineIds.has(userId);
    if (isOnline) {
        return (
            <div className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.7)] shrink-0" />
                <span className="text-[#22c55e] font-semibold text-[12.5px]">현재 활동 중</span>
            </div>
        );
    }
    const formatted = formatLastSeen(lastActiveAt);
    return (
        <div className="flex flex-col items-center gap-0.5">
            <div className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f87171] shrink-0" />
                <span className="text-[#b0bdc5] font-semibold text-[12.5px]">
                    {formatted != null ? `${formatted} 전에 활동` : "접속 기록 없음"}
                </span>
            </div>
        </div>
    );
};

/* ---------- 아이콘 ---------- */
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

/* ---------- 아바타 ---------- */
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

/* ---------- 셀렉트(필터) ---------- */
const FilterSelect = ({ label, options = [], value, onChange, className = "", lt }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const displayLabel = (options.find((o) => o.value === value)?.label) ?? label;

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`inline-flex items-center justify-between gap-2 border rounded-[10px] px-3.5 py-2 text-[13px] cursor-pointer min-w-[112px] transition-all duration-150 w-full ${lt
                        ? "bg-white text-[#6B7280] border-black/[0.10] hover:border-black/[0.20] hover:text-[#111827] shadow-sm"
                        : "bg-gradient-to-b from-[#151b20] to-[#11161a] text-[#b0bdc5] border-white/[0.28] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/[0.16] hover:text-[#c3ccd2]"
                    }`}
            >
                <span className={value ? (lt ? "text-[#111827]" : "text-[#c3ccd2]") : ""}>{displayLabel}</span>
                <Icon name="chevron-down" size={14} className={`opacity-50 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && options.length > 0 && (
                <div className={`absolute top-full mt-1.5 right-0 min-w-full border rounded-[10px] shadow-xl z-50 overflow-hidden py-1 ${lt ? "bg-white border-black/[0.10]" : "bg-[#151b20] border-white/[0.32]"
                    }`}>
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors whitespace-nowrap ${value === opt.value
                                    ? "text-[#22c55e] bg-[#22c55e]/[0.08]"
                                    : lt
                                        ? "text-[#6B7280] hover:text-[#111827] hover:bg-black/[0.04]"
                                        : "text-[#b0bdc5] hover:text-[#e7ecef] hover:bg-white/[0.04]"
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const mapUser = (u) => ({
    id: u.id,
    name: u.name,
    user_id: u.user_id,
    handle: "@" + u.user_id,
    email: u.email,
    role: u.role,
    ban: u.ban,
    questions: u.ask_count ?? 0,
    docs: u.upload_file_count ?? 0,
    joinedAt: u.created_at ? u.created_at.slice(0, 10) : "-",
    lastActiveAt: u.last_active_at ?? null,
});

export default function UserManagement() {
    const ctx = useOutletContext();
    const onMenu = ctx?.onMenu ?? (() => { });
    const sbVisible = ctx?.sbVisible ?? false;
    const [myPageOpen, setMyPageOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [detailUser, setDetailUser] = useState(null);
    const [page, setPage] = useState(1);
    const [apiUsers, setApiUsers] = useState([]);
    const [apiTotal, setApiTotal] = useState(0);
    const [apiTotalPages, setApiTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [suspendTarget, setSuspendTarget] = useState(null);
    const [roleTarget, setRoleTarget] = useState(null);
    const [statsData, setStatsData] = useState(STATS_TEMPLATE.map((s) => ({ ...s, value: "-" })));
    const { getRole, updateRole } = useUserRole();
    const onlineIds = usePresence();

    const [theme, setTheme] = useState(() => localStorage.getItem("gamedocs_theme") ?? "mint");
    const lt = theme === "light";

    useEffect(() => {
        const sync = () => setTheme(localStorage.getItem("gamedocs_theme") ?? "mint");
        window.addEventListener("gamedocs:theme", sync);
        return () => window.removeEventListener("gamedocs:theme", sync);
    }, []);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const data = await dashboardNum();
                setStatsData(STATS_TEMPLATE.map((s) => ({ ...s, value: data[s.key] ?? "-" })));
            } catch (e) { console.error(e); }
        };
        fetchDashboard();
    }, [refreshKey]);

    useEffect(() => {
        let cancelled = false;
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const data = await allUserList(page, 8, { role: roleFilter, is_active: statusFilter });
                if (!cancelled) {
                    setApiUsers(data.users.map(mapUser));
                    setApiTotal(data.total);
                    setApiTotalPages(data.total_pages);
                }
            } catch (e) {
                if (!cancelled) console.error(e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchUsers();
        const autoRefresh = setInterval(() => { if (!cancelled) setRefreshKey((k) => k + 1); }, 60_000);
        return () => { cancelled = true; clearInterval(autoRefresh); };
    }, [page, roleFilter, statusFilter, refreshKey]);

    const toggleRole = (e, user) => {
        e.stopPropagation();
        setRoleTarget(user);
    };

    const executeRoleChange = async () => {
        if (!roleTarget) return;
        const current = getRole(roleTarget);
        const next = current === "ADMIN" ? "USER" : "ADMIN";
        try {
            await changeRole({ id: roleTarget.id, role: current });
            updateRole(roleTarget.id, next);
        } catch (err) { console.error(err); }
        finally { setRoleTarget(null); }
    };

    useEffect(() => {
        if (!roleTarget) return;
        const handler = (e) => { if (e.key === "Escape") setRoleTarget(null); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [roleTarget]);

    const toggleSuspend = (e, user) => {
        e.stopPropagation();
        setSuspendTarget(user);
    };

    useEffect(() => {
        if (!suspendTarget) return;
        const handler = (e) => { if (e.key === "Escape") setSuspendTarget(null); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [suspendTarget]);

    const executeSuspend = async () => {
        if (!suspendTarget) return;
        const isBanned = suspendTarget.ban === "BAN";
        try {
            if (isBanned) { await unbanUser({ id: suspendTarget.id }); }
            else { await banUser({ id: suspendTarget.id }); }
            setRefreshKey((k) => k + 1);
        } catch (err) { console.error(err); }
        finally { setSuspendTarget(null); }
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return apiUsers;
        return apiUsers.filter((u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.handle.toLowerCase().includes(q)
        );
    }, [apiUsers, query]);


    const visiblePages = useMemo(() => {
        const delta = 2;
        const left = Math.max(1, page - delta);
        const right = Math.min(apiTotalPages, page + delta);
        return Array.from({ length: right - left + 1 }, (_, i) => left + i);
    }, [page, apiTotalPages]);

    const roleBadgeCls = (role) => {
        if (role === "ADMIN") return `${BADGE_BASE} bg-[#a78bfa]/[0.15] text-[#a78bfa] border border-[#a78bfa]/25`;
        return `${BADGE_BASE} ${lt ? "bg-black/5 text-[#6B7280] border border-black/[0.10]" : "bg-white/5 text-[#b0bdc5] border border-white/10"}`;
    };

    return (
        <div className={`w-full min-h-full font-sans [font-feature-settings:'tnum'] ${lt ? "bg-[#F4F6F5] text-[#111827]" : "bg-[#0a0d0c] text-[#e7ecef]"}`}>
            <Topbar onMenu={onMenu} onProfile={() => setMyPageOpen(true)} hideBell />
            <div className={`transition-[padding-left] duration-[280ms] [transition-timing-function:cubic-bezier(0.2,0.7,0.2,1)] pl-4 pr-4 sm:pr-8 py-[18px] sm:pt-7 sm:pb-10 ${sbVisible ? 'min-[861px]:pl-[264px]' : ''}`}>

                {/* 헤더 */}
                <header className="flex flex-col sm:flex-row sm:justify-between items-start gap-6 mb-6">
                    <div>
                        <h1 className="text-[26px] font-extrabold m-0 mb-1.5 tracking-[-0.5px]">사용자 관리</h1>
                        <p className={`text-[13.5px] m-0 ${lt ? "text-[#6B7280]" : "text-[#b0bdc5]"}`}>플랫폼에 등록된 사용자 정보를 관리하고 역할과 권한을 설정할 수 있습니다.</p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-3.5">
                        <nav className={`text-[13px] flex gap-2 items-center ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>
                            <span>홈</span>
                            <span className="opacity-50">/</span>
                            <span className={lt ? "text-[#6B7280]" : "text-[#b0bdc5]"}>사용자 관리</span>
                        </nav>
                    </div>
                </header>

                {/* 통계 카드 */}
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-[22px]">
                    {statsData.map((s) => (
                        <div
                            key={s.key}
                            className={`flex items-center gap-4 border rounded-2xl px-[22px] py-5 transition-[border-color,transform] hover:-translate-y-0.5 ${lt
                                    ? "bg-white border-black/[0.07] hover:border-black/[0.14] shadow-sm"
                                    : "bg-gradient-to-b from-[#151b20] to-[#11161a] border-white/[0.28] hover:border-white/[0.45]"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-[13px] flex items-center justify-center shrink-0 ${STAT_TONES[s.tone]}`}>
                                <Icon name={s.icon} size={22} />
                            </div>
                            <div>
                                <div className={`text-[13px] mb-1 ${lt ? "text-[#6B7280]" : "text-[#b0bdc5]"}`}>{s.label}</div>
                                <div className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.5px]">{s.value}</div>
                                <div className={`text-[11.5px] mt-1.5 ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>{s.sub} <span className="text-[#22c55e]">›</span></div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* 메인 패널 */}
                <section className={`border rounded-2xl overflow-hidden ${lt ? "bg-white border-black/[0.07] shadow-sm" : "bg-[#11161a] border-white/[0.28]"}`}>
                    {/* 검색 + 필터 */}
                    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-[18px]">
                        <div className={`flex items-center gap-2.5 flex-1 min-w-[220px] max-w-[420px] border rounded-[10px] px-3.5 py-2.5 focus-within:border-[#22c55e]/50 ${lt ? "bg-[#F9FAFB] border-black/[0.08] text-[#9CA3AF]" : "bg-[#0a0d0c] border-white/[0.28] text-[#b0bdc5]"
                            }`}>
                            <Icon name="search" size={18} />
                            <input
                                type="text"
                                placeholder="이름, 이메일 검색"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className={`flex-1 bg-transparent border-none outline-none text-[13.5px] placeholder:opacity-60 ${lt ? "text-[#111827]" : "text-[#e7ecef]"}`}
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <FilterSelect lt={lt} label="권한" options={[{ value: "", label: "전체" }, { value: "USER", label: "USER" }, { value: "ADMIN", label: "ADMIN" }]} value={roleFilter} onChange={(v) => { setRoleFilter(v); setPage(1); }} />
                            <FilterSelect lt={lt} label="계정 상태" options={[{ value: "", label: "전체" }, { value: "true", label: "활성 계정" }, { value: "false", label: "비활성 계정" }]} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} />
                        </div>
                    </div>

                    {/* 테이블 */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[1020px]">
                            <thead>
                                <tr className={`[&>th]:text-center [&>th]:text-xs [&>th]:font-semibold [&>th]:px-3.5 [&>th]:py-3 [&>th]:whitespace-nowrap ${lt
                                        ? "[&>th]:text-[#9CA3AF] [&>th]:border-t [&>th]:border-b [&>th]:border-black/[0.07] [&>th]:bg-black/[0.02]"
                                        : "[&>th]:text-[#b0bdc5] [&>th]:border-t [&>th]:border-b [&>th]:border-white/[0.28] [&>th]:bg-white/[0.012]"
                                    }`}>
                                    <th>사용자</th><th>이메일</th><th>권한</th>
                                    <th>질문 수</th><th>업로드 문서 수</th>
                                    <th>활동 상태</th><th>접속 상태</th>
                                </tr>
                            </thead>
                            <tbody className={`[&>tr>td]:px-3.5 [&>tr>td]:py-3.5 [&>tr>td]:text-[13.5px] [&>tr>td]:align-middle [&>tr>td]:whitespace-nowrap [&>tr>td]:text-center [&>tr:last-child>td]:border-b-0 ${lt ? "[&>tr>td]:border-b [&>tr>td]:border-black/[0.06]" : "[&>tr>td]:border-b [&>tr>td]:border-white/[0.28]"
                                }`}>
                                {filtered.map((u) => (
                                    <tr
                                        key={u.id}
                                        onClick={() => setDetailUser(u)}
                                        className={`cursor-pointer transition-colors ${lt ? "hover:bg-black/[0.03]" : "hover:bg-white/[0.025]"}`}
                                    >
                                        <td className="!text-left">
                                            <div className="flex gap-[11px]">
                                                <Avatar name={u.name} status={u.status} />
                                                <div className="flex flex-col gap-px">
                                                    <span className="font-semibold text-[13.5px]">{u.name}</span>
                                                    <span className={`text-xs ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>{u.user_id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={lt ? "text-[#6B7280]" : "text-[#b0bdc5]"}>{u.email}</td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <button type="button" onClick={(e) => toggleRole(e, u)} title="클릭하여 권한 변경" className={`${roleBadgeCls(getRole(u))} cursor-pointer hover:brightness-125 transition-all`}>
                                                {getRole(u)}
                                            </button>
                                        </td>
                                        <td className="font-semibold">{u.questions.toLocaleString()}</td>
                                        <td className="font-semibold">{u.docs.toLocaleString()}</td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            {u.ban === "BAN" ? (
                                                <button type="button" onClick={(e) => toggleSuspend(e, u)}
                                                    className="text-[11.5px] font-semibold px-2.5 py-1 rounded-md border transition-colors bg-[#22c55e]/[0.12] text-[#22c55e] border-[#22c55e]/25 cursor-pointer hover:bg-[#22c55e]/[0.22]">
                                                    활동 재개
                                                </button>
                                            ) : (
                                                <button type="button" onClick={(e) => toggleSuspend(e, u)}
                                                    className="text-[11.5px] font-semibold px-2.5 py-1 rounded-md border transition-colors bg-[#fb923c]/[0.12] text-[#fb923c] border-[#fb923c]/25 cursor-pointer hover:bg-[#fb923c]/[0.22]">
                                                    활동 정지
                                                </button>
                                            )}
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <PresenceCell userId={u.id} lastActiveAt={u.lastActiveAt} onlineIds={onlineIds} />
                                        </td>
                                    </tr>
                                ))}
                                {loading && (
                                    <tr><td colSpan={7} className={`!text-center !py-10 ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>불러오는 중...</td></tr>
                                )}
                                {!loading && filtered.length === 0 && (
                                    <tr><td colSpan={7} className={`!text-center !py-10 ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>검색 결과가 없습니다.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* 푸터 / 페이지네이션 */}
                    <div className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-t ${lt ? "border-black/[0.07]" : "border-white/[0.28]"}`}>
                        <span className={`text-[13px] ${lt ? "text-[#6B7280]" : "text-[#b0bdc5]"}`}>전체 {apiTotal.toLocaleString()}명</span>
                        <div className="flex items-center gap-1.5">
                            <button type="button" aria-label="이전" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                className={`min-w-8 h-8 px-2 rounded-lg inline-flex items-center justify-center transition-colors disabled:opacity-30 ${lt ? "text-[#6B7280] hover:bg-black/[0.06] hover:text-[#111827]" : "text-[#b0bdc5] hover:bg-white/[0.06] hover:text-[#e7ecef]"}`}>
                                <Icon name="chevron-left" size={16} />
                            </button>
                            {visiblePages[0] > 1 && (
                                <>
                                    <button type="button" onClick={() => setPage(1)}
                                        className={`min-w-8 h-8 px-2 rounded-lg text-[13px] inline-flex items-center justify-center transition-colors ${page === 1 ? "bg-[#22c55e] text-[#06210f] font-bold" : lt ? "text-[#6B7280] hover:bg-black/[0.06] hover:text-[#111827]" : "text-[#b0bdc5] hover:bg-white/[0.06] hover:text-[#e7ecef]"}`}>1</button>
                                    {visiblePages[0] > 2 && <span className={`px-1 ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>…</span>}
                                </>
                            )}
                            {visiblePages.map((p) => (
                                <button key={p} type="button" onClick={() => setPage(p)}
                                    className={`min-w-8 h-8 px-2 rounded-lg text-[13px] inline-flex items-center justify-center transition-colors ${page === p ? "bg-[#22c55e] text-[#06210f] font-bold" : lt ? "text-[#6B7280] hover:bg-black/[0.06] hover:text-[#111827]" : "text-[#b0bdc5] hover:bg-white/[0.06] hover:text-[#e7ecef]"}`}>{p}</button>
                            ))}
                            {visiblePages[visiblePages.length - 1] < apiTotalPages && (
                                <>
                                    {visiblePages[visiblePages.length - 1] < apiTotalPages - 1 && <span className={`px-1 ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>…</span>}
                                    <button type="button" onClick={() => setPage(apiTotalPages)}
                                        className={`min-w-8 h-8 px-2 rounded-lg text-[13px] inline-flex items-center justify-center transition-colors ${page === apiTotalPages ? "bg-[#22c55e] text-[#06210f] font-bold" : lt ? "text-[#6B7280] hover:bg-black/[0.06] hover:text-[#111827]" : "text-[#b0bdc5] hover:bg-white/[0.06] hover:text-[#e7ecef]"}`}>{apiTotalPages}</button>
                                </>
                            )}
                            <button type="button" aria-label="다음" onClick={() => setPage((p) => Math.min(apiTotalPages, p + 1))} disabled={page === apiTotalPages}
                                className={`min-w-8 h-8 px-2 rounded-lg inline-flex items-center justify-center transition-colors disabled:opacity-30 ${lt ? "text-[#6B7280] hover:bg-black/[0.06] hover:text-[#111827]" : "text-[#b0bdc5] hover:bg-white/[0.06] hover:text-[#e7ecef]"}`}>
                                <Icon name="chevron-right" size={16} />
                            </button>
                        </div>
                        <span className={`text-[13px] ${lt ? "text-[#9CA3AF]" : "text-[#b0bdc5]"}`}>{page} / {apiTotalPages} 페이지</span>
                    </div>
                </section>
            </div>

            <UserDetailSidebar
                user={detailUser}
                open={!!detailUser}
                onClose={() => setDetailUser(null)}
                onlineIds={onlineIds}
                lt={lt}
                onResetPassword={() => { }}
                onSuspend={async (u) => { await banUser({ id: u.id }); setRefreshKey((k) => k + 1); }}
                onUnsuspend={async (u) => { await unbanUser({ id: u.id }); setRefreshKey((k) => k + 1); }}
                onDelete={() => { }}
            />
            <MyPageDrawer open={myPageOpen} onClose={() => setMyPageOpen(false)} />

            {/* 활동 정지 / 재개 확인 모달 */}
            {suspendTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                    <div className={`rounded-2xl p-6 w-[320px] shadow-2xl ${lt ? "bg-white border border-black/[0.08]" : "bg-[#11161a] border border-white/[0.08]"}`}>
                        <h3 className={`text-[15px] font-bold mb-2 ${lt ? "text-[#111827]" : "text-[#e7ecef]"}`}>
                            {suspendTarget.ban === "BAN" ? "활동 재개" : "활동 정지"}
                        </h3>
                        <p className={`text-[13px] leading-relaxed ${lt ? "text-[#6B7280]" : "text-[#8a949c]"}`}>
                            <span className="font-semibold">{suspendTarget.name}</span> 사용자를{" "}
                            {suspendTarget.ban === "BAN" ? "정지 해제하시겠습니까?" : "정지하시겠습니까?"}
                        </p>
                        <div className="flex gap-2 mt-5">
                            <button
                                type="button"
                                onClick={() => setSuspendTarget(null)}
                                className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors ${lt ? "bg-black/[0.05] text-[#374151] hover:bg-black/[0.09]" : "bg-white/[0.06] text-[#c3ccd2] hover:bg-white/[0.10]"}`}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={executeSuspend}
                                className="flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors bg-[#22c55e]/[0.12] text-[#34d399] hover:bg-[#22c55e]/[0.22]"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 권한 변경 확인 모달 */}
            {roleTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                    <div className={`rounded-2xl p-6 w-[320px] shadow-2xl ${lt ? "bg-white border border-black/[0.08]" : "bg-[#11161a] border border-white/[0.08]"}`}>
                        <h3 className={`text-[15px] font-bold mb-2 ${lt ? "text-[#111827]" : "text-[#e7ecef]"}`}>
                            권한 변경
                        </h3>
                        <p className={`text-[13px] leading-relaxed ${lt ? "text-[#6B7280]" : "text-[#8a949c]"}`}>
                            <span className="font-semibold">{roleTarget.name}</span> 사용자의 권한을{" "}
                            <span className={`font-semibold ${getRole(roleTarget) === "ADMIN" ? "text-amber-400" : "text-[#22c55e]"}`}>
                                {getRole(roleTarget) === "ADMIN" ? "USER" : "ADMIN"}
                            </span>
                            으로 변경하시겠습니까?
                        </p>
                        <div className="flex gap-2 mt-5">
                            <button
                                type="button"
                                onClick={() => setRoleTarget(null)}
                                className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors ${lt ? "bg-black/[0.05] text-[#374151] hover:bg-black/[0.09]" : "bg-white/[0.06] text-[#c3ccd2] hover:bg-white/[0.10]"}`}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={executeRoleChange}
                                className="flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-colors bg-[#22c55e]/[0.12] text-[#34d399] hover:bg-[#22c55e]/[0.22]"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
