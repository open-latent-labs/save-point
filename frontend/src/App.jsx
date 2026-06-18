import React from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Shell from "./components/Shell.jsx";
import Landing from "./pages/Landing.jsx";
import Chat from "./pages/Chat.jsx";
import ChatHistory from "./pages/ChatHistory.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Upload from "./pages/Upload.jsx";
import Approval from "./pages/Approval.jsx";
import Docs from "./pages/Docs.jsx";
import SuperAdmin from "./pages/superAdmin/Dashboard.jsx";
import { useAuth } from "./context/AuthContext.jsx";

const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];

function PrivateRoute({ children, superAdminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (superAdminOnly && user.role !== "SUPER_ADMIN") return <Navigate to="/home" replace />;
  return children;
}

function RootLayout() {
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
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <RootLayout />,
      children: [
        { index: true, element: <Navigate to="/login" replace /> },
        {
          element: <PrivateRoute><Shell /></PrivateRoute>,
          children: [
            { path: "home", element: <Landing /> },
            { path: "chat", element: <Chat /> },
            { path: "chat/history", element: <ChatHistory /> },
            { path: "upload", element: <Upload /> },
            { path: "approval", element: <Approval /> },
            { path: "docs", element: <Docs /> },
            { path: "docs/:docId", element: <Docs /> },
            { path: "docs/:docId/original", element: <Docs /> },
            { path: "*", element: <Navigate to="/home" replace /> },
          ],
        },
        {
          path: "superAdmin",
          element: <PrivateRoute superAdminOnly><SuperAdmin /></PrivateRoute>,
        },
        { path: "login", element: <Login /> },
        { path: "signup", element: <Signup /> },
        { path: "forgot-password", element: <ForgotPassword /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  }
);
