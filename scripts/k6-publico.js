import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Public delivery only: no JavaScript execution, login, database or ML calls.
const origin = 'https://ecomperegrinus.com.br';
const pageFailures = new Rate('page_failures');

export const options = {
  stages: [
    { duration: '60s', target: 1000 },
    { duration: '60s', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  gracefulStop: '10s',
  maxRedirects: 0,
  thresholds: {
    http_req_failed: [
      'rate<0.01',
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '10s' },
    ],
    page_failures: ['rate<0.01'],
    'http_req_duration{kind:document}': ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  const path = __ITER % 2 === 0 ? '/' : '/index';
  const response = http.get(`${origin}${path}`, {
    tags: { kind: 'document', name: path },
    timeout: '10s',
  });
  const valid = check(response, {
    'documento HTTP 200': (r) => r.status === 200,
    'documento contém aplicação React': (r) => typeof r.body === 'string' && r.body.includes('id="root"'),
  });
  pageFailures.add(!valid);

  // One cold asset load per virtual user; subsequent navigation represents cache reuse.
  if (__ITER === 0 && valid) {
    const assets = [...response.body.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(?:js|css))"/g)]
      .map((match) => match[1]);
    const unique = [...new Set(assets)].slice(0, 4);
    check(unique, { 'arquivos da aplicação encontrados': (items) => items.length >= 2 });
    for (const asset of unique) {
      const result = http.get(`${origin}${asset}`, {
        tags: { kind: 'asset', name: asset.endsWith('.js') ? 'app.js' : 'app.css' },
        timeout: '10s',
        responseType: 'none',
      });
      check(result, { 'arquivo HTTP 200': (r) => r.status === 200 });
    }
  }
  sleep(3 + Math.random() * 2);
}

export function handleSummary(data) {
  const destination = __ENV.K6_SUMMARY_PATH || '/tmp/k6-publico-summary.json';
  return { [destination]: JSON.stringify(data, null, 2) };
}