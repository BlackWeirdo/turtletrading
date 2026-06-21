import { z } from 'zod';
import { guard } from './_format.js';
import * as crypto from '../core/crypto.js';

const NET = { readOnlyHint: true, openWorldHint: true };

export function registerCryptoTools(server) {
  server.tool(
    'get_crypto_overview',
    'Crypto market overview (price/market_cap/volume + 1h/24h/7d/30d/365d changes). Pass coins to filter, omit for all.',
    { coins: z.array(z.string()).optional().describe("e.g. ['BTC','ETH']; omit = all coins") },
    NET,
    guard(crypto.getOverview)
  );

  server.tool(
    'get_crypto_signal',
    'Turtle entry/exit signal timeline for one coin + whether a position is currently open.',
    { coin: z.string().min(1).describe("e.g. 'BTC'") },
    NET,
    guard(crypto.getSignal)
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
    // HTTP 404 → unsupported coin/timeframe.
    guard(crypto.getKlines, (e, a) => ({
      coin: a.coin,
      timeframe: a.timeframe,
      error: 'coin/timeframe không hỗ trợ',
      detail: e.message,
    }))
  );
}
