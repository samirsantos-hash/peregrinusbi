import { describe, expect, it } from "vitest";
import { contemDadosPessoais, limparDadosPessoais } from "../../../supabase/functions/_shared/limparDadosPessoais";

describe("limparDadosPessoais", () => {
  it("remove telefone", () => expect(limparDadosPessoais("liga (43) 99999-0000 ok")).toBe("liga [telefone removido] ok"));
  it("remove e-mail", () => expect(limparDadosPessoais("manda p fulano@gmail.com")).toBe("manda p [e-mail removido]"));
  it("remove CPF", () => expect(limparDadosPessoais("cpf 123.456.789-00")).toBe("cpf [documento removido]"));
  it("remove link de WhatsApp", () => expect(limparDadosPessoais("chama wa.me/5543999990000")).toBe("chama [link removido]"));
  it("remove CEP", () => expect(limparDadosPessoais("entrega no 86010-000?")).toBe("entrega no [CEP removido]?"));
  it("remove @usuário", () => expect(limparDadosPessoais("me segue @loja_teste")).toBe("me segue [usuário removido]"));
  it("mantém medidas e modelos", () => {
    const t = "Serve no Gol 1.6 2015? Medida 205/55 R16, 12V 60Ah";
    expect(limparDadosPessoais(t)).toBe(t);
    expect(contemDadosPessoais(t)).toBe(false);
  });
  it("detecta contato na sugestão", () => expect(contemDadosPessoais("Fale no 43 99999-0000")).toBe(true));
});
