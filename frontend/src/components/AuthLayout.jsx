import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BRAND } from "../data/mock.js";
import { IconSpark, IconSun, IconMoon } from "./Icons.jsx";

const FEATURES = [
  "Unity · UE5 공식 레퍼런스 통합 검색",
  "포스트모템 · 성능 최적화 사례 요약",
  "코드 식별자를 보존하는 정확한 답변",
];

// 좌측 브랜드 소개 + 우측 카드(children) 단독 레이아웃
export default function AuthLayout({ kicker, title, subtitle, children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("gamedocs_theme") ?? "mint");
  const [themeAnimKey, setThemeAnimKey] = useState(0);

  const toggleTheme = () => {
    const next = theme === "light" ? "mint" : "light";
    setTheme(next);
    setThemeAnimKey((k) => k + 1);
    localStorage.setItem("gamedocs_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <div className="gd-auth">
      {/* 우측 상단 테마 토글 */}
      <button
        onClick={toggleTheme}
        aria-label={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
        title={theme === "light" ? "다크 모드" : "라이트 모드"}
        style={{ position: "fixed", top: 16, right: 16, zIndex: 100, background: "transparent", border: "1px solid rgba(255,255,255,.16)", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--dim)", transition: "all .2s" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--mint)"; e.currentTarget.style.color = "var(--mint)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,.16)"; e.currentTarget.style.color = "var(--dim)"; }}
      >
        <span key={themeAnimKey} style={{ display: "flex", animation: "gdSpin 0.4s cubic-bezier(.4,0,.2,1)" }}>
          {theme === "light" ? <IconMoon width={16} height={16} /> : <IconSun width={16} height={16} />}
        </span>
      </button>
      <div className="gd-auth-glow" />

      {/* 좌측 브랜드 패널 */}
      <section className="gd-auth-brand">
        <Link to="/" className="gd-logo gd-auth-logo">
          {BRAND}<span className="ai">.ai</span>
        </Link>

        <div className="gd-auth-brand-body">
          <h2 className="gd-auth-headline">
            게임 개발 문서를<br />
            <span className="mint">검색하고 질문하는</span> 가장 빠른 방법
          </h2>
          <ul className="gd-auth-features">
            {FEATURES.map((f, i) => (
              <li key={i} style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                <span className="dot"><IconSpark width="11" height="11" /></span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="gd-auth-foot">© {new Date().getFullYear()} GameDocs.AI</p>
      </section>

      {/* 우측 카드 */}
      <section className="gd-auth-pane">
        <div className="gd-auth-card">
          <Link to="/" className="gd-logo gd-auth-mobilelogo">
            {BRAND}<span className="ai">.ai</span>
          </Link>
          {kicker && <div className="gd-auth-kicker">{kicker}</div>}
          <h1 className="gd-auth-title">{title}</h1>
          {subtitle && <p className="gd-auth-sub">{subtitle}</p>}
          {children}
        </div>
      </section>
    </div>
  );
}
