# Project Roadmap — turtle-trading-mcp

Updated: 2026-06-21

## ✅ Shipped (v1.0.0 → v1.2.0)
24 tools, HYBRID architecture (HTTP + CDP). `npm test`: 30 pass / 0 fail / 2 skip (real network + real file, no mocks). Code review: 0 critical.

| Area | Tools / Module | Mechanism |
|---|---|---|
| VN stocks | get_stock_signals / live / fundamentals | HTTP |
| Crypto | get_crypto_overview / signal, get_klines | HTTP |
| FX / Gold | get_fx_bars / mtf / catalog | HTTP |
| GEX / dealer flow | get_gex / positioning / cot / liquidations / big_tape (BTC/ETH/SOL **+ GOLD/GLD**) | HTTP |
| Watchlist | watchlist_get / add / remove / signals | local file |
| Live chart | chart_status / get_view / get_indicators / get_market_structure / get_ohlcv | CDP |
| Smoke | health | — |
| Symbol normalization | `src/symbols.js` — `sanitizeSymbol`, `lowerSymbol`, `toUpperSet`, `filterBySymbols` | shared util |
| Uniform error handling | `src/tools/_format.js` — `guard()` try/catch wrapper for all tool callbacks | shared util |

### v1.1.0 changes
- **Chart indicator values**: `chart_get_indicators` / `chart_get_view` now read real values from `inds[]._lastRes`. Each indicator returns `{id,type,hidden,params,value}` with `value.kind` one of `regime`, `line`, `multi`. `chart_get_market_structure` swings include real price + full support/resistance.
- **`src/symbols.js`**: centralized symbol sanitization used by all core modules.
- **`guard()` in `_format.js`**: uniform try/catch wrapper; all tool handlers wrapped via `guard()`

### v1.2.0 changes
- **Gold (GLD) symbol support in GEX layer**: `get_gex` / `get_positioning` / `get_cot` now accept `gold` / `xau` / `xauusd` → resolved to `gld` internally. Reads from `api/gex/gld/today.json` (call/put walls, max pain, gamma flip), `api/cga/gld/pos.json` (funding, OI, LSR, retail-whale tiers, Fear&Greed), `api/cot/gld.json` (COMEX spec positioning, COT index).
- **Symbol resolution layer**: `core/gex.js` adds `resolveSym()` to unify BTC/ETH/SOL + GOLD aliases; `tools/gex.js` separates enum `SYM_OPT` (option symbols: btc/eth/sol/gld/gold/xau/xauusd) from `SYM_CRYPTO` (liquidation/bigtape crypto-only: btc/eth/sol).
- **Real endpoints verified** (2026-06-21): gold GEX/positioning/COT all return HTTP 200; liquidations/bigtape return 404 for gold (ETF, no perps). +5 unit tests (all real data, no mocks).

## 🔓 Open items (documented limitations, not bugs)
- **FX MTF `rh/rf/rd` semantics**: returned raw (+ note); exact per-timeframe meaning unconfirmed.

## 🧊 Backlog (YAGNI — only if needed later)
- search_symbol, macro/US-stock catalogs.
- Additional GEX symbols (copper, oil, etc.) — requires endpoint verification.
- Realtime subscribe / multi-pane chart reading.
- Derive LEVEL BEHAVIOR (Respect/Absorb/Fakeout/Break) client-side from touch history (no endpoint exists).

## 🔧 Maintenance watch
Endpoints are unofficial pre-built JSON files and CDP keys (`__chart2`) are minified internals — both may change on site updates. Selectors centralized in `src/core/chart.js` + `src/cdp.js`; HTTP parsers are defensive. Re-run `npm test` if data shape looks off.
