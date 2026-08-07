import { useState } from "react";

/**
 * Rodapé institucional único do painel.
 * Renderizado uma única vez, ao final do fluxo do documento (ver ProtectedRoute).
 */
export default function RodapeInstitucional() {
  const anoFinal = new Date().getFullYear();
  const [aberto, setAberto] = useState(false);

  return (
    <footer
      className="rodape-institucional border-t border-muted/15 bg-transparent px-6 py-3 text-left text-[11px] font-normal leading-[1.5] text-muted-alt"
      style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
    >
      <p>
        Copyright © 2017–{anoFinal}. ECOM CONSULT. CNPJ n.º 35.581.459/0001-00 · Av. Antônio Vieira do
        Nascimento, 186 - Jardim Nathalie, Mogi das Cruzes/SP - CEP 08725-740 · Informações confidenciais
        de uso restrito.{" "}
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="text-brand-blue no-underline hover:underline"
        >
          Mais informações
        </button>
      </p>
      {aberto && (
        <div className="aviso-confidencialidade mt-2 space-y-2">
          <p>
            Escritório: R. Manuel de Oliveira, 269 - 4º andar, sala 415 - Brasil, Mogi das Cruzes/SP - CEP
            08773-130
          </p>
          <p>
            As informações apresentadas neste painel são confidenciais e de uso restrito ao destinatário
            autorizado. Os dados são provenientes de fontes do marketplace e de sistemas do cliente, e
            destinam-se exclusivamente à gestão da operação contratada. É vedada a reprodução, distribuição
            ou divulgação a terceiros, total ou parcial, sem autorização prévia e por escrito da ECOM
            CONSULT. O acesso é registrado e auditado.
          </p>
        </div>
      )}
    </footer>
  );
}