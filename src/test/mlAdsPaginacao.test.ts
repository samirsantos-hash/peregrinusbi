import { describe, it, expect, vi } from 'vitest';
import { paginarAds, confirmarDiaAds } from '../../supabase/functions/_shared/mlAdsPaginacao';
import { buscarMl } from '../../supabase/functions/_shared/mlHttp';

describe('prazo e cobertura Ads', () => {
  it('não começa uma requisição depois do prazo', async () => {
    const fetcher = vi.fn();
    const r = await buscarMl('https://example.test', 'teste', fetcher, {}, { deadlineAt: Date.now() - 1 });
    expect(r.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('não repete quando não há tempo para esperar', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 503 }));
    expect((await buscarMl('https://example.test', 'teste', fetcher, {}, { deadlineAt: Date.now() + 200 })).ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('preserva páginas lidas ao atingir o prazo, sem confirmar cobertura', async () => {
    let parar = false;
    const ler = vi.fn(async () => { parar = true; return { ok: true as const, status: 200, json: { results: Array.from({ length: 50 }, (_, id) => ({ id })), paging: { total: 100 } } }; });
    const r = await paginarAds('https://example.test', ler, () => parar);
    expect(r.ok).toBe(false);
    expect(r.items).toHaveLength(50);
    expect(ler).toHaveBeenCalledTimes(1);
  });
  it('não trata resposta inválida como dia vazio completo', async () => {
    expect((await paginarAds('https://example.test', async () => ({ ok: true, status: 200, json: {} }), () => false)).ok).toBe(false);
  });
  it('guarda dados parciais sem marcar o dia', async () => {
    const gravar = vi.fn(async () => true), marcar = vi.fn(async () => true);
    expect(await confirmarDiaAds(false, gravar, marcar)).toBe(false);
    expect(gravar).toHaveBeenCalledTimes(1); expect(marcar).not.toHaveBeenCalled();
  });
  it('falha de gravação impede confirmação', async () => {
    const marcar = vi.fn(async () => true);
    expect(await confirmarDiaAds(true, async () => false, marcar)).toBe(false);
    expect(marcar).not.toHaveBeenCalled();
  });
  it('falha do marcador mantém dia pendente', async () => {
    expect(await confirmarDiaAds(true, async () => true, async () => false)).toBe(false);
    expect(await confirmarDiaAds(true, async () => true, async () => true)).toBe(true);
  });
});