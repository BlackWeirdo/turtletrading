# CLAUDE.md — turtle-trading-mcp

MCP server cá nhân, local, **chỉ đọc** dữ liệu công khai `turtletrading.vn`. **KHÔNG đặt lệnh.**

## Ngôn ngữ
Trả lời người dùng bằng **tiếng Việt**. Code/comment/commit bằng tiếng Anh.

## Decision tree — chọn tool nào

| Người dùng hỏi | Tool |
|---|---|
| Tín hiệu Turtle CK Việt (vào/ra, stop, regime, confluence) | `get_stock_signals` |
| Giá realtime CK Việt | `get_stock_live` |
| Cơ bản/định giá CK Việt (PE/PB/ROE/IV/discount) | `get_stock_fundamentals` |
| Tổng quan thị trường crypto | `get_crypto_overview` |
| Tín hiệu vào/ra 1 coin + đang mở vị thế? | `get_crypto_signal` |
| Nến OHLCV crypto | `get_klines` (TF 1h/4h/1d) |
| Nến FX / Vàng (XAUUSD) | `get_fx_bars` (TF 15m/1h/4h/1d) |
| Regime đa khung FX/Vàng | `get_fx_mtf` |
| Tra cứu symbol FX/metal/index/commodity | `get_fx_catalog` |
| GEX / gamma flip / max pain / ATM IV / expected move (BTC/ETH/SOL) | `get_gex` |
| Funding / OI / L/S ratio / retail-whale / F&G | `get_positioning` |
| COT index + spec positioning | `get_cot` |
| Vùng thanh lý (liquidation zones) | `get_liquidations` |
| Lệnh lớn (whale big tape) | `get_big_tape` |
| Watchlist cá nhân (xem/thêm/xóa) | `watchlist_get` / `watchlist_add` / `watchlist_remove` |
| Quét tín hiệu tất cả mã trong watchlist | `watchlist_signals` |
| "Indicator tôi đang để trên chart là gì?" / nến đúng trên chart | `chart_status` / `chart_get_view` / `chart_get_indicators` / `chart_get_ohlcv` / `chart_get_market_structure` |

## Phân biệt quan trọng
- **Market Structure / GEX** (`get_gex`...) = HTTP công khai, KHÔNG cần browser.
- **Indicator trên price chart** (`chart_*`) = đọc chart SỐNG qua CDP → **cần Chrome mở `--remote-debugging-port=9222`** và đang ở `app.turtletrading.vn/chart`. Nếu không, `chart_*` báo lỗi rõ + hint, mọi tool HTTP khác vẫn chạy bình thường.

## Quy tắc
- Read-only, không đặt lệnh, không redistribute data (dùng cá nhân).
- Giá CK Việt = VND; crypto = USD; timestamp UTC (ms hoặc ISO).
- Endpoint không chính thức (file build sẵn) → có thể đổi; tool parse phòng thủ, lỗi báo rõ thay vì crash.
- `chart_*` dùng key engine nội bộ minified (`__chart2`) → dễ vỡ khi site update; selector gom hết trong `src/core/chart.js` + `src/cdp.js`.
- `rh/rf/rd` (FX MTF regime): trả raw + note, dương=tăng/âm=giảm; ngữ nghĩa từng khung chưa xác nhận tuyệt đối.
- Schema `inds[]` của chart chưa map đầy đủ → `chart_get_indicators` trả `schema_unknown:true` + rút field scalar (không đoán bừa).

## Test
`npm test` → `node --test`. Test gọi endpoint THẬT + ghi/đọc file watchlist THẬT (KHÔNG mock). Test chart skip nếu không có browser debug.
