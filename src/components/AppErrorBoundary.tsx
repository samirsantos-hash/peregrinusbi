import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { failed: true, message: error?.message ?? "Erro desconhecido" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha ao renderizar o Peregrinus", error, info);
  }

  handleRetry = () => {
    this.setState({ failed: false, message: "" });
  };

  render() {
    if (this.state.failed) {
      return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <section className="w-full max-w-md border border-border bg-card p-6 text-center shadow-lg">
            <h1 className="text-lg font-semibold">Não foi possível abrir o painel</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ocorreu um erro ao carregar esta tela. Você pode tentar reenviar a solicitação.
            </p>
            {this.state.message ? (
              <p className="mt-3 break-words rounded-md border border-border bg-muted/40 p-3 text-left text-xs font-mono text-muted-foreground">
                {this.state.message}
              </p>
            ) : null}
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Reenviar solicitação
              </button>
              <a
                href={window.location.href}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium"
              >
                Recarregar painel
              </a>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}