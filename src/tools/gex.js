import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as gex from '../core/gex.js';

const NET = { readOnlyHint: true, openWorldHint: true };
const SYM = z.enum(['btc', 'eth', 'sol']).default('btc');

export function registerGexTools(server) {
  server.tool(
    'get_gex',
    'Options GEX dashboard: net/call/put GEX, gamma flip, max pain, pin risk, ATM IV, expected move, vanna/charm + strike profile (levels). Add sections for heavier arrays.',
    {
      sym: SYM,
      sections: z
        .array(z.enum(['levels', 'profile', 'netdollar']))
        .optional()
        .describe('omit = scalars + levels; add profile/netdollar for the heavy arrays'),
    },
    NET,
    async (args) => {
      try {
        return jsonResult(await gex.getGex(args));
      } catch (e) {
        return jsonResult({ sym: args.sym, error: e.message }, true);
      }
    }
  );

  server.tool(
    'get_positioning',
    'Dealer/retail positioning: OI (+24h change), funding rates per exchange, long/short ratio, retail vs whale tiers, fear & greed.',
    { sym: SYM },
    NET,
    async (args) => {
      try {
        return jsonResult(await gex.getPositioning(args));
      } catch (e) {
        return jsonResult({ sym: args.sym, error: e.message }, true);
      }
    }
  );

  server.tool(
    'get_cot',
    'COT report: cot_index (0-100), speculative net/long/short positioning, open interest. Set with_history for the weekly series.',
    { sym: SYM, with_history: z.boolean().default(false) },
    NET,
    async (args) => {
      try {
        return jsonResult(await gex.getCot(args));
      } catch (e) {
        return jsonResult({ sym: args.sym, error: e.message }, true);
      }
    }
  );

  server.tool(
    'get_liquidations',
    'Liquidation zones: aggregated long/short liquidation bars (15min interval, ~14 days). Returns most recent `limit` bars.',
    { sym: SYM, limit: z.number().int().min(1).max(1344).default(96) },
    NET,
    async (args) => {
      try {
        return jsonResult(await gex.getLiquidations(args));
      } catch (e) {
        return jsonResult({ sym: args.sym, error: e.message }, true);
      }
    }
  );

  server.tool(
    'get_big_tape',
    'Large trades tape: recent whale trades filtered by min USD size (default $5M). Each trade has ts/venue/side/px/sz/usd.',
    {
      sym: SYM,
      min_usd: z.number().default(5_000_000),
      limit: z.number().int().min(1).max(200).default(50),
    },
    NET,
    async (args) => {
      try {
        return jsonResult(await gex.getBigTape(args));
      } catch (e) {
        return jsonResult({ sym: args.sym, error: e.message }, true);
      }
    }
  );
}
