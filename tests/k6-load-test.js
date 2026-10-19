import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Load Benchmark Configuration
// Target: 1,200 req/sec sustained with <45ms p95 latency
export const options = {
  stages: [
    { duration: '15s', target: 50 },   // Warm-up ramp
    { duration: '30s', target: 200 },  // Ramp to 200 virtual users (~1,200 req/sec)
    { duration: '1m',  target: 200 },  // Sustain peak load
    { duration: '15s', target: 0 },    // Cool-down
  ],
  thresholds: {
    // 95% of requests must complete below 45ms (matching resume benchmark)
    http_req_duration: ['p(95)<45'],
    // Less than 1% failed requests
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://127.0.0.1:5000';

export default function () {
  // Test 1: High-throughput API Health probe
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'latency is under 45ms': (r) => r.timings.duration < 45,
  });

  sleep(0.1);
}
