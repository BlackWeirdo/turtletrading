import { z } from 'zod';
import { guard } from './_format.js';
import * as stock from '../core/stock.js';

const NET = { readOnlyHint: true, openWorldHint: true };

export function registerStockTools(server) {
  server.tool(
    'get_stock_signals',
    'Turtle trading signals for VN stocks (state/entry/exit_stop/regime/confluence). Pass symbols to filter, omit for all.',
    { symbols: z.array(z.string()).optional().describe("VN tickers, e.g. ['FPT','HPG']; omit = all tracked stocks") },
    NET,
    guard(stock.getSignals)
  );

  server.tool(
    'get_stock_live',
    'Realtime-ish OHLC quotes for VN stocks (price/high/low/ref + change_pct). ~50 symbols during session.',
    { symbols: z.array(z.string()).optional().describe("VN tickers; omit = all symbols present in live feed") },
    NET,
    guard(stock.getLive)
  );

  server.tool(
    'get_stock_fundamentals',
    'Fundamentals & valuation for one VN stock (PE/PB/PS/ROE/ROA/dividend/intrinsic value/discount).',
    { symbol: z.string().min(1).describe("One ticker, e.g. 'FPT'") },
    NET,
    guard(stock.getFundamentals)
  );
}
