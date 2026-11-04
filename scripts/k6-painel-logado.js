import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Logged-in panel load: read-only queries the summary and store list make on open.
// One test account (read-only, few stores) logs in once in setup to avoid auth rate limits.
const api = __ENV.SUPABASE_URL;
const anon = __ENV.SUPABASE_ANON;
const tempoResumo = new Trend('tempo_resumo', true);
const tempoLojas = new Trend('tempo_lojas', true);
const falhas = new Rate('falhas_painel');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '45s', target: 200 },
    { duration: '45s', target: 500 },
    { duration: '60s', target: 1000 },
    { duration: '60s', target: 1000 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    falhas_painel: ['rate<0.01', { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '15s' }],
    tempo_resumo: ['p(95)<1000', { threshold: 'p(95)<8000', abortOnFail: true, delayAbortEval: '20s' }],
    tempo_lojas: ['p(95)<1000'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'max'],
};

export function setup() {
  const r = http.post(`${api}/auth/v1/token?grant_type=password`, JSON.stringify({ email: __ENV.EMAIL, password: __ENV.SENHA }), { headers: { apikey: anon, 'Content-Type': 'application/json' } });
  const s = r.json();
  const uid = s.user.id;
  const h = { apikey: anon, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' };
  const ac = http.get(`${api}/rest/v1/user_access_control?select=allowed_cust_ids&user_id=eq.${uid}`, { headers: h }).json();
  const ids = (ac[0] && ac[0].allowed_cust_ids) || [];
  const sel = http.get(`${api}/rest/v1/sellers?select=id&cust_id=in.(${ids.join(',')})`, { headers: h }).json();
  return { token: s.access_token, uid, sellers: sel.map((x) => x.id) };
}

function lote(reqs) {
  const t = Date.now();
  const rs = http.batch(reqs);
  const ok = rs.every((r) => r.status >= 200 && r.status < 300);
  falhas.add(!ok);
  check(rs, { 'consultas 2xx': () => ok });
  return Date.now() - t;
}

export default function (d) {
  const h = { headers: { apikey: anon, Authorization: `Bearer ${d.token}`, 'Content-Type': 'application/json' }, timeout: '30s' };
  const R = `${api}/rest/v1`;
  const corpo = JSON.stringify({ p_seller_ids: d.sellers });
  group('resumo', () => {
    tempoResumo.add(lote([
      ['GET', `${R}/user_roles?select=role&user_id=eq.${d.uid}`, null, h],
      ['GET', `${R}/user_access_control?select=must_change_password,temp_password_expires_at&user_id=eq.${d.uid}`, null, h],
      ['POST', `${R}/rpc/minhas_permissoes`, '{}', h],
      ['POST', `${R}/rpc/ml_sou_consultor`, '{}', h],
      ['GET', `${R}/portfolio_notifications?select=*&order=created_at.desc&limit=30`, null, h],
      ['GET', `${R}/sellers_kpi?select=data&order=data.desc&limit=1`, null, h],
      ['GET', `${R}/sellers_kpi_daily?select=data&order=data.desc&limit=1`, null, h],
      ['POST', `${R}/rpc/indicadores_carteira?order=is_latest.asc,data.asc,seller_id.asc&offset=0&limit=1000`, corpo, h],
      ['POST', `${R}/rpc/indicadores_verticais?offset=0&limit=1000`, corpo, h],
    ]));
  });
  sleep(1 + Math.random());
  group('lojas', () => {
    tempoLojas.add(lote([
      ['GET', `${R}/sellers?select=id,nickname,cust_id,cluster_seller,sub_cluster_seller,cus_state&order=nickname.asc,id.asc&offset=0&limit=1000`, null, h],
      ['GET', `${R}/sellers?select=cust_id,nickname&order=nickname.asc,cust_id.asc&offset=0&limit=1000`, null, h],
      ['GET', `${R}/sellers_kpi?select=seller_id,data,tgmv_lc,bpc,rep_claims_rate,rep_delayed_ht_rate,sellers!inner(id,nickname,cust_id)&data=in.(2026-11-01,2026-10-01,2026-09-01)&order=seller_id.asc,data.asc,id.asc&offset=0&limit=1000`, null, h],
    ]));
  });
  sleep(4 + Math.random() * 3);
}

export function handleSummary(data) {
  return { [__ENV.K6_SUMMARY_PATH || '/tmp/k6-painel-summary.json']: JSON.stringify(data, null, 2) };
}
