import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fx from '../src/core/fx.js';

test('getCatalog({query:"gold"}) includes XAUUSD', async () => {
  const r = await fx.getCatalog({ query: 'gold' });
  assert.ok(Array.isArray(r.items));
  assert.ok(r.items.some((x) => x.symbol === 'XAUUSD'), 'XAUUSD present');
});

test('getBars("XAUUSD","1h",10) returns <=10 bars with a pair', async () => {
  const r = await fx.getBars({ symbol: 'XAUUSD', timeframe: '1h', limit: 10 });
  assert.ok(Array.isArray(r.bars));
  assert.ok(r.bars.length <= 10 && r.bars.length > 0);
  assert.equal(r.bars[0].length, 6);
  assert.ok(r.pair, 'pair field present');
});

test('getMtf("XAUUSD") returns regime rh/rf/rd', async () => {
  const r = await fx.getMtf({ symbol: 'XAUUSD' });
  assert.equal(r.found, true);
  assert.ok(r.regime && 'rh' in r.regime && 'rf' in r.regime && 'rd' in r.regime);
});

test('getBars for unknown symbol rejects with an HTTP error', async () => {
  await assert.rejects(() => fx.getBars({ symbol: 'FAKEPAIR', timeframe: '1h', limit: 5 }), /HTTP \d{3}/);
});
