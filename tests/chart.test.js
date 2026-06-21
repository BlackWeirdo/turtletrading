import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as chart from '../src/core/chart.js';
import { isReady, close } from '../src/cdp.js';

// Chart tools require a debug browser (Chrome --remote-debugging-port=9222)
// with app.turtletrading.vn/chart open. These tests are CONDITIONAL: they skip
// (never fail) when CDP is unavailable or no price chart is loaded. NO mocks.

const cdpUp = await isReady();

test('chart_status reports connection state', { skip: !cdpUp && 'CDP :9222 not available' }, async () => {
  const r = await chart.status();
  assert.equal(r.connected, true);
});

test(
  'chart_get_ohlcv(20) returns <=20 bars when a chart is open',
  { skip: !cdpUp && 'CDP :9222 not available' },
  async (t) => {
    const r = await chart.getOhlcv({ limit: 20 });
    if (r.has_chart === false) {
      t.skip('no price chart open (open app.turtletrading.vn/chart)');
      return;
    }
    assert.ok(Array.isArray(r.bars) && r.bars.length <= 20);
    assert.equal(typeof r.sym, 'string');
  }
);

test(
  'chart_get_view exposes sym/tf when a chart is open',
  { skip: !cdpUp && 'CDP :9222 not available' },
  async (t) => {
    const r = await chart.getView();
    if (r.has_chart === false) {
      t.skip('no price chart open');
      return;
    }
    assert.ok('sym' in r && 'tf' in r);
    assert.ok(Array.isArray(r.indicators));
  }
);

test.after(() => close());
