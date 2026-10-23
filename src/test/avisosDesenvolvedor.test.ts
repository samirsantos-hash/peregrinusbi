import { describe, it, expect } from 'vitest';
import { temPerfilDesenvolvedor, consultaLenta } from '@/lib/avisosDesenvolvedor';

describe('avisos exclusivos do desenvolvedor', () => {
  it('Samir pode acumular Desenvolvedor sem perder os perfis existentes', () => {
    expect(temPerfilDesenvolvedor(['admin','super_admin','desenvolvedor'])).toBe(true);
  });
  it('outros perfis não recebem acesso aos avisos', () => {
    for (const perfil of ['admin','super_admin','gerente','user','gestor_loja']) expect(temPerfilDesenvolvedor([perfil])).toBe(false);
    expect(temPerfilDesenvolvedor([])).toBe(false);
  });
  it('classifica lentidão somente a partir de oito segundos', () => {
    expect(consultaLenta(7999)).toBe(false);
    expect(consultaLenta(8000)).toBe(true);
    expect(consultaLenta(NaN)).toBe(false);
  });
});