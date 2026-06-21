// Core logic for Market Structure / GEX tools (options & dealer flow).
// All HTTP (Approach B) — NO CDP.
// Symbols: btc/eth/sol (crypto) + gld (Gold ETF options, used for XAUUSD).
// GEX / positioning / COT exist for gld; liquidations / big-tape are crypto-only.
import { fetchJSON } from '../http.js';
import { lowerSymbol } from '../symbols.js';

const BASE = 'https://data.signals.turtletrading.vn/api';

const TTL_GEX = 30 * 1000; // 30 s
const TTL_POS = 60 * 1000; // 60 s
const TTL_COT = 6 * 60 * 60 * 1000; // 6 h (weekly data)
const TTL_LIQ = 60 * 1000; // 60 s
const TTL_TAPE = 30 * 1000; // 30 s

// Gold maps to the GLD options series. Accept the common ways a caller refers
// to gold so "gold"/"xauusd"/"xau" all resolve to the provider's `gld` feed.
// Kept in sync with SYM_OPT in tools/gex.js so every accepted symbol resolves.
const GOLD_ALIASES = new Set(['gld', 'gold', 'xau', 'xauusd']);
function resolveSym(sym) {
  const s = lowerSymbol(sym);
  return GOLD_ALIASES.has(s) ? 'gld' : s;
}

export async function getGex({ sym = 'btc', sections } = {}) {
  const s = resolveSym(sym);
  const json = await fetchJSON(`${BASE}/gex/${s}/today.json`, TTL_GEX);
  const out = {
    sym: json.sym ?? s,
    ts: json.ts,
    spot: json.spot,
    net_gex: json.net_gex,
    net_gex_0dte: json.net_gex_0dte,
    call_gex: json.call_gex,
    put_gex: json.put_gex,
    gex_notional: json.gex_notional,
    pc_ratio: json.pc_ratio,
    vanna: json.vanna,
    charm: json.charm,
    regime: json.regime,
    gex_sig: json.gex_sig,
    gamma_flip: json.gamma_flip,
    max_pain: json.max_pain,
    pin_risk: json.pin_risk,
    atm_iv: json.atm_iv,
    em1: json.em1,
    em2: json.em2,
    em_up1: json.em_up1,
    em_dn1: json.em_dn1,
    em_up2: json.em_up2,
    em_dn2: json.em_dn2,
    touch_horizon_h: json.touch_horizon_h,
    nearest_expiry: json.nearest_expiry,
    hvl: json.hvl,
  };
  // levels (strike profile) is the most useful array → included by default.
  const want = new Set(Array.isArray(sections) ? sections : []);
  out.levels = json.levels ?? [];
  if (want.has('profile')) out.profile = json.profile ?? [];
  if (want.has('netdollar')) {
    out.netdollar = json.netdollar ?? [];
    out.nd_bucket = json.nd_bucket;
  }
  return out;
}

export async function getPositioning({ sym = 'btc' } = {}) {
  const s = resolveSym(sym);
  const json = await fetchJSON(`${BASE}/cga/${s}/pos.json`, TTL_POS);
  return {
    sym: json.sym ?? s,
    generated_at: json.generated_at,
    oi_usd: json.oi_usd,
    oi_chg_24h: json.oi_chg_24h,
    oi_by_ex: json.oi_by_ex,
    funding: json.funding,
    lsr: json.lsr,
    tiers: json.tiers,
    fng: json.fng,
  };
}

export async function getCot({ sym = 'btc', with_history = false } = {}) {
  const s = resolveSym(sym);
  const json = await fetchJSON(`${BASE}/cot/${s}.json`, TTL_COT);
  const out = {
    sym: json.sym ?? s,
    market: json.market,
    report_date: json.report_date,
    cot_index: json.cot_index,
    spec_net: json.spec_net,
    spec_long: json.spec_long,
    spec_short: json.spec_short,
    spec_chg: json.spec_chg,
    other_net: json.other_net,
    other_label: json.other_label,
    oi: json.oi,
    n_weeks: json.n_weeks,
  };
  if (with_history) out.hist = json.hist ?? [];
  return out;
}

export async function getLiquidations({ sym = 'btc', limit = 96 } = {}) {
  const s = lowerSymbol(sym);
  const json = await fetchJSON(`${BASE}/cga/${s}/liqagg.json`, TTL_LIQ);
  const bars = (json.bars ?? []).slice(-limit);
  return { sym: s, interval: json.interval, days: json.days, count: bars.length, bars };
}

export async function getBigTape({ sym = 'btc', min_usd = 5_000_000, limit = 50 } = {}) {
  const s = lowerSymbol(sym);
  const json = await fetchJSON(`${BASE}/whale/${s}/bigtape_recent.json`, TTL_TAPE);
  const all = json.trades ?? [];
  const filtered = all.filter((t) => Number(t.usd) >= min_usd).slice(-limit);
  return { sym: s, floor_usd: json.floor_usd, min_usd, count: filtered.length, trades: filtered };
}
