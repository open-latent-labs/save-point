import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IconMenu, IconUser, IconBell, IconSun, IconMoon } from "./Icons.jsx";
import { notification_list, notification_count, notification_read } from "../api/notification.js";

export default function Topbar({ onMenu, onProfile, hideBell = false }) {
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const [theme, setTheme] = useState(() => localStorage.getItem("gamedocs_theme") ?? "mint");
  const [themeAnimKey, setThemeAnimKey] = useState(0);

  const toggleTheme = () => {
    const next = theme === "light" ? "mint" : "light";
    setTheme(next);
    setThemeAnimKey((k) => k + 1);
    localStorage.setItem("gamedocs_theme", next);
    document.documentElement.setAttribute("data-theme", next);
    window.dispatchEvent(new Event("gamedocs:theme"));

    const cur = localStorage.getItem("gamedocs_anim") ?? "1";
    const nextAnim = cur === "1" ? "2" : cur === "2" ? "3" : "1";
    localStorage.setItem("gamedocs_anim", nextAnim);
    window.dispatchEvent(new Event("gamedocs:anim"));
  };

  useEffect(() => {
    const sync = () => setTheme(localStorage.getItem("gamedocs_theme") ?? "mint");
    window.addEventListener("gamedocs:theme", sync);
    return () => window.removeEventListener("gamedocs:theme", sync);
  }, []);

  useEffect(() => {
    if (hideBell) return;
    notification_count().then(count => setUnreadCount(count ?? 0)).catch(() => {});
  }, [hideBell]);

  const handleBellClick = async () => {
    if (!notifOpen) {
      setNotifLoading(true);
      try {
        const data = await notification_list();
        setNotifications(data.items || []);
      } catch {
        setNotifications([]);
      } finally {
        setNotifLoading(false);
      }
    }
    setNotifOpen(prev => !prev);
  };

  useEffect(() => {
    if (!notifOpen) return;
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [notifOpen]);

  const handleNotifClick = (notifId, documentId, isRead) => {
    setNotifOpen(false);
    if (!isRead) {
      notification_read(notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    navigate(`/docs/${documentId}`);
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="gd-topbar">
      <button className="gd-hamburger" onClick={onMenu} aria-label="메뉴 열기">
        <IconMenu />
      </button>

      {/* 테마 토글 */}
      <button
        onClick={toggleTheme}
        aria-label={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
        title={theme === "light" ? "다크 모드" : "라이트 모드"}
        className="relative inline-flex items-center justify-center w-[34px] h-[34px] rounded-full border border-white/[.16] bg-transparent text-[var(--dim)] cursor-pointer transition-all duration-200 hover:border-[var(--mint)] hover:text-[var(--mint)] hover:bg-[rgba(54,224,161,.08)] shrink-0"
      >
        <span key={themeAnimKey} style={{ display: "flex", animation: "gdSpin 0.4s cubic-bezier(.4,0,.2,1)" }}>
          {theme === "light" ? <IconMoon width={16} height={16} /> : <IconSun width={16} height={16} />}
        </span>
      </button>

      {/* 알림 벨 */}
      {!hideBell && (
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            aria-label="알림"
            className="relative inline-flex items-center justify-center w-[34px] h-[34px] rounded-full border border-white/[.16] bg-transparent text-[var(--dim)] cursor-pointer transition-all duration-200 hover:border-[var(--mint)] hover:text-[var(--mint)] hover:bg-[rgba(54,224,161,.08)] shrink-0"
          >
            <IconBell width={17} height={17} />
            {unreadCount > 0 && (
              <span className="absolute -bottom-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#E08A8A] text-white font-mono text-[10px] font-bold flex items-center justify-center leading-none pointer-events-none">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute top-[calc(100%+10px)] left-0 z-[100] w-[300px] bg-[var(--elev)] border border-white/[.16] rounded-[14px] shadow-[0_16px_48px_-8px_rgba(0,0,0,.7)] overflow-hidden animate-[gdSlide_.2s_cubic-bezier(.2,.7,.2,1)_both]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[.08]">
                <span className="text-[13px] font-semibold text-[var(--text)] tracking-[-0.01em]">알림</span>
                {unreadCount > 0 && (
                  <span className="font-mono text-[10.5px] text-[#E08A8A]">{unreadCount}개 읽지 않음</span>
                )}
              </div>

              {notifLoading ? (
                <p className="py-7 text-center text-[13px] text-[var(--faint)]">불러오는 중...</p>
              ) : notifications.filter(n => !n.is_read).length === 0 ? (
                <p className="py-7 text-center text-[13px] text-[var(--faint)]">알림이 없습니다</p>
              ) : (
                <ul className="list-none m-0 p-1 max-h-[320px] overflow-y-auto [scrollbar-width:thin]">
                  {notifications.filter(n => !n.is_read).map(n => (
                    <li
                      key={n.id}
                      onClick={() => handleNotifClick(n.id, n.document_id, n.is_read)}
                      className="flex items-start gap-[10px] px-4 py-[10px] hover:bg-white/[.04] transition-colors duration-150 cursor-pointer"
                    >
                      <span
                        className={`shrink-0 w-[6px] h-[6px] rounded-full mt-[5px] ${n.is_read ? "bg-white/[.16]" : "bg-[var(--mint)]"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`m-0 mb-[3px] text-[12.5px] leading-[1.5] break-keep ${n.is_read ? "text-[var(--dim)]" : "text-[var(--text)]"}`}>
                          {n.message}
                        </p>
                        <span className="font-mono text-[10.5px] text-[var(--faint)]">{formatDate(n.created_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="gd-topbar-spacer" />
      <button className="gd-profile-btn" onClick={onProfile} aria-label="마이페이지">
        <IconUser width={17} height={17} />
      </button>
    </div>
  );
}
