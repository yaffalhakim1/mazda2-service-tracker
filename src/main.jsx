import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// ---- Storage shim ----
// Komponen aslinya mengharapkan window.storage (host webview). Di web biasa,
// kita back dengan localStorage supaya data tetap tersimpan di browser.
if (!window.storage) {
  window.storage = {
    async get(key) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? null : { value: v };
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* storage penuh / private mode — abaikan */
      }
    },
  };
}

createRoot(document.getElementById("root")).render(<App />);