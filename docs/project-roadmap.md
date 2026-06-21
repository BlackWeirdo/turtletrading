# Project Roadmap — turtle-trading-mcp

Updated: 2026-06-21

## ✅ Shipped (v1.0.0)
24 tools, HYBRID architecture (HTTP + CDP). `npm test`: 25 pass / 0 fail / 2 skip (real network + real file, no mocks). Code review: 0 critical.

| Area | Tools | Mechanism |
|---|---|---|
| VN stocks | get_stock_signals / live / fundamentals | HTTP |
| Crypto | get_crypto_overview / signal, get_klines | HTTP |
| FX / Gold | get_fx_bars / mtf / catalog | HTTP |
| GEX / dealer flow | get_gex / positioning / cot / liquidations / big_tape | HTTP |
| Watchlist | watchlist_get / add / remove / signals | local file |
| Live chart | chart_status / get_view / get_indicators / get_market_structure / get_ohlcv | CDP |
| Smoke | health | — |

## 🔓 Open items (documented limitations, not bugs)
- **Chart `inds[]` schema**: discovery pending — needs `app.turtletrading.vn/chart` open with indicators (EMA/RSI) in the debug browser. Until then `chart_get_indicators` returns generic scalars + `schema_unknown:true`.
- **FX MTF `rh/rf/rd` semantics**: returned raw (+ note); exact per-timeframe meaning unconfirmed.

## 🧊 Backlog (YAGNI — only if needed later)
- search_symbol, macro/US-stock catalogs, more GEX symbols beyond btc/eth/sol.
- Realtime subscribe / multi-pane chart reading.
- Derive LEVEL BEHAVIOR (Respect/Absorb/Fakeout/Break) client-side from touch history (no endpoint exists).
- Map full `inds[]` schema after on-chart discovery.

## 🔧 Maintenance watch
Endpoints are unofficial pre-built JSON files and CDP keys (`__chart2`) are minified internals — both may change on site updates. Selectors centralized in `src/core/chart.js` + `src/cdp.js`; HTTP parsers are defensive. Re-run `npm test` if data shape looks off.
