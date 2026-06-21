# turtle-trading-mcp

MCP server (Node.js, stdio, **local & read-only**) exposing public `turtletrading.vn`
data to Claude: VN stock signals, crypto, FX/Gold (XAUUSD), GEX / market-structure,
plus reading the **live price chart** you are viewing (via Chrome DevTools Protocol).

> Personal use only. Read-only. **Never places orders.** Do not redistribute the data.

## Requirements
- Node.js **>= 24** (global `fetch` + `WebSocket`).
- (Optional, only for `chart_*` tools) Google Chrome.

## Install
```bash
cd turtle-trading-mcp
npm install
npm test          # real-network tests (chart tests skip without a debug browser)
node src/server.js   # smoke: prints "turtle-trading-mcp started" to stderr
```

## Tools (~22)
**VN stocks** (HTTP): `get_stock_signals`, `get_stock_live`, `get_stock_fundamentals`
**Crypto** (HTTP): `get_crypto_overview`, `get_crypto_signal`, `get_klines`
**FX / Gold** (HTTP): `get_fx_bars`, `get_fx_mtf`, `get_fx_catalog`
**Options & dealer flow — BTC/ETH/SOL + Gold (GLD)** (HTTP): `get_gex`, `get_positioning`, `get_cot` (pass `sym:'gold'`/`'xau'`/`'xauusd'` → maps to GLD options / COMEX COT)
**Liquidations & big tape — crypto only** (HTTP): `get_liquidations`, `get_big_tape`
**Watchlist** (local file): `watchlist_get`, `watchlist_add`, `watchlist_remove`, `watchlist_signals`
**Live chart** (CDP): `chart_status`, `chart_get_view`, `chart_get_indicators`, `chart_get_market_structure`, `chart_get_ohlcv`
Plus `health`.

## Architecture (HYBRID)
- **HTTP** — most data. Public JSON on `*.turtletrading.vn`, no auth. No browser needed.
- **CDP** — only the `chart_*` tools. They read `window.__chart2` inside the
  `chart.turtletrading.vn` iframe of the page you have open. **Isolated**: if the
  debug browser is closed, only `chart_*` return a clear error — every HTTP tool keeps working.

## Connect to Claude
Edit the example for your client (use an **absolute** path to `src/server.js`):
- Claude Desktop → merge `config-examples/claude_desktop_config.json` into your `claude_desktop_config.json`.
- Claude Code → merge `config-examples/mcp.json` (or drop a project-scope `.mcp.json`).

Back up your existing config before merging. **Fully quit and reopen** the client
afterwards (closing the window is not enough — Claude Desktop keeps running in the
system tray and only re-reads the config on a real restart).

### ⚠️ Claude Desktop installed from the Microsoft Store (MSIX)
The Store build does NOT read `%APPDATA%\Roaming\Claude\claude_desktop_config.json`.
Its AppData is virtualized — the file it actually reads is:
```
%LOCALAPPDATA%\Packages\Claude_<id>\LocalCache\Roaming\Claude\claude_desktop_config.json
```
(e.g. `...\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\...`). Edit THAT
file, keep any existing `preferences` block intact, then fully restart.

## Enabling the live-chart tools (optional)
1. Launch a debug Chrome and open the chart:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\launch-chart-debug.ps1
   ```
   (Uses a separate profile `%LOCALAPPDATA%\turtle-chart-debug`, port 9333.)
2. On the opened `app.turtletrading.vn/chart` page, add your indicators.
3. Ask Claude e.g. *"Indicator tôi đang để trên chart là gì?"* → `chart_get_view`.

Without this, `chart_*` return `{ connected:false, hint:... }` and everything else still works.

## Validation checklist
- `health` → ok.
- "Tín hiệu Turtle của FPT?" → `get_stock_signals(['FPT'])`.
- "Cơ bản FPT (PE/ROE/định giá)?" → `get_stock_fundamentals('FPT')`.
- "BTC đang mở vị thế Turtle?" → `get_crypto_signal('BTC')`.
- "Nến Vàng 1h" → `get_fx_bars('XAUUSD','1h')`.
- "GEX / gamma flip / max pain BTC?" → `get_gex('btc')`.
- "GEX / Call wall / max pain Vàng?" → `get_gex('gold')`.
- "Funding & L/S BTC?" → `get_positioning('btc')`.
- "Big tape BTC?" → `get_big_tape('btc')`.
- "Indicator tôi đang để trên chart?" → `chart_get_view` (cần debug browser + /chart).

## Notes / limits
- Endpoints are unofficial pre-built files — they may change; tools parse defensively.
- `chart_get_indicators` / `chart_get_view` return each indicator as `{id,type,hidden,params,value}`.
  `value` is read from `inds[]._lastRes` in the engine:
  - Regime indicators (trenddet / adxregime / supertrendreg / squeeze / volregime / bullbear / structure / volumereg) → `{kind:"regime", value:"<raw state>"}` e.g. `up`, `weak`, `bull`, `sideways`, `range`, `low`, `downtrend`, `normal` …
  - Single-line (ema) → `{kind:"line", value:<number>}`
  - Multi-line (macd / rsi) → `{kind:"multi", values:{…}}`
  - SMC → `{kind:"multi", values:{fvg, ob, pdz, struct, liq, swings}}`
  Values are raw from the engine — not translated or inferred.
- `chart_get_market_structure`: swings now include real price + full support/resistance levels.
- FX MTF `rh/rf/rd` returned raw (positive = up, negative = down); exact per-timeframe meaning unconfirmed.
