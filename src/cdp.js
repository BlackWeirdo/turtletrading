// Raw Chrome DevTools Protocol client — 0 dependency (Node 24 global WebSocket).
// Purpose: read the LIVE price chart the user is viewing on
// app.turtletrading.vn/chart. The chart is a cross-origin iframe served from
// chart.turtletrading.vn, so we must evaluate in THAT iframe's execution
// context (found via Runtime.executionContextCreated + origin match), not the
// top page. Read-only: we only Runtime.evaluate expressions that extract
// primitives from window.__chart2.

const HOST = 'localhost';
// Dedicated port for Turtle's debug Chrome. Intentionally NOT 9222 — that port
// is used by the separate TradingView MCP / TradingView Desktop, so using a
// distinct port lets both coexist without conflict.
const DEFAULT_PORT = 9333;
const CHART_ORIGIN = 'https://chart.turtletrading.vn';
const CONNECT_TIMEOUT = 5000;
const EVAL_TIMEOUT = 5000;

let ws = null;
let msgId = 0;
let chartContextId = null;
const pending = new Map(); // id -> { resolve, reject }
const contexts = new Map(); // executionContextId -> origin

function reset() {
  try {
    ws?.close();
  } catch {}
  ws = null;
  chartContextId = null;
  contexts.clear();
  for (const { reject } of pending.values()) reject(new Error('CDP connection reset'));
  pending.clear();
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`CDP timeout for ${method}`));
      }
    }, EVAL_TIMEOUT);
    const wrapped = {
      resolve: (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    };
    pending.set(id, wrapped);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function findChartTarget(port) {
  const resp = await fetch(`http://${HOST}:${port}/json`);
  const targets = await resp.json();
  return (
    targets.find((t) => t.type === 'page' && /turtletrading\.vn\/chart/i.test(t.url)) ||
    targets.find((t) => t.type === 'page' && /turtletrading\.vn/i.test(t.url)) ||
    null
  );
}

function openWs(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => reject(new Error('WebSocket open timeout')), CONNECT_TIMEOUT);
    socket.addEventListener('open', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('WebSocket error'));
    });
    socket.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message || 'CDP error'));
        else res(msg.result);
      } else if (msg.method === 'Runtime.executionContextCreated') {
        const ctx = msg.params?.context;
        if (ctx) contexts.set(ctx.id, ctx.origin);
      } else if (msg.method === 'Runtime.executionContextDestroyed') {
        contexts.delete(msg.params?.executionContextId);
        if (msg.params?.executionContextId === chartContextId) chartContextId = null;
      } else if (msg.method === 'Runtime.executionContextsCleared') {
        contexts.clear();
        chartContextId = null;
      }
    });
    socket.addEventListener('close', () => {
      if (ws === socket) reset();
    });
  });
}

/**
 * Connect to the debug browser and locate the chart iframe context.
 * @param {number} [port=9222]
 * @returns {Promise<{port:number}>}
 * @throws if the browser/chart is not reachable.
 */
export async function connect(port = DEFAULT_PORT) {
  if (ws && ws.readyState === WebSocket.OPEN && chartContextId != null) return { port };

  reset();
  const target = await findChartTarget(port).catch((e) => {
    throw new Error(`Cannot reach Chrome debug on :${port} (${e.message})`);
  });
  if (!target) throw new Error('No turtletrading.vn chart tab found in the debug browser');

  ws = await openWs(target.webSocketDebuggerUrl);
  await send('Runtime.enable');
  await send('Page.enable').catch(() => {});

  // Existing contexts are reported asynchronously after enable; give them a tick.
  await new Promise((r) => setTimeout(r, 400));
  chartContextId = pickChartContext();
  if (chartContextId == null) {
    // One more nudge in case the iframe context arrived late.
    await new Promise((r) => setTimeout(r, 600));
    chartContextId = pickChartContext();
  }
  if (chartContextId == null) {
    throw new Error(`Chart iframe context (${CHART_ORIGIN}) not found — is the chart loaded?`);
  }
  return { port };
}

function pickChartContext() {
  for (const [id, origin] of contexts) {
    if (origin === CHART_ORIGIN) return id;
  }
  return null;
}

/**
 * Evaluate a read-only expression inside the chart iframe context.
 * The expression must return a primitive / plain JSON (no live objects with
 * circular refs).
 *
 * SECURITY: `expression` is run verbatim via Runtime.evaluate in the user's
 * browser tab. It MUST be a hardcoded read-only string — NEVER interpolate
 * user input into it. All callers live in core/chart.js and only embed
 * validated numbers/booleans.
 * @param {string} expression
 * @returns {Promise<any>}
 */
export async function evalChart(expression) {
  await connect();
  const result = await send('Runtime.evaluate', {
    expression,
    contextId: chartContextId,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    const msg =
      result.exceptionDetails.exception?.description ||
      result.exceptionDetails.text ||
      'Unknown evaluation error';
    throw new Error(`Chart eval error: ${msg}`);
  }
  return result.result?.value;
}

export async function isReady(port = DEFAULT_PORT) {
  try {
    await connect(port);
    return true;
  } catch {
    return false;
  }
}

export function close() {
  reset();
}
