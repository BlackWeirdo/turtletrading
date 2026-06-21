import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as gex from '../src/core/gex.js';

test('getGex("btc") returns core scalars + levels', async () => {
  const r = await gex.getGex({ sym: 'btc' });
  assert.equal(typeof r.net_gex, 'number');
  assert.equal(typeof r.gamma_flip, 'number');
  assert.ok('max_pain' in r && 'atm_iv' in r);
  assert.ok(Array.isArray(r.levels));
});

test('getGex("btc",["profile","netdollar"]) includes both arrays', async () => {
  const r = await gex.getGex({ sym: 'btc', sections: ['profile', 'netdollar'] });
  assert.ok(Array.isArray(r.profile) && r.profile.length > 0);
  assert.ok(Array.isArray(r.netdollar) && r.netdollar.length > 0);
});

test('getPositioning("btc") returns funding + lsr + fng', async () => {
  const r = await gex.getPositioning({ sym: 'btc' });
  assert.ok(r.funding && 'avg' in r.funding);
  assert.ok('lsr' in r);
  assert.ok(r.fng && 'value' in r.fng);
});

test('getCot("btc") returns numeric cot_index', async () => {
  const r = await gex.getCot({ sym: 'btc' });
  assert.equal(typeof r.cot_index, 'number');
});

test('getLiquidations("btc") returns bars', async () => {
  const r = await gex.getLiquidations({ sym: 'btc', limit: 10 });
  assert.ok(Array.isArray(r.bars) && r.bars.length <= 10);
});

test('getBigTape("btc") returns trades', async () => {
  const r = await gex.getBigTape({ sym: 'btc', min_usd: 1_000_000, limit: 5 });
  assert.ok(Array.isArray(r.trades));
});

test('getGex unknown symbol rejects with an HTTP error', async () => {
  // Bad symbol → 404 (or 429 under burst); point is it rejects, not the code.
  await assert.rejects(() => gex.getGex({ sym: 'xxx' }), /HTTP \d{3}/);
});
