import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha ao renderizar o Peregrinus", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <section className="w-full max-w-md border border-border bg-card p-6 text-center shadow-lg">
            <h1 className="text-lg font-semibold">Não foi possível abrir o painel</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Recarregue o preview para restabelecer a sessão do aplicativo.
            </p>
            <a
              href={window.location.href}
              className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Recarregar painel
            </a>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}