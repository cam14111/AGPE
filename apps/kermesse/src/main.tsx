import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@agpe/shared/auth/AuthProvider";
import { AppRouter } from "./router";
import "./index.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
