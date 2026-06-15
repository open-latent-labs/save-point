import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { UserRoleProvider } from "./context/UserRoleContext.jsx";
import { router } from "./App.jsx";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <UserRoleProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </UserRoleProvider>
  </AuthProvider>
);
