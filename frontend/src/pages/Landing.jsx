import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import SearchBar from "../components/SearchBar.jsx";
import Topbar from "../components/Topbar.jsx";
import { HERO, SUGGESTIONS } from "../data/mock.js";

const ease = [0.22, 1, 0.36, 1];

export default function Landing() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { onMenu, onProfile } = useOutletContext();

  const goChat = (q) => {
    const text = (q ?? query).trim();
    if (!text) return;
    navigate("/chat?q=" + encodeURIComponent(text));
  };

  return (
    <>
      <Topbar onMenu={onMenu} onProfile={onProfile} />
      <div className="gd-landing-body">

        {/* 배경 blob — 느리게 맥동 */}
        <motion.div
          className="gd-blob"
          animate={{ scale: [1, 1.18, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <header className="gd-hero">

          {/* 타이틀 — blur + fade up */}
          <motion.h1
            className="gd-title"
            style={{ animation: "none" }}
            initial={{ opacity: 0, y: 36, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease }}
          >
            <span className="l1" style={{ animation: "none" }}>{HERO.titleLine1}</span>
            <motion.span
              className="l2"
              style={{ animation: "none" }}
              initial={{ opacity: 0, y: 20, filter: "blur(14px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.18, duration: 0.75, ease }}
            >
              {HERO.titleLine2}
            </motion.span>
          </motion.h1>

          {/* 서브타이틀 */}
          <motion.p
            className="gd-subtitle"
            style={{ animation: "none" }}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.6, ease }}
          >
            {HERO.subtitle}
          </motion.p>

          {/* 서치바 */}
          <motion.div
            className="gd-search"
            style={{ animation: "none" }}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46, duration: 0.6, ease }}
          >
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={() => goChat()}
              placeholder={HERO.placeholder}
              buttonLabel={HERO.searchLabel}
              variant="search"
            />

            {/* 추천 칩 — 하나씩 튀어오르며 등장 */}
            <div className="gd-suggest" style={{ animation: "none" }}>
              <span className="gd-suggest-label">{HERO.suggestLabel}</span>
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s}
                  className="gd-chip"
                  initial={{ opacity: 0, scale: 0.78, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.58 + i * 0.07, duration: 0.4, ease }}
                  whileHover={{ scale: 1.06, y: -2, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => goChat(s)}
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>

        </header>
      </div>
    </>
  );
}
