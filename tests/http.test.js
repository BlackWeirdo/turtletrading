import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJSON, _clearCache } from '../src/http.js';

const URL = 'https://data.signals.turtletrading.vn/api/stock/live.json';

test('fetchJSON returns JSON and caches the second call', async () => {
  _clearCache();
  const a = await fetchJSON(URL, 60_000);
  assert.ok(a && typeof a === 'object');
  const t0 = Date.now();
  const b = await fetchJSON(URL, 60_000); // should be a cache hit (no network)
  assert.ok(Date.now() - t0 < 50, 'cached call should be near-instant');
  assert.equal(a, b, 'cache returns the same object reference');
});

test('fetchJSON throws an HTTP status error on a bad path', async () => {
  await assert.rejects(
    () => fetchJSON('https://data.signals.turtletrading.vn/api/stock/__nope__.json'),
    /HTTP \d{3}/
  );
});
