import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as chart from '../src/core/chart.js';
import { isReady, close } from '../src/cdp.js';

// Chart tools require a debug browser (Chrome --remote-debugging-port=9333)
// with app.turtletrading.vn/chart open. These tests are CONDITIONAL: they skip
// (never fail) when CDP is unavailable or no price chart is loaded. NO mocks.

const cdpUp = await isReady();

test('chart_status reports connection state', { skip: !cdpUp && 'CDP :9333 not available' }, async () => {
  const r = await chart.status();
  assert.equal(r.connected, true);
});

test(
  'chart_get_ohlcv(20) returns <=20 bars when a chart is open',
  { skip: !cdpUp && 'CDP :9333 not available' },
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
  { skip: !cdpUp && 'CDP :9333 not available' },
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

test(
  'chart_get_indicators returns real computed values (not schema_unknown)',
  { skip: !cdpUp && 'CDP :9333 not available' },
  async (t) => {
    const r = await chart.getIndicators({ with_values: true });
    if (r.has_chart === false || !r.count) {
      t.skip('no indicators on chart (add some on app.turtletrading.vn/chart)');
      return;
    }
    for (const ind of r.indicators) {
      assert.equal(typeof ind.type, 'string');
      assert.equal('schema_unknown' in ind, false, 'schema_unknown must be gone');
      assert.ok('value' in ind, `indicator ${ind.type} must expose value`);
      if (ind.value && ind.value.kind === 'regime') {
        // regime indicators must surface a raw state string (e.g. up/weak/bull)
        assert.equal(typeof ind.value.value, 'string');
      }
      if (ind.value && ind.value.kind === 'line') {
        assert.equal(typeof ind.value.value, 'number');
      }
    }
  }
);

test(
  'chart_get_indicators(with_values=false) omits value but keeps params',
  { skip: !cdpUp && 'CDP :9333 not available' },
  async (t) => {
    const r = await chart.getIndicators({ with_values: false });
    if (r.has_chart === false || !r.count) {
      t.skip('no indicators on chart');
      return;
    }
    const ind = r.indicators[0];
    assert.equal('value' in ind, false);
    assert.equal(typeof ind.params, 'object');
  }
);

test(
  'chart_get_market_structure swings carry numeric prices + levels',
  { skip: !cdpUp && 'CDP :9333 not available' },
  async (t) => {
    const r = await chart.getMarketStructure({ swings: true });
    if (r.has_chart === false) {
      t.skip('no price chart open');
      return;
    }
    assert.ok(Array.isArray(r.swings));
    if (r.swings.length) {
      for (const s of r.swings) {
        assert.equal(typeof s.price, 'number', 'swing price must be a real number');
        assert.ok(s.type === 'high' || s.type === 'low');
      }
      // at least one of support/resistance should be populated from swings
      const total = r.levels.support.length + r.levels.resistance.length;
      assert.ok(total > 0, 'levels must be derived from swings, not empty');
      for (const p of r.levels.support) assert.equal(typeof p, 'number');
      for (const p of r.levels.resistance) assert.equal(typeof p, 'number');
    }
  }
);

test.after(() => close());
