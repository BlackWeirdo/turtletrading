import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as stock from '../src/core/stock.js';

test('getSignals(["FPT"]) returns FPT with signal fields', async () => {
  const r = await stock.getSignals({ symbols: ['FPT'] });
  assert.ok(Array.isArray(r.stocks));
  const fpt = r.stocks.find((s) => s.symbol === 'FPT');
  assert.ok(fpt, 'FPT present');
  assert.equal(typeof fpt.state, 'string');
  assert.ok('entry' in fpt && 'exit_stop' in fpt && 'confluence' in fpt);
});

test('getSignals reports missing symbols', async () => {
  const r = await stock.getSignals({ symbols: ['FPT', 'NOSUCHTICKER'] });
  assert.ok(Array.isArray(r.missing) && r.missing.includes('NOSUCHTICKER'));
});

test('getLive(["FPT"]) returns a quote or marks it missing', async () => {
  const r = await stock.getLive({ symbols: ['FPT'] });
  const hasQuote = r.quotes.some((q) => q.symbol === 'FPT');
  const isMissing = (r.missing ?? []).includes('FPT');
  assert.ok(hasQuote || isMissing, 'FPT either quoted or explicitly missing');
  if (hasQuote) {
    const q = r.quotes.find((x) => x.symbol === 'FPT');
    assert.equal(typeof q.price, 'number');
  }
});

test('getFundamentals("FPT") returns valuation metrics', async () => {
  const r = await stock.getFundamentals({ symbol: 'FPT' });
  assert.equal(r.found, true);
  assert.equal(typeof r.pe, 'number');
  assert.ok('pb' in r && 'roe' in r && 'intrinsic_value' in r && 'discount_pct' in r);
});

test('getFundamentals(unknown) returns found:false without throwing', async () => {
  const r = await stock.getFundamentals({ symbol: 'NOSUCHTICKER' });
  assert.equal(r.found, false);
});
