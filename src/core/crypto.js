// Core logic for crypto tools. Fetch + parse only.
import { fetchJSON } from '../http.js';
import { sanitizeSymbol, toUpperSet, filterBySymbols } from '../symbols.js';

const OVERVIEW_URL = 'https://data.signals.turtletrading.vn/api/overview/crypto-recent.json';
const BUNDLE_URL = 'https://data.signals.turtletrading.vn/api/bundle.json';
const KLINES_BASE = 'https://data.signals.turtletrading.vn/api/klines/hl';

const TTL_OVERVIEW = 60 * 1000; // 60 s
const TTL_BUNDLE = 5 * 60 * 1000; // 5 min
const TTL_KLINES = { '1h': 60 * 1000, '4h': 5 * 60 * 1000, '1d': 30 * 60 * 1000 };

export async function getOverview({ coins } = {}) {
  const json = await fetchJSON(OVERVIEW_URL, TTL_OVERVIEW);
  const all = json.coins ?? [];
  const { picked, missing } = filterBySymbols(all, toUpperSet(coins), (c) => c.s);

  return {
    updated: json.updated,
    count: picked.length,
    coins: picked.map((c) => ({
      symbol: c.s,
      name: c.n,
      price: c.p,
      market_cap: c.mc,
      volume: c.vol,
      c1h: c.c1h,
      c24h: c.c24,
      c7d: c.c7,
      c30d: c.c30,
      c365d: c.c365,
    })),
    ...(missing.length && { missing }),
  };
}

export async function getSignal({ coin }) {
  const json = await fetchJSON(BUNDLE_URL, TTL_BUNDLE);
  const COIN = String(coin).toUpperCase();
  const entry = json.coins?.[COIN];
  if (!entry) return { coin: COIN, found: false };

  const g = entry.g ?? [];
  const signals = g.map((x) => ({
    time: x.t,
    type: x.s === 1 ? 'entry' : 'exit',
    price: x.p,
    exit: x.x,
  }));
  const last = g[g.length - 1];
  const open_position = !!(last && last.s === 1 && last.x == null);

  return {
    coin: COIN,
    found: true,
    open_position,
    latest: signals[signals.length - 1] ?? null,
    signals: signals.slice(-20),
  };
}

export async function getKlines({ coin, timeframe, limit = 200 }) {
  const COIN = sanitizeSymbol(coin);
  const url = `${KLINES_BASE}/${COIN}/${timeframe}-recent.json`;
  const json = await fetchJSON(url, TTL_KLINES[timeframe] ?? 60 * 1000);
  const bars = (json.bars ?? []).slice(-limit);
  return {
    coin: COIN,
    timeframe,
    count: bars.length,
    format: '[t,o,h,l,c,v]',
    bars,
  };
}
