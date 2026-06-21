import { z } from 'zod';
import { guard } from './_format.js';
import * as gex from '../core/gex.js';

const NET = { readOnlyHint: true, openWorldHint: true };
// GEX / positioning / COT exist for crypto AND gold (GLD options; 'gold'/'xauusd'
// are accepted aliases of 'gld'). Liquidations / big-tape are crypto-only.
const SYM_OPT = z.enum(['btc', 'eth', 'sol', 'gld', 'gold', 'xau', 'xauusd']).default('btc');
const SYM_CRYPTO = z.enum(['btc', 'eth', 'sol']).default('btc');

// Echo the requested symbol back on error so the caller knows which one failed.
const withSym = (e, a) => ({ sym: a.sym });

export function registerGexTools(server) {
  server.tool(
    'get_gex',
    "Options GEX dashboard (BTC/ETH/SOL + Gold via GLD options; sym 'gold'/'xauusd' = GLD): net/call/put GEX, gamma flip, max pain, pin risk, HVL, ATM IV, expected move (σ-bands), vanna/charm + strike profile (levels). Add sections for heavier arrays. This is the GEX/options market-structure layer for gold.",
    {
      sym: SYM_OPT,
      sections: z
        .array(z.enum(['levels', 'profile', 'netdollar']))
        .optional()
        .describe('omit = scalars + levels; add profile/netdollar for the heavy arrays'),
    },
    NET,
    guard(gex.getGex, withSym)
  );

  server.tool(
    'get_positioning',
    "Dealer/retail positioning (BTC/ETH/SOL + Gold via GLD; 'gold'/'xauusd' = GLD): OI (+24h change), funding rates per exchange, long/short ratio, retail vs whale tiers, fear & greed. (For gold, funding is ~0 and fear&greed is absent — ETF, not a perp.)",
    { sym: SYM_OPT },
    NET,
    guard(gex.getPositioning, withSym)
  );

  server.tool(
    'get_cot',
    "COT report (BTC/ETH/SOL + Gold/COMEX via 'gld'/'gold'/'xauusd'): cot_index (0-100), speculative net/long/short positioning, open interest. Set with_history for the weekly series.",
    { sym: SYM_OPT, with_history: z.boolean().default(false) },
    NET,
    guard(gex.getCot, withSym)
  );

  server.tool(
    'get_liquidations',
    'Liquidation zones (crypto only — BTC/ETH/SOL): aggregated long/short liquidation bars (15min interval, ~14 days). Returns most recent `limit` bars.',
    { sym: SYM_CRYPTO, limit: z.number().int().min(1).max(1344).default(96) },
    NET,
    guard(gex.getLiquidations, withSym)
  );

  server.tool(
    'get_big_tape',
    'Large trades tape (crypto only — BTC/ETH/SOL): recent whale trades filtered by min USD size (default $5M). Each trade has ts/venue/side/px/sz/usd.',
    {
      sym: SYM_CRYPTO,
      min_usd: z.number().default(5_000_000),
      limit: z.number().int().min(1).max(200).default(50),
    },
    NET,
    guard(gex.getBigTape, withSym)
  );
}
