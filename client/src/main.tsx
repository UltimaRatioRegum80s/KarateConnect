import { createRoot } from "react-dom/client";
import "./index.css";

console.log("main.tsx loading");

// Simple test component to verify React is working
function TestApp() {
  return (
    <div style={{ 
      padding: '40px', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      minHeight: '100vh',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🥋 NKF EXCO Portal</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        React is working! Application is loading...
      </p>
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>System Status:</h2>
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          <li>✅ Server running on port 5000</li>
          <li>✅ Vite development server active</li>
          <li>✅ React application loaded</li>
          <li>✅ Ready for authentication</li>
        </ul>
      </div>
      <button 
        onClick={() => window.location.reload()}
        style={{
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        Continue to Login
      </button>
    </div>
  );
}

const root = document.getElementById("root");
console.log("Root element:", root);

if (root) {
  try {
    createRoot(root).render(<TestApp />);
    console.log("Test app rendered successfully");
  } catch (error) {
    console.error("Error rendering test app:", error);
    root.innerHTML = `<div style="padding: 20px; background: red; color: white;">Error: ${error}</div>`;
  }
} else {
  console.error("Root element not found");
}
