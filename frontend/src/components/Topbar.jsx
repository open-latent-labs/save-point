import React from "react";
import { Link } from "react-router-dom";
import { IconMenu } from "./Icons.jsx";

export default function Topbar({ onMenu }) {
  return (
    <div className="gd-topbar">
      <button className="gd-hamburger" onClick={onMenu} aria-label="메뉴 열기">
        <IconMenu />
      </button>
      <div className="gd-topbar-spacer" />
      <Link className="gd-toplink" to="/docs">문서 위키</Link>
      <Link className="gd-toplink" to="/upload">업로드</Link>
      <Link className="gd-login" to="/login" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>로그인</Link>
    </div>
  );
}
