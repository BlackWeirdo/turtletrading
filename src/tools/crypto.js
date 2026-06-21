import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as crypto from '../core/crypto.js';

const NET = { readOnlyHint: true, openWorldHint: true };

export function registerCryptoTools(server) {
  server.tool(
    'get_crypto_overview',
    'Crypto market overview (price/market_cap/volume + 1h/24h/7d/30d/365d changes). Pass coins to filter, omit for all.',
    { coins: z.array(z.string()).optional().describe("e.g. ['BTC','ETH']; omit = all coins") },
    NET,
    async (args) => {
      try {
        return jsonResult(await crypto.getOverview(args));
      } catch (e) {
        return jsonResult({ error: e.message }, true);
      }
    }
  );

  server.tool(
    'get_crypto_signal',
    'Turtle entry/exit signal timeline for one coin + whether a position is currently open.',
    { coin: z.string().min(1).describe("e.g. 'BTC'") },
    NET,
    async (args) => {
      try {
        return jsonResult(await crypto.getSignal(args));
      } catch (e) {
        return jsonResult({ error: e.message }, true);
      }
    }
  );

  server.tool(
    'get_klines',
    'OHLCV candlesticks for a coin. Volume is in coin units. Returns the most recent `limit` bars.',
    {
      coin: z.string().min(1).describe("e.g. 'BTC'"),
      timeframe: z.enum(['1h', '4h', '1d']),
      limit: z.number().int().min(1).max(1000).default(200),
    },
    NET,
    async (args) => {
      try {
        return jsonResult(await crypto.getKlines(args));
      } catch (e) {
        // HTTP 404 → unsupported coin/timeframe.
        return jsonResult(
          { coin: args.coin, timeframe: args.timeframe, error: 'coin/timeframe không hỗ trợ', detail: e.message },
          true
        );
      }
    }
  );
}
