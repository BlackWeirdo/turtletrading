import { z } from 'zod';
import { guard } from './_format.js';
import * as watchlist from '../core/watchlist.js';
import * as stock from '../core/stock.js';
import * as crypto from '../core/crypto.js';
import * as fx from '../core/fx.js';

export function registerWatchlistTools(server) {
  server.tool(
    'watchlist_get',
    'List all saved watchlist items (local file). Each item has symbol/type/added_at.',
    {},
    { readOnlyHint: true },
    guard(watchlist.get)
  );

  server.tool(
    'watchlist_add',
    'Add a symbol to the local watchlist (idempotent). type ∈ stock/crypto/fx.',
    {
      symbol: z.string().min(1),
      type: z.enum(['stock', 'crypto', 'fx']).default('stock'),
    },
    { readOnlyHint: false },
    guard(watchlist.add)
  );

  server.tool(
    'watchlist_remove',
    'Remove a symbol from the local watchlist (all types matching the symbol).',
    { symbol: z.string().min(1) },
    { readOnlyHint: false },
    guard(watchlist.remove)
  );

  server.tool(
    'watchlist_signals',
    'Pull signals for every watchlist item: stocks via Turtle signals, crypto via signal timeline, FX via multi-timeframe regime.',
    {
      include_crypto: z.boolean().default(true),
      include_fx: z.boolean().default(true),
    },
    { readOnlyHint: true, openWorldHint: true },
    guard(async ({ include_crypto = true, include_fx = true }) => {
      const { items } = await watchlist.get();
      const symbolsOfType = (type) => items.filter((i) => i.type === type).map((i) => i.symbol);
      const stockSyms = symbolsOfType('stock');

      const out = {};
      out.stocks = stockSyms.length ? await stock.getSignals({ symbols: stockSyms }) : { count: 0, stocks: [] };

      // Per-item try/catch: one bad symbol must not sink the whole scan.
      if (include_crypto) {
        out.crypto = [];
        for (const coin of symbolsOfType('crypto')) {
          try {
            out.crypto.push(await crypto.getSignal({ coin }));
          } catch (e) {
            out.crypto.push({ coin, error: e.message });
          }
        }
      }
      if (include_fx) {
        out.fx = [];
        for (const symbol of symbolsOfType('fx')) {
          try {
            out.fx.push(await fx.getMtf({ symbol }));
          } catch (e) {
            out.fx.push({ symbol, error: e.message });
          }
        }
      }
      return out;
    })
  );
}
