import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import SearchBar from "../components/SearchBar.jsx";
import Topbar from "../components/Topbar.jsx";
import { HERO, SUGGESTIONS } from "../data/mock.js";

export default function Landing() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { onMenu } = useOutletContext();

  const goChat = (q) => {
    const text = (q ?? query).trim();
    if (!text) return;
    navigate("/chat?q=" + encodeURIComponent(text));
  };

  return (
    <>
      <Topbar onMenu={onMenu} />
      <div className="gd-blob" />

      <header className="gd-hero">
        <h1 className="gd-title">
          <span className="l1">{HERO.titleLine1}</span>
          <span className="l2">{HERO.titleLine2}</span>
        </h1>
        <p className="gd-subtitle">{HERO.subtitle}</p>

        <div className="gd-search">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={() => goChat()}
            placeholder={HERO.placeholder}
            buttonLabel={HERO.searchLabel}
            variant="search"
          />

          <div className="gd-suggest">
            <span className="gd-suggest-label">{HERO.suggestLabel}</span>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="gd-chip" onClick={() => goChat(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>
    </>
  );
}
