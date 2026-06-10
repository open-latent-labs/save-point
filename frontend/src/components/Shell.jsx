import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import SidebarToggle from "./SidebarToggle.jsx";
import MintCascades from "./MintCascades.jsx";
import MatrixWarpTransition from "./MatrixWarpTransition.jsx";
import MyPageDrawer from "./MyPageDrawer.jsx";
import MergeConfirmModal from "./MergeConfirmModal.jsx";
import { useSidebar } from "../hooks/useSidebar.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

const EASE = [0.4, 0, 0.2, 1];

export default function Shell() {
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useSidebar();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [animType, setAnimType] = useState(
    () => localStorage.getItem("gamedocs_anim") ?? "1"
  );
  const [myPageOpen, setMyPageOpen] = useState(false);

  const mergeProvider = searchParams.get("merge_confirm");

  const handleMergeDone = (result) => {
    const next = new URLSearchParams(searchParams);
    next.delete("merge_confirm");
    if (result === "success") next.set("link_success", mergeProvider);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const sync = () => setAnimType(localStorage.getItem("gamedocs_anim") ?? "1");
    window.addEventListener("gamedocs:anim", sync);
    return () => window.removeEventListener("gamedocs:anim", sync);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="gd-app">
      <Sidebar
        isOpen={sidebarOpen}
        onNavigate={() => { if (isMobile) setSidebarOpen(false); }}
      />
      <SidebarToggle isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {sidebarOpen && isMobile && (
        <div className="gd-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <motion.main
        className="gd-main"
        animate={{ marginLeft: sidebarOpen && !isMobile ? 260 : 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        {animType === "1" && <MintCascades />}
        {animType === "2" && <MatrixWarpTransition />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            className="gd-main-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            <Outlet context={{ onMenu: () => setSidebarOpen(true), onProfile: () => setMyPageOpen(true) }} />
          </motion.div>
        </AnimatePresence>
        <MyPageDrawer open={myPageOpen} onClose={() => setMyPageOpen(false)} />
        <MergeConfirmModal provider={mergeProvider} onDone={handleMergeDone} />
      </motion.main>
    </div>
  );
}
