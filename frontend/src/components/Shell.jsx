import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";

export default function Shell() {
  const [sbOpen, setSbOpen] = useState(false);
  const [sbHover, setSbHover] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSbOpen(false);
    setSbHover(false);
  }, [location.pathname, location.search]);

  return (
    <div className={"gd-app" + (sbOpen ? " sb-open" : "") + (sbHover ? " sb-hover" : "")}>
      <div className="gd-sb-trigger" onMouseEnter={() => setSbHover(true)} />
      <Sidebar
        onNavigate={() => { setSbOpen(false); setSbHover(false); }}
        onMouseLeave={() => setSbHover(false)}
      />
      <div className="gd-overlay" onClick={() => setSbOpen(false)} />
      <main className="gd-main">
        <Outlet context={{ onMenu: () => setSbOpen(true) }} />
      </main>
    </div>
  );
}
