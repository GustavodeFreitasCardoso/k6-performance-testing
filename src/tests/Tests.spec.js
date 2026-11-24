import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const getFruitsDuration = new Trend('get_fruits', true);
export const RateContentOK = new Rate('content_OK');

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.25'],
    get_fruits: ['p(90)<6800']
  },
  startVUs: 7,
  stages: [
    { duration: '30s', target: 7 },
    { duration: '50s', target: 30 },
    { duration: '50s', target: 60 },
    { duration: '50s', target: 92 },
    { duration: '30s', target: 92 }
  ]
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  const baseUrl = 'https://api.api-onepiece.com/v2/fruits/en';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  const res = http.get(`${baseUrl}`, params);

  getFruitsDuration.add(res.timings.duration);

  let fruits = [];
  try {
    fruits = res.json();
  } catch (e) {
    fruits = [];
  }

  const isList = Array.isArray(fruits);

  RateContentOK.add(res.status === OK && isList && fruits.length > 0);

  check(res, {
    'GET Fruits - Status 200': () => res.status === OK,
    'GET Fruits - Content-Type JSON': () =>
      String(res.headers['Content-Type']).includes('json'),
    'GET Fruits - retorna uma lista': () => isList,
    'GET Fruits - mais de 100 frutas': () => isList && fruits.length > 100,
    'GET Fruits - itens tem id e name': () =>
      isList && fruits[0].id !== undefined && fruits[0].name !== undefined
  });

  sleep(1);
}