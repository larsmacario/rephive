import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { AuthProvider } from "./lib/auth";
import { PreferencesProvider } from "./lib/preferences";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </AuthProvider>
  </StrictMode>,
);
