import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

describe('carga pública solicitada', () => {
  it('atinge 1.000 usuários com rampas limitadas e proteção contra falhas', () => {
    const source = readFileSync('scripts/k6-publico.js', 'utf8');
    const declaration = source.split('export const options = ')[1]?.split('\nexport default')[0];
    if (!declaration) throw new Error('Configuração k6 ausente');
    const options = runInNewContext(`(${declaration.trim().replace(/;$/, '')})`);
    expect(options.stages).toEqual([
      { duration: '60s', target: 1000 },
      { duration: '60s', target: 1000 },
      { duration: '30s', target: 0 },
    ]);
    expect(options.thresholds.http_req_failed).toContainEqual({
      threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '10s',
    });
    expect(options.maxRedirects).toBe(0);
  });
});