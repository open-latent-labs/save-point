import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { IconMenu, IconUser } from "./Icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Topbar({ onMenu, onProfile }) {
  const { logout, user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const navigate = useNavigate();

  // /auth/logout 호출로 서버 쿠키 삭제 후 로그인 페이지로 이동
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="gd-topbar">
      <button className="gd-hamburger" onClick={onMenu} aria-label="메뉴 열기">
        <IconMenu />
      </button>
      <div className="gd-topbar-spacer" />
      {!isSuperAdmin && <Link className="gd-toplink" to="/upload">업로드</Link>}
      <button className="gd-toplink" onClick={handleLogout} style={{ background: "none", border: "none", cursor: "pointer" }}>
        로그아웃
      </button>
      <button className="gd-profile-btn" onClick={onProfile} aria-label="마이페이지">
        <IconUser width={17} height={17} />
      </button>
    </div>
  );
}
