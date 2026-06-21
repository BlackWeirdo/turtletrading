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

test('getGex("gld") returns the gold options GEX layer', async () => {
  const r = await gex.getGex({ sym: 'gld' });
  assert.match(r.sym, /^gld$/i);
  assert.equal(typeof r.net_gex, 'number');
  assert.ok('max_pain' in r && 'gamma_flip' in r && 'hvl' in r);
  assert.ok(Array.isArray(r.levels) && r.levels.length > 0);
});

test('getGex gold aliases ("gold"/"xau"/"xauusd") resolve to GLD', async () => {
  for (const sym of ['gold', 'xau', 'xauusd']) {
    const r = await gex.getGex({ sym });
    assert.match(r.sym, /^gld$/i, `alias ${sym} must resolve to GLD`);
  }
});

test('getCot("gold") returns the COMEX gold COT', async () => {
  const r = await gex.getCot({ sym: 'gold' });
  assert.equal(typeof r.cot_index, 'number');
  assert.match(String(r.market), /GOLD/i);
});

test('getCot("gold", with_history) returns the weekly series', async () => {
  const r = await gex.getCot({ sym: 'gold', with_history: true });
  assert.ok(Array.isArray(r.hist), 'hist must be an array when with_history=true');
});

test('getPositioning("gold") returns OI for the gold series', async () => {
  const r = await gex.getPositioning({ sym: 'gold' });
  assert.equal(r.sym, 'gld');
  assert.equal(typeof r.oi_usd, 'number');
});

test('getGex unknown symbol rejects with an HTTP error', async () => {
  // Bad symbol → 404 (or 429 under burst); point is it rejects, not the code.
  await assert.rejects(() => gex.getGex({ sym: 'xxx' }), /HTTP \d{3}/);
});
