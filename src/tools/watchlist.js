import { z } from 'zod';
import { jsonResult } from './_format.js';
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
    async () => {
      try {
        return jsonResult(await watchlist.get());
      } catch (e) {
        return jsonResult({ error: e.message }, true);
      }
    }
  );

  server.tool(
    'watchlist_add',
    'Add a symbol to the local watchlist (idempotent). type ∈ stock/crypto/fx.',
    {
      symbol: z.string().min(1),
      type: z.enum(['stock', 'crypto', 'fx']).default('stock'),
    },
    { readOnlyHint: false },
    async (args) => {
      try {
        return jsonResult(await watchlist.add(args));
      } catch (e) {
        return jsonResult({ error: e.message }, true);
      }
    }
  );

  server.tool(
    'watchlist_remove',
    'Remove a symbol from the local watchlist (all types matching the symbol).',
    { symbol: z.string().min(1) },
    { readOnlyHint: false },
    async (args) => {
      try {
        return jsonResult(await watchlist.remove(args));
      } catch (e) {
        return jsonResult({ error: e.message }, true);
      }
    }
  );

  server.tool(
    'watchlist_signals',
    'Pull signals for every watchlist item: stocks via Turtle signals, crypto via signal timeline, FX via multi-timeframe regime.',
    {
      include_crypto: z.boolean().default(true),
      include_fx: z.boolean().default(true),
    },
    { readOnlyHint: true, openWorldHint: true },
    async ({ include_crypto = true, include_fx = true }) => {
      try {
        const { items } = await watchlist.get();
        const stockSyms = items.filter((i) => i.type === 'stock').map((i) => i.symbol);
        const cryptoSyms = items.filter((i) => i.type === 'crypto').map((i) => i.symbol);
        const fxSyms = items.filter((i) => i.type === 'fx').map((i) => i.symbol);

        const out = {};
        out.stocks = stockSyms.length ? await stock.getSignals({ symbols: stockSyms }) : { count: 0, stocks: [] };

        if (include_crypto) {
          out.crypto = [];
          for (const coin of cryptoSyms) {
            try {
              out.crypto.push(await crypto.getSignal({ coin }));
            } catch (e) {
              out.crypto.push({ coin, error: e.message });
            }
          }
        }
        if (include_fx) {
          out.fx = [];
          for (const symbol of fxSyms) {
            try {
              out.fx.push(await fx.getMtf({ symbol }));
            } catch (e) {
              out.fx.push({ symbol, error: e.message });
            }
          }
        }
        return jsonResult(out);
      } catch (e) {
        return jsonResult({ error: e.message }, true);
      }
    }
  );
}
