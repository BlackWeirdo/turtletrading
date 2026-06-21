import { z } from 'zod';
import { jsonResult, guard } from './_format.js';
import * as chart from '../core/chart.js';
import { isReady } from '../cdp.js';

const RO = { readOnlyHint: true, openWorldHint: true };
const HINT =
  'Open Chrome with --remote-debugging-port=9333 (use scripts/launch-chart-debug.ps1) and load app.turtletrading.vn/chart.';

// All chart_* tools share the same CDP-down handling: report a clear error +
// hint instead of crashing, so the HTTP tools keep working.
const chartError = () => ({ connected: false, hint: HINT });

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
      return guard(chart.status, chartError)();
    }
  );

  server.tool(
    'chart_get_view',
    'Snapshot of the chart the user is viewing: sym/tf/src/last, indicators (type+params+real computed value), drawing count, active overlays.',
    {},
    RO,
    guard(chart.getView, chartError)
  );

  server.tool(
    'chart_get_indicators',
    'Indicators currently added on the price chart with their REAL computed values: {id,type,hidden,params,value}. `value` is read from the engine result (regime indicators -> {kind:"regime",value:"up"/"weak"/"bull"/...}; line -> {kind:"line",value:<num>}; multi-line like macd/rsi -> {kind:"multi",values:{...}}; smc -> {kind:"multi",values:{fvg,ob,...}}). Values are raw from the engine; do not relabel/translate.',
    { with_values: z.boolean().default(true) },
    RO,
    guard(chart.getIndicators, chartError)
  );

  server.tool(
    'chart_get_market_structure',
    'Chart market structure: ATR/noise box overlay, multi-timeframe regime, swing highs/lows and derived support/resistance from the exact bars on screen.',
    { swings: z.boolean().default(true) },
    RO,
    guard(chart.getMarketStructure, chartError)
  );

  server.tool(
    'chart_get_ohlcv',
    'The exact OHLCV bars rendered on the chart (matches what the user sees). Returns the most recent `limit` bars.',
    { limit: z.number().int().min(1).max(2000).default(300) },
    RO,
    guard(chart.getOhlcv, chartError)
  );
}
