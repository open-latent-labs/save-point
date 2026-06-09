import React, { useState, useMemo, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import Topbar from "../../components/Topbar.jsx";
import UserDetailSidebar from "../../components/superAdmin/MyInformationSide.jsx";
import MyPageDrawer from "../../components/MyPageDrawer.jsx";
import { useUserRole } from "../../context/UserRoleContext.jsx";
import { allUserList, banUser, unbanUser, changeRole, dashboardNum } from "../../api/superAdmin.js";



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
const FilterSelect = ({ label, options = [], value, onChange, className = "" }) => {
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
                className="inline-flex items-center justify-between gap-2 bg-gradient-to-b from-[#151b20] to-[#11161a] text-[#8a949c] border border-white/[0.08] rounded-[10px] px-3.5 py-2 text-[13px] cursor-pointer min-w-[112px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/[0.16] hover:text-[#c3ccd2] transition-all duration-150 w-full"
            >
                <span className={value ? "text-[#c3ccd2]" : ""}>{displayLabel}</span>
                <Icon name="chevron-down" size={14} className={`opacity-50 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && options.length > 0 && (
                <div className="absolute top-full mt-1.5 right-0 min-w-full bg-[#151b20] border border-white/[0.1] rounded-[10px] shadow-xl z-50 overflow-hidden py-1">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors whitespace-nowrap ${value === opt.value ? "text-[#22c55e] bg-[#22c55e]/[0.08]" : "text-[#8a949c] hover:text-[#e7ecef] hover:bg-white/[0.04]"}`}
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
    questions: u.ask_count ?? 0,
    docs: u.upload_file_count ?? 0,
    favorites: 0,
    bookmarks: 0,
    lastSeen: "-",
    lastSeenAt: "-",
    lastSeenAgo: "-",
    joinedAt: u.created_at ? u.created_at.slice(0, 10) : "-",
    online: false,
});

export default function UserManagement() {
    const ctx = useOutletContext();
    const onMenu = ctx?.onMenu ?? (() => { });
    const sbVisible = ctx?.sbVisible ?? false;
    const [myPageOpen, setMyPageOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [selected, setSelected] = useState(() => new Set());
    const [suspendedUsers, setSuspendedUsers] = useState(() => new Set());
    const [detailUser, setDetailUser] = useState(null);
    const [page, setPage] = useState(1);
    const [apiUsers, setApiUsers] = useState([]);
    const [apiTotal, setApiTotal] = useState(0);
    const [apiTotalPages, setApiTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [statsData, setStatsData] = useState(STATS_TEMPLATE.map((s) => ({ ...s, value: "-" })));
    const { getRole, updateRole } = useUserRole();

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const data = await dashboardNum();
                setStatsData(STATS_TEMPLATE.map((s) => ({ ...s, value: data[s.key] ?? "-" })));
            } catch (e) {
                console.error(e);
            }
        };
        fetchDashboard();
    }, []);

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
        return () => { cancelled = true; };
    }, [page, roleFilter, statusFilter]);

    const toggleRole = async (e, user) => {
        e.stopPropagation();
        const current = getRole(user);
        const next = current === "ADMIN" ? "USER" : "ADMIN";
        try {
            await changeRole({ id: user.id, role: current });
            updateRole(user.id, next);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleSuspend = async (e, user) => {
        e.stopPropagation();
        const isSuspended = suspendedUsers.has(user.id);
        try {
            if (isSuspended) {
                await unbanUser({ id: user.id, ban: "UNBAN" });
                setSuspendedUsers((prev) => {
                    const next = new Set(prev);
                    next.delete(user.id);
                    return next;
                });
            } else {
                await banUser({ id: user.id, ban: "BAN" });
                setSuspendedUsers((prev) => {
                    const next = new Set(prev);
                    next.add(user.id);
                    return next;
                });
            }
        } catch (err) {
            console.error(err);
        }
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

    const visiblePages = useMemo(() => {
        const delta = 2;
        const left = Math.max(1, page - delta);
        const right = Math.min(apiTotalPages, page + delta);
        return Array.from({ length: right - left + 1 }, (_, i) => left + i);
    }, [page, apiTotalPages]);

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
                    {statsData.map((s) => (
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
                        <div className="flex gap-2 flex-wrap">
                            <FilterSelect
                                label="권한"
                                options={[
                                    { value: "", label: "전체" },
                                    { value: "USER", label: "USER" },
                                    { value: "ADMIN", label: "ADMIN" },
                                ]}
                                value={roleFilter}
                                onChange={(v) => { setRoleFilter(v); setPage(1); }}
                            />
                            <FilterSelect
                                label="상태"
                                options={[
                                    { value: "", label: "전체" },
                                    { value: "true", label: "접속 중" },
                                    { value: "false", label: "오프라인" },
                                ]}
                                value={statusFilter}
                                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                            />
                        </div>
                    </div>

                    {/* 테이블 */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[1020px]">
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
                                    <th>활동 상태</th>
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
                                                    <span className="text-xs text-[#5b656d]">{u.user_id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-[#8a949c]">{u.email}</td>
                                        <td><RoleBadge role={getRole(u)} /></td>
                                        <td className="font-semibold text-[#e7ecef]">{u.questions.toLocaleString()}</td>
                                        <td className="font-semibold text-[#e7ecef]">{u.docs.toLocaleString()}</td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            {(() => {
                                                const isSuspended = suspendedUsers.has(u.id);
                                                return (
                                                    <div className="inline-flex gap-1.5">
                                                        <button
                                                            type="button"
                                                            aria-label="활동 정지"
                                                            onClick={(e) => { if (!isSuspended) toggleSuspend(e, u); }}
                                                            disabled={isSuspended}
                                                            className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-md border transition-colors ${!isSuspended
                                                                ? "bg-[#fb923c]/[0.12] text-[#fb923c] border-[#fb923c]/25 cursor-pointer hover:bg-[#fb923c]/[0.22]"
                                                                : "bg-white/[0.03] text-[#3a4248] border-white/[0.05] cursor-not-allowed"
                                                                }`}
                                                        >
                                                            활동 정지
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label="활동 재개"
                                                            onClick={(e) => { if (isSuspended) toggleSuspend(e, u); }}
                                                            disabled={!isSuspended}
                                                            className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-md border transition-colors ${isSuspended
                                                                ? "bg-[#22c55e]/[0.12] text-[#22c55e] border-[#22c55e]/25 cursor-pointer hover:bg-[#22c55e]/[0.22]"
                                                                : "bg-white/[0.03] text-[#3a4248] border-white/[0.05] cursor-not-allowed"
                                                                }`}
                                                        >
                                                            활동 재개
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="text-[#8a949c]">{u.lastSeen}</td>
                                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                            {getRole(u) !== "ADMIN" ? (
                                                <button
                                                    type="button"
                                                    aria-label="승급"
                                                    onClick={(e) => toggleRole(e, u)}
                                                    className="text-[11.5px] font-semibold px-2.5 py-1 rounded-md border transition-colors bg-[#a78bfa]/[0.12] text-[#a78bfa] border-[#a78bfa]/25 cursor-pointer hover:bg-[#a78bfa]/[0.22]"
                                                >
                                                    승급
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    aria-label="강등"
                                                    onClick={(e) => toggleRole(e, u)}
                                                    className="text-[11.5px] font-semibold px-2.5 py-1 rounded-md border transition-colors bg-[#f87171]/[0.12] text-[#f87171] border-[#f87171]/25 cursor-pointer hover:bg-[#f87171]/[0.22]"
                                                >
                                                    강등
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {loading && (
                                    <tr>
                                        <td colSpan={10} className="!text-center text-[#5b656d] !py-10">불러오는 중...</td>
                                    </tr>
                                )}
                                {!loading && filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="!text-center text-[#5b656d] !py-10">검색 결과가 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* 푸터 / 페이지네이션 */}
                    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-t border-white/[0.07]">
                        <span className="text-[13px] text-[#8a949c]">전체 {apiTotal.toLocaleString()}명</span>
                        <div className="flex items-center gap-1.5">
                            <button type="button" aria-label="이전" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="min-w-8 h-8 px-2 rounded-lg text-[#8a949c] inline-flex items-center justify-center hover:bg-white/[0.06] hover:text-[#e7ecef] transition-colors disabled:opacity-30">
                                <Icon name="chevron-left" size={16} />
                            </button>
                            {visiblePages[0] > 1 && (
                                <>
                                    <button type="button" onClick={() => setPage(1)} className={`min-w-8 h-8 px-2 rounded-lg text-[13px] inline-flex items-center justify-center transition-colors ${page === 1 ? "bg-[#22c55e] text-[#06210f] font-bold" : "text-[#8a949c] hover:bg-white/[0.06] hover:text-[#e7ecef]"}`}>1</button>
                                    {visiblePages[0] > 2 && <span className="text-[#5b656d] px-1">…</span>}
                                </>
                            )}
                            {visiblePages.map((p) => (
                                <button key={p} type="button" onClick={() => setPage(p)} className={`min-w-8 h-8 px-2 rounded-lg text-[13px] inline-flex items-center justify-center transition-colors ${page === p ? "bg-[#22c55e] text-[#06210f] font-bold" : "text-[#8a949c] hover:bg-white/[0.06] hover:text-[#e7ecef]"}`}>{p}</button>
                            ))}
                            {visiblePages[visiblePages.length - 1] < apiTotalPages && (
                                <>
                                    {visiblePages[visiblePages.length - 1] < apiTotalPages - 1 && <span className="text-[#5b656d] px-1">…</span>}
                                    <button type="button" onClick={() => setPage(apiTotalPages)} className={`min-w-8 h-8 px-2 rounded-lg text-[13px] inline-flex items-center justify-center transition-colors ${page === apiTotalPages ? "bg-[#22c55e] text-[#06210f] font-bold" : "text-[#8a949c] hover:bg-white/[0.06] hover:text-[#e7ecef]"}`}>{apiTotalPages}</button>
                                </>
                            )}
                            <button type="button" aria-label="다음" onClick={() => setPage((p) => Math.min(apiTotalPages, p + 1))} disabled={page === apiTotalPages} className="min-w-8 h-8 px-2 rounded-lg text-[#8a949c] inline-flex items-center justify-center hover:bg-white/[0.06] hover:text-[#e7ecef] transition-colors disabled:opacity-30">
                                <Icon name="chevron-right" size={16} />
                            </button>
                        </div>
                        <span className="text-[13px] text-[#5b656d]">{page} / {apiTotalPages} 페이지</span>
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
