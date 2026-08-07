import { createRoot } from "react-dom/client";
import { AppErrorBoundary } from "./components/AppErrorBoundary.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento raiz do aplicativo não encontrado");
}

const root = createRoot(rootElement);

root.render(
  <main className="min-h-screen bg-background text-foreground flex items-center justify-center" aria-live="polite">
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      Abrindo Peregrinus...
    </div>
  </main>,
);

import("./App.tsx")
  .then(({ default: App }) => {
    root.render(
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>,
    );
  })
  .catch((error) => {
    console.error("Falha ao iniciar o Peregrinus", error);
    root.render(
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <section className="w-full max-w-md border border-border bg-card p-6 text-center shadow-lg">
          <h1 className="text-lg font-semibold">Falha ao carregar o aplicativo</h1>
          <p className="mt-2 text-sm text-muted-foreground">Recarregue o preview e tente novamente.</p>
          <a href={window.location.href} className="mt-5 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Recarregar preview
          </a>
        </section>
      </main>,
    );
  });
