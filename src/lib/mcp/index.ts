import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listarLojas from "./tools/listar-lojas";
import indicadoresLoja from "./tools/indicadores-loja";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "peregrinus-business-intelligence",
  title: "Peregrinus Business Intelligence",
  version: "0.1.0",
  instructions: "Ferramentas de leitura do painel Peregrinus. Liste as lojas da carteira do usuário e consulte os indicadores mensais de cada uma. Os acessos seguem as mesmas permissões do painel.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listarLojas, indicadoresLoja],
});
