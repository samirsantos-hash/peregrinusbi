import { createRoot } from "react-dom/client";
import { AppErrorBoundary } from "./components/AppErrorBoundary.tsx";
import App from "./App.tsx";
import "./index.css";
import { instalarSaidaEmergencia } from "./lib/saidaEmergencia";

// Instala antes do app para cobrir todas as consultas ao servidor.
if (import.meta.env.VITE_SUPABASE_URL) instalarSaidaEmergencia(new URL(import.meta.env.VITE_SUPABASE_URL).origin);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento raiz do aplicativo não encontrado");
}

const root = createRoot(rootElement);

root.render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
