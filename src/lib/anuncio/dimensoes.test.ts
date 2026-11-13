import { describe, it, expect } from 'vitest';
import { notarExposicaoComercial, notarFotos, medirFoto, notarConversao, CLASSICO, PREMIUM } from './dimensoes';

const envio = (logistic_type: string, free_shipping = true) => ({ mode: 'me2', free_shipping, logistic_type });

describe('exposição comercial', () => {
  it('clássico com Full atinge 87', () => { expect(notarExposicaoComercial(envio('fulfillment'), CLASSICO, 15000, 7900).nota! * 100).toBeCloseTo(87, 0); });
  it('premium com Full atinge 100', () => { expect(notarExposicaoComercial(envio('fulfillment'), PREMIUM, 5000, 7900).nota! * 100).toBeCloseTo(100, 0); });
  it('clássico com Full supera premium com Flex', () => {
    expect(notarExposicaoComercial(envio('fulfillment'), CLASSICO, 15000, 7900).nota!).toBeGreaterThan(notarExposicaoComercial(envio('self_service'), PREMIUM, 5000, 7900).nota!);
  });
  it('quantifica o ganho da migração para o Full', () => { expect(notarExposicaoComercial(envio('drop_off'), CLASSICO, 15000, 7900).acao).toMatch(/ganha 57 pontos/); });
  it('regra de preço entra como ressalva, não derruba a nota', () => {
    const certo = notarExposicaoComercial(envio('fulfillment'), CLASSICO, 15000, 7900);
    const fora = notarExposicaoComercial(envio('fulfillment'), CLASSICO, 4000, 7900);
    expect(fora.nota).toBe(certo.nota);
    expect(fora.acao).toMatch(/regra de margem/);
    expect(certo.acao).toBeNull();
  });
  it('sem logística a dimensão não fecha', () => { expect(notarExposicaoComercial(null, PREMIUM, 10000, 7900).nota).toBeNull(); });
});

describe('fotos', () => {
  const f = (max: string) => ({ id: max, size: '500x500', max_size: max });
  it('usa max_size, não size', () => { expect(notarFotos([f('1200x1200')]).evidencia).toMatch(/1 em alta resolução/); });
  it('aponta a menor foto abaixo do mínimo', () => { expect(notarFotos([f('1200x1200'), f('800x600')]).acao).toMatch(/800x600/); });
  it('medirFoto devolve null em formato inesperado', () => { expect(medirFoto('grande')).toBeNull(); });
  it('fotos não lidas ficam sem medição', () => { expect(notarFotos(null).nota).toBeNull(); });
});

describe('conversão', () => {
  it('abaixo de 50 visitas não mede', () => { expect(notarConversao(49, 3, 0.02).nota).toBeNull(); });
});
