import MercadoLivrePanel from "@/components/multilojas/MercadoLivrePanel";

const Integracoes = () => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <header>
        <h1 className="text-lg font-semibold">Integrações</h1>
        <p className="text-xs text-muted-foreground">
          Conexões de contas externas usadas para importar vendas e custos.
        </p>
      </header>
      <MercadoLivrePanel />
    </div>
  </div>
);

export default Integracoes;
