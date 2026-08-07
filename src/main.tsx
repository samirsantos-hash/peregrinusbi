import { createRoot } from "react-dom/client";
import { AppErrorBoundary } from "./components/AppErrorBoundary.tsx";
import App from "./App.tsx";
import "./index.css";

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
