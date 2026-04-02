import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ✅ 注册 PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.log("Service Worker registered");
      })
      .catch((err) => {
        console.log("Service Worker registration failed:", err);
      });
  });
}
