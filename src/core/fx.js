// Core logic for FX / metal (Gold XAUUSD) tools. Fetch + parse only.
// NOTE: real FX candles live on data.signals.../api/fxbars/ — NOT
// chart.../api/klines/oa (that route returns an HTML SPA shell, not data).
import { fetchJSON } from '../http.js';
import { sanitizeSymbol } from '../symbols.js';

const FXBARS_BASE = 'https://data.signals.turtletrading.vn/api/fxbars';
const MTF_BASE = 'https://data.signals.turtletrading.vn/mtf';
const FX_CATALOG_URL = 'https://chart.turtletrading.vn/api/fx/catalog';

const TTL_FXBARS = { '15m': 60 * 1000, '1h': 60 * 1000, '4h': 5 * 60 * 1000, '1d': 30 * 60 * 1000 };
const TTL_MTF = 60 * 1000; // 60 s
const TTL_CATALOG = 24 * 60 * 60 * 1000; // 24 h (near-static)

export async function getBars({ symbol, timeframe, limit = 200 }) {
  const SYM = sanitizeSymbol(symbol);
  const url = `${FXBARS_BASE}/${SYM}/${timeframe}-recent.json`;
  const json = await fetchJSON(url, TTL_FXBARS[timeframe] ?? 60 * 1000);
  const bars = (json.bars ?? []).slice(-limit);
  return {
    symbol: SYM,
    pair: json.pair ?? null,
    timeframe,
    count: bars.length,
    format: '[t,o,h,l,c,v]',
    bars,
  };
}

export async function getMtf({ symbol }) {
  const SYM = sanitizeSymbol(symbol);
  const url = `${MTF_BASE}/fx:${SYM}`;
  const json = await fetchJSON(url, TTL_MTF);
  const coins = json.coins ?? {};
  const key = Object.keys(coins)[0];
  if (!key) return { symbol: SYM, found: false };
  const r = coins[key] ?? {};
  return {
    symbol: SYM,
    found: true,
    updated: json.u,
    src: json.src,
    regime: { rh: r.rh ?? null, rf: r.rf ?? null, rd: r.rd ?? null },
    note: 'rh/rf/rd = multi-timeframe regime codes; positive = up, negative = down (raw values, exact per-timeframe meaning unconfirmed)',
  };
}

export async function getCatalog({ category, query } = {}) {
  const json = await fetchJSON(FX_CATALOG_URL, TTL_CATALOG);
  let items = Array.isArray(json) ? json : [];
  if (category) items = items.filter((x) => x.c === category);
  if (query) {
    const q = String(query).toLowerCase();
    items = items.filter(
      (x) => String(x.s ?? '').toLowerCase().includes(q) || String(x.n ?? '').toLowerCase().includes(q)
    );
  }
  return {
    count: items.length,
    items: items.map((x) => ({ symbol: x.s, id: x.i, name: x.n, category: x.c, precision: x.p })),
  };
}
