import MercadoLivrePanel from "@/components/multilojas/MercadoLivrePanel";

const Integracoes = () => (
  <div className="min-h-screen">
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-8 space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Integrações</h1>
        <p className="text-sm text-muted-foreground">
          Conexões de contas externas usadas para importar vendas e custos.
        </p>
      </header>
      <MercadoLivrePanel />
    </div>
  </div>
);

export default Integracoes;
