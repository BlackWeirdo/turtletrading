import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as chart from '../core/chart.js';
import { isReady } from '../cdp.js';

const RO = { readOnlyHint: true, openWorldHint: true };
const HINT =
  'Open Chrome with --remote-debugging-port=9333 (use scripts/launch-chart-debug.ps1) and load app.turtletrading.vn/chart.';

// All chart_* tools share the same CDP-down handling: report a clear error +
// hint instead of crashing, so the HTTP tools keep working.
function guard(fn, extra = {}) {
  return async (args) => {
    try {
      return jsonResult(await fn(args));
    } catch (e) {
      return jsonResult({ connected: false, error: e.message, hint: HINT, ...extra }, true);
    }
  };
}

export function registerChartTools(server) {
  server.tool(
    'chart_status',
    'Is the live chart reachable via CDP? Returns connection state + sym/tf/src/last + indicator and bar counts.',
    {},
    RO,
    async () => {
      if (!(await isReady())) {
        return jsonResult({ connected: false, hint: HINT });
      }
      try {
        return jsonResult(await chart.status());
      } catch (e) {
        return jsonResult({ connected: false, error: e.message, hint: HINT }, true);
      }
    }
  );

  server.tool(
    'chart_get_view',
    'Snapshot of the chart the user is viewing: sym/tf/src/last, indicators (type+params), drawing count, active overlays.',
    {},
    RO,
    guard(() => chart.getView())
  );

  server.tool(
    'chart_get_indicators',
    'Indicators currently added on the price chart (type + params; last value best-effort). schema_unknown=true until the internal indicator schema is mapped on a real chart.',
    { with_values: z.boolean().default(true) },
    RO,
    guard((args) => chart.getIndicators(args))
  );

  server.tool(
    'chart_get_market_structure',
    'Chart market structure: ATR/noise box overlay, multi-timeframe regime, swing highs/lows and derived support/resistance from the exact bars on screen.',
    { swings: z.boolean().default(true) },
    RO,
    guard((args) => chart.getMarketStructure(args))
  );

  server.tool(
    'chart_get_ohlcv',
    'The exact OHLCV bars rendered on the chart (matches what the user sees). Returns the most recent `limit` bars.',
    { limit: z.number().int().min(1).max(2000).default(300) },
    RO,
    guard((args) => chart.getOhlcv(args))
  );
}
