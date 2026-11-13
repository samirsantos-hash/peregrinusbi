import { describe, expect, it } from 'vitest';
import { progressoConsultas } from './progressoConsultas';

describe('progresso das consultas medidas', () => {
  it('não avança enquanto a consulta continua pendente', () => {
    expect(progressoConsultas(new Map([['abc', false]])).percentual).toBe(0);
  });
  it('mede consultas finalizadas, não tempo estimado', () => {
    expect(progressoConsultas(new Map([['abc', true], ['anterior', false]])).percentual).toBe(50);
  });
  it('só chega a 100 quando todas as consultas terminam', () => {
    expect(progressoConsultas(new Map([['abc', true], ['anterior', true]])).percentual).toBe(100);
  });
});