import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/Shell.jsx";
import Landing from "./pages/Landing.jsx";
import Chat from "./pages/Chat.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Upload from "./pages/Upload.jsx";
import Docs from "./pages/Docs.jsx";



export default function App() {
  return (
    <Routes>
      {/* 첫 페이지: 로그인으로 리다이렉트 */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 사이드바가 있는 페이지 */}
      <Route element={<Shell />}>
        <Route path="/home" element={<Landing />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/docs/:docId" element={<Docs />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>

      {/* 사이드바 없는 단독 페이지 */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  );
}
