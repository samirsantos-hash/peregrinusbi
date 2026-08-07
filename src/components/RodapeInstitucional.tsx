import logo from "@/assets/logo.png";
import { useTheme } from "@/hooks/useTheme";

/**
 * Rodapé institucional único do painel.
 * Renderizado uma única vez, ao final do fluxo do documento (ver ProtectedRoute).
 */
export default function RodapeInstitucional() {
  const { theme } = useTheme();
  const anoFinal = new Date().getFullYear();

  return (
    <footer
      className="rodape-institucional bg-surface-alt border-t border-muted/20 px-6 py-8 pb-16"
      style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Coluna 1 — logo */}
        <div className="flex items-start">
          {theme === "light" ? (
            <span
              className="inline-flex items-center rounded"
              style={{ backgroundColor: "#151F6D", padding: "10px 14px" }}
            >
              <img src={logo} alt="ECOM CONSULT" className="h-7 w-auto" loading="lazy" />
            </span>
          ) : (
            <img src={logo} alt="ECOM CONSULT" className="h-7 w-auto" loading="lazy" />
          )}
        </div>

        {/* Coluna 2 — confidencialidade */}
        <div className="aviso-confidencialidade">
          <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-alt">
            Aviso de confidencialidade
          </p>
          <p className="mt-2 text-[12px] font-normal leading-relaxed text-muted-alt" style={{ maxWidth: "52ch" }}>
            As informações apresentadas neste painel são confidenciais e de uso restrito ao destinatário
            autorizado. Os dados são provenientes de fontes do marketplace e de sistemas do cliente, e
            destinam-se exclusivamente à gestão da operação contratada. É vedada a reprodução, distribuição
            ou divulgação a terceiros, total ou parcial, sem autorização prévia e por escrito da ECOM
            CONSULT. O acesso é registrado e auditado.
          </p>
        </div>

        {/* Coluna 3 — endereços */}
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-alt">Endereços</p>
          <div className="mt-2 space-y-3 text-[12px] font-normal leading-relaxed text-muted-alt">
            <div>
              <p className="font-medium">Escritório</p>
              <p>R. Manuel de Oliveira, 269 — 4º andar, sala 415</p>
              <p>Brasil, Mogi das Cruzes — SP, 08773-130</p>
            </div>
            <div>
              <p className="font-medium">Sede (endereço registrado no CNPJ)</p>
              <p>Av. Antônio Vieira do Nascimento, 186 — Jardim Nathalie</p>
              <p>Mogi das Cruzes — SP, 08725-740</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-muted/15 pt-4 text-center text-[11px] font-normal text-muted-alt">
        Copyright © 2017–{anoFinal} ECOM CONSULT · CNPJ 35.581.459/0001-00
      </div>
    </footer>
  );
}