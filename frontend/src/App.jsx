import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Shell from "./components/Shell.jsx";
import Landing from "./pages/Landing.jsx";
import Chat from "./pages/Chat.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Upload from "./pages/Upload.jsx";
import Approval from "./pages/Approval.jsx";
import Docs from "./pages/Docs.jsx";
import SuperAdmin from "./pages/superAdmin/Dashboard.jsx";
import { UserRoleProvider } from "./context/UserRoleContext.jsx";



const AUTH_PATHS = ["/login", "/signup"];

export default function App() {
  const location = useLocation();
  const animKey = AUTH_PATHS.includes(location.pathname) ? location.pathname : "shell";

  return (
    <UserRoleProvider>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={animKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          style={{ height: "100%" }}
        >
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route element={<Shell />}>
              <Route path="/home" element={<Landing />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/approval" element={<Approval />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/docs/:docId" element={<Docs />} />
              <Route path="/docs/:docId/original" element={<Docs />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>

            <Route path="/superAdmin" element={<SuperAdmin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </UserRoleProvider>
  );
}
