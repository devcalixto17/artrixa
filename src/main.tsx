import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Captura erros globais para diagnóstico
window.addEventListener("error", (event) => {
  console.error("Global Error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled Promise Rejection:", event.reason);
});

// Log de inicialização
console.log("App initializing...");
console.log("Env vars:", {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + "..."
});

const root = document.getElementById("root");
if (!root) {
  document.body.innerHTML = "<h1>ERROR: Root element not found</h1>";
} else {
  try {
    createRoot(root).render(<App />);
    console.log("App rendered successfully");
  } catch (err) {
    console.error("App render error:", err);
    root.innerHTML = `<h1>ERROR: ${err instanceof Error ? err.message : String(err)}</h1>`;
  }
}
