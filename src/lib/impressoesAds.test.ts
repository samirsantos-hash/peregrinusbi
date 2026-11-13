import { expect, it } from 'vitest';
import { resumirImpressoesAds } from './impressoesAds';
it('soma impressões reais só nas datas solicitadas e expõe lacunas', () => {
  expect(resumirImpressoesAds(['2026-11-04','2026-11-05'], [{dia:'2026-11-04',prints:120},{dia:'2026-11-04',prints:80},{dia:'2026-11-03',prints:999}])).toEqual({total:200,cobertura:1,dias:2});
});
it('não transforma ausência em zero nem aceita campanha parcial', () => {
  expect(resumirImpressoesAds(['2026-11-04'], [{dia:'2026-11-04',prints:120},{dia:'2026-11-04',prints:null}]).total).toBeNull();
});
it('preserva zero confirmado', () => {
  expect(resumirImpressoesAds(['2026-11-04'], [{dia:'2026-11-04',prints:0}]).total).toBe(0);
});