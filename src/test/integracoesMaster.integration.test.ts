import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

// Explicit opt-in: exercise deployed permission rules with a minted master session.
describe.skipIf(process.env.TEST_MASTER_INTEGRATIONS !== '1')('integrações master reais', () => {
  it('inclui lojas conectadas por outras pessoas, sem expor credenciais', async () => {
    const minted = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, 'utf8'));
    const config = readFileSync('.env', 'utf8');
    const get = (name: string) => config.match(new RegExp(`^${name}=["']?([^"'\\n]+)`, 'm'))?.[1];
    const url = get('VITE_SUPABASE_URL');
    const key = get('VITE_SUPABASE_PUBLISHABLE_KEY');
    if (!url || !key) throw new Error('Configuração pública ausente');
    const response = await fetch(`${url}/rest/v1/rpc/ml_minhas_contas_status`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${minted.session.access_token}`, 'Content-Type': 'application/json' }, body: '{}',
    });
    expect(response.status).toBe(200);
    const rows = await response.json() as Record<string, unknown>[];
    for (const nickname of ['MERCALANI', 'CND27', 'GMABSOLUTA', 'FLEXARTS', 'DECORDAMOVEIS', 'MAREDECORMOVEIS']) {
      expect(rows.some(row => row.nickname === nickname)).toBe(true);
    }
    for (const row of rows) {
      expect(row).not.toHaveProperty('access_token');
      expect(row).not.toHaveProperty('refresh_token');
    }
  });
});