import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerHealthTools } from './tools/health.js';
import { registerStockTools } from './tools/stock.js';
import { registerCryptoTools } from './tools/crypto.js';
import { registerFxTools } from './tools/fx.js';
import { registerWatchlistTools } from './tools/watchlist.js';
import { registerGexTools } from './tools/gex.js';
import { registerChartTools } from './tools/chart.js';

// Decision tree for Claude — finalized in phase 08.
const INSTRUCTIONS = `turtle-trading: read-only access to public turtletrading.vn data. NEVER place orders.

Use:
- VN stocks: get_stock_signals / get_stock_live / get_stock_fundamentals
- Crypto: get_crypto_overview / get_crypto_signal / get_klines
- FX & Gold (XAUUSD): get_fx_bars / get_fx_mtf / get_fx_catalog
- Options & dealer flow (BTC/ETH/SOL): get_gex / get_positioning / get_cot / get_liquidations / get_big_tape
- Watchlist (local file): watchlist_get / watchlist_add / watchlist_remove / watchlist_signals
- Live price chart (CDP, needs Chrome --remote-debugging-port=9333 + chart open): chart_status / chart_get_view / chart_get_indicators / chart_get_market_structure / chart_get_ohlcv

chart_* tools require a debug browser; if unavailable they return a clear error while every other tool keeps working.`;

const server = new McpServer(
  {
    name: 'turtle-trading',
    version: '1.0.0',
    description: 'Read-only MCP for public turtletrading.vn data (VN stocks, crypto, FX/Gold, GEX, live chart).',
  },
  { instructions: INSTRUCTIONS }
);

// Register tool groups. HTTP-based groups are added as phases land.
registerHealthTools(server);
registerStockTools(server);
registerCryptoTools(server);
registerFxTools(server);
registerWatchlistTools(server);
registerGexTools(server);
registerChartTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

// Startup notice goes to stderr so it never corrupts the MCP stdio stream.
process.stderr.write('turtle-trading-mcp started\n');
