import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as crypto from '../src/core/crypto.js';

test('getOverview(["BTC"]) returns price and changes', async () => {
  const r = await crypto.getOverview({ coins: ['BTC'] });
  const btc = r.coins.find((c) => c.symbol === 'BTC');
  assert.ok(btc, 'BTC present');
  assert.equal(typeof btc.price, 'number');
  assert.ok('c24h' in btc && 'market_cap' in btc);
});

test('getSignal("BTC") returns timeline + open_position flag', async () => {
  const r = await crypto.getSignal({ coin: 'BTC' });
  assert.equal(r.found, true);
  assert.equal(typeof r.open_position, 'boolean');
  assert.ok(Array.isArray(r.signals));
});

test('getKlines("BTC","1h",10) returns at most 10 OHLCV bars', async () => {
  const r = await crypto.getKlines({ coin: 'BTC', timeframe: '1h', limit: 10 });
  assert.ok(Array.isArray(r.bars));
  assert.ok(r.bars.length <= 10 && r.bars.length > 0);
  assert.equal(r.bars[0].length, 6, 'bar is [t,o,h,l,c,v]');
});

test('getKlines for unknown coin rejects with an HTTP error', async () => {
  await assert.rejects(() => crypto.getKlines({ coin: 'FAKECOIN', timeframe: '1h', limit: 5 }), /HTTP \d{3}/);
});
