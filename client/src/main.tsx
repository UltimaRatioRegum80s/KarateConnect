import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Only log meaningful errors, not development-related rejections
  if (event.reason && !event.reason.toString().includes('[vite]')) {
    console.warn('Unhandled promise rejection:', event.reason);
  }
  // Prevent the default browser behavior (which logs the error to console)
  event.preventDefault();
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

console.log("NKF Portal: main.tsx loading");
console.log("Window location:", window.location.href);
console.log("Document readyState:", document.readyState);
console.log("User agent:", navigator.userAgent);

const root = document.getElementById("root");
console.log("NKF Portal: Root element found:", !!root);

if (root) {
  try {
    console.log("NKF Portal: Creating React root...");
    createRoot(root).render(<App />);
    console.log("NKF Portal: React app rendered successfully");
  } catch (error) {
    console.error("NKF Portal: Error rendering React app:", error);
    // Fallback display with error
    root.innerHTML = `
      <div style="
        padding: 40px; 
        background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%); 
        color: white; 
        font-family: system-ui, sans-serif;
        min-height: 100vh;
      ">
        <h1>🥋 NKF EXCO Portal - Error</h1>
        <h2>React Loading Error</h2>
        <p>Error: ${error}</p>
        <button onclick="window.location.reload()" style="
          background: white; 
          color: #cc0000; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 6px; 
          cursor: pointer;
        ">Reload Page</button>
      </div>
    `;
  }
} else {
  console.error("NKF Portal: Root element not found");
  document.body.innerHTML = `
    <div style="
      padding: 40px; 
      background: #333; 
      color: white; 
      font-family: system-ui, sans-serif;
    ">
      <h1>🥋 NKF EXCO Portal - Critical Error</h1>
      <p>Root element not found. Check HTML structure.</p>
    </div>
  `;
}
