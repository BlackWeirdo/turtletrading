import { z } from 'zod';
import { guard } from './_format.js';
import * as fx from '../core/fx.js';

const NET = { readOnlyHint: true, openWorldHint: true };

export function registerFxTools(server) {
  server.tool(
    'get_fx_bars',
    'OHLCV candles for an FX pair or metal incl. Gold (XAUUSD). Returns most recent `limit` bars.',
    {
      symbol: z.string().min(1).describe("e.g. 'XAUUSD' (Gold), 'EURUSD'"),
      timeframe: z.enum(['15m', '1h', '4h', '1d']),
      limit: z.number().int().min(1).max(1000).default(200),
    },
    NET,
    guard(fx.getBars, (e, a) => ({
      symbol: a.symbol,
      timeframe: a.timeframe,
      error: 'symbol/timeframe không hỗ trợ',
      detail: e.message,
    }))
  );

  server.tool(
    'get_fx_mtf',
    'Multi-timeframe regime (rh/rf/rd) for an FX/metal symbol via OANDA feed.',
    { symbol: z.string().min(1).describe("e.g. 'XAUUSD'") },
    NET,
    guard(fx.getMtf, (e, a) => ({ symbol: a.symbol }))
  );

  server.tool(
    'get_fx_catalog',
    'Directory of ~120 FX/metal/index/commodity/bond symbols. Filter by category and/or text query (e.g. "gold").',
    {
      category: z.enum(['forex', 'metal', 'index', 'commodity', 'bond']).optional(),
      query: z.string().optional().describe("match symbol/name, e.g. 'gold'"),
    },
    NET,
    guard(fx.getCatalog)
  );
}
