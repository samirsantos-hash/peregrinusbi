import { describe, expect, it } from 'vitest';
import { resumirQualidadeMl } from '@/lib/qualidadeResumoMl';

describe('qualidade oficial dos anúncios ativos', () => {
  it('usa apenas notas medidas de anúncios ativos e preserva zero e escala 100', () => {
    expect(resumirQualidadeMl(['a', 'b', 'c'], [{item_id:'a', qualidade_score:0}, {item_id:'b', qualidade_score:100}, {item_id:'c', qualidade_score:null}, {item_id:'pausado', qualidade_score:90}])).toEqual({media:50, avaliados:2, ativos:3, semAvaliacao:1});
  });
  it('não inventa índice quando não há avaliação válida', () => {
    expect(resumirQualidadeMl(['a'], [{item_id:'a', qualidade_score:NaN}]).media).toBeNull();
    expect(resumirQualidadeMl([], []).media).toBeNull();
  });
});