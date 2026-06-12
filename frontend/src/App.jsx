import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Shell from "./components/Shell.jsx";
import Landing from "./pages/Landing.jsx";
import Chat from "./pages/Chat.jsx";
import ChatHistory from "./pages/ChatHistory.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Upload from "./pages/Upload.jsx";
import Approval from "./pages/Approval.jsx";
import Docs from "./pages/Docs.jsx";
import SuperAdmin from "./pages/superAdmin/Dashboard.jsx";
import { UserRoleProvider } from "./context/UserRoleContext.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

// /login, /signup 페이지 전환 시에만 개별 애니메이션 적용
const AUTH_PATHS = ["/login", "/signup"];

// 인증 보호 라우트 — 미로그인 시 /login으로, superAdminOnly 설정 시 SUPER_ADMIN만 허용
function PrivateRoute({ children, superAdminOnly = false }) {
  const { user, loading } = useAuth();
  // /auth/me 응답 대기 중에는 렌더링 보류 (깜빡임 방지)
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (superAdminOnly && user.role !== "SUPER_ADMIN") return <Navigate to="/home" replace />;
  return children;
}

function AppRoutes() {
  const location = useLocation();
  const animKey = AUTH_PATHS.includes(location.pathname) ? location.pathname : "shell";

  return (
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

          <Route element={<PrivateRoute><Shell /></PrivateRoute>}>
            <Route path="/home" element={<Landing />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/history" element={<ChatHistory />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/approval" element={<Approval />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/docs/:docId" element={<Docs />} />
            <Route path="/docs/:docId/original" element={<Docs />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>

          <Route path="/superAdmin" element={<PrivateRoute superAdminOnly><SuperAdmin /></PrivateRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

// AuthProvider가 최외곽 — 모든 하위 컴포넌트에서 useAuth() 사용 가능
export default function App() {
  return (
    <AuthProvider>
      <UserRoleProvider>
        <AppRoutes />
      </UserRoleProvider>
    </AuthProvider>
  );
}
