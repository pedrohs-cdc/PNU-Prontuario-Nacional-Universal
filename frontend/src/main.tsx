import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { AuthProvider } from "./auth";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
