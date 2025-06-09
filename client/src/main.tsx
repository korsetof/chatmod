import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import React from "react";

// Create a root element
const root = document.getElementById("root");

// Check if the root element exists
if (!root) {
  console.error("Root element not found!");
} else {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
