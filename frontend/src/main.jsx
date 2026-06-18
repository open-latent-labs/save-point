import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { UserRoleProvider } from "./context/UserRoleContext.jsx";
import { router } from "./App.jsx";
import "./styles/global.css";

const savedTheme = localStorage.getItem("gamedocs_theme") ?? "mint";
document.documentElement.setAttribute("data-theme", savedTheme);

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <UserRoleProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </UserRoleProvider>
  </AuthProvider>
);
