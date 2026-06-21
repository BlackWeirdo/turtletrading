// Core logic for VN stock tools. Fetch + parse only — no MCP/zod here.
import { fetchJSON } from '../http.js';
import { toUpperSet, filterBySymbols } from '../symbols.js';

const SUMMARY_URL = 'https://data.signals.turtletrading.vn/api/stock/stocks-summary.json';
const LIVE_URL = 'https://data.signals.turtletrading.vn/api/stock/live.json';
const FUND_URL = 'https://phantichcoban.turtletrading.vn/data/stocks.json';

const TTL_SUMMARY = 5 * 60 * 1000; // 5 min
const TTL_LIVE = 45 * 1000; // 45 s
const TTL_FUND = 60 * 60 * 1000; // 1 h (daily data)

// Keep only the fields worth spending tokens on (drops heavy `sp` price arrays).
function slimSignal(x) {
  return {
    symbol: x.symbol,
    exchange: x.exchange,
    industry: x.industry,
    name: x.name,
    state: x.state,
    entry: x.entry,
    entry_time: x.entry_time,
    exit_stop: x.exit_stop,
    original_stop: x.original_stop,
    last_close: x.last_close,
    last_close_time: x.last_close_time,
    regime_d1: x.regime_d1,
    regime_w1: x.regime_w1,
    confluence: x.confluence,
    unreal_pnl_pct: x.unreal_pnl_pct,
    unreal_pnl_R: x.unreal_pnl_R,
    n_days: x.n_days,
    avg_value_bn_vnd: x.avg_value_bn_vnd,
  };
}

export async function getSignals({ symbols } = {}) {
  const json = await fetchJSON(SUMMARY_URL, TTL_SUMMARY);
  const all = json.stocks ?? [];
  const { picked, missing } = filterBySymbols(all, toUpperSet(symbols), (s) => s.symbol);

  return {
    generated_at: json.generated_at,
    count: picked.length,
    stocks: picked.map(slimSignal),
    ...(missing.length && { missing }),
  };
}

export async function getLive({ symbols } = {}) {
  const json = await fetchJSON(LIVE_URL, TTL_LIVE);
  const prices = json.prices ?? {};
  const want = toUpperSet(symbols);

  const keys = want ? [...want] : Object.keys(prices);
  const quotes = [];
  const missing = [];

  for (const sym of keys) {
    const SYM = String(sym).toUpperCase();
    const q = prices[SYM];
    if (!q) {
      missing.push(SYM);
      continue;
    }
    const change_pct =
      q.ref ? Number((((q.price - q.ref) / q.ref) * 100).toFixed(2)) : null;
    quotes.push({ symbol: SYM, price: q.price, high: q.high, low: q.low, ref: q.ref, change_pct });
  }

  return { updated_at: json.updated_at, count: quotes.length, quotes, ...(missing.length && { missing }) };
}

export async function getFundamentals({ symbol }) {
  const json = await fetchJSON(FUND_URL, TTL_FUND);
  const arr = Array.isArray(json) ? json : [];
  const SYM = String(symbol).toUpperCase();
  const x = arr.find((o) => String(o.s ?? '').toUpperCase() === SYM);
  if (!x) return { symbol: SYM, found: false };

  return {
    symbol: x.s,
    found: true,
    name: x.n ?? null,
    exchange: x.e ?? null,
    industry: x.i ?? null,
    price: x.p ?? null,
    market_cap_bn: x.mc ?? null,
    pe: x.pe ?? null,
    pb: x.pb ?? null,
    ps: x.ps ?? null,
    roe: x.roe ?? null,
    roa: x.roa ?? null,
    dividend_yield: x.dy ?? null,
    debt_equity: x.de ?? null,
    net_margin: x.nm ?? null,
    revenue_growth: x.rg ?? null,
    profit_growth: x.pg ?? null,
    intrinsic_value: x.iv ?? null,
    discount_pct: x.disc ?? null,
  };
}
