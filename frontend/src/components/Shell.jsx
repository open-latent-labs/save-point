import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import SidebarToggle from "./SidebarToggle.jsx";
import MintCascades from "./MintCascades.jsx";
import { useSidebar } from "../hooks/useSidebar.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

const EASE = [0.4, 0, 0.2, 1];

export default function Shell() {
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useSidebar();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const location = useLocation();
  const [cascades, setCascades] = useState(
    () => localStorage.getItem("gamedocs_cascades") !== "false"
  );

  useEffect(() => {
    const sync = () => setCascades(localStorage.getItem("gamedocs_cascades") !== "false");
    window.addEventListener("gamedocs:cascades", sync);
    return () => window.removeEventListener("gamedocs:cascades", sync);
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
        {cascades && <MintCascades />}
        <div className="gd-main-content">
          <Outlet context={{ onMenu: () => setSidebarOpen(true) }} />
        </div>
      </motion.main>
    </div>
  );
}
