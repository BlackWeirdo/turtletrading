// Tiny HTTP layer: GET JSON with an in-memory TTL cache.
// KISS: no active refresh, no eviction policy beyond expiry-on-read.
// Node 24 has global fetch, so no extra dependency is needed.

const cache = new Map(); // url -> { data, expires }

const FETCH_TIMEOUT_MS = 8000; // abort a hung request rather than block forever

// GET with a hard timeout via AbortController, so an unresponsive (unofficial)
// endpoint can never wedge a tool call indefinitely.
async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch JSON from a URL with optional TTL caching.
 * @param {string} url        Absolute URL to GET.
 * @param {number} [ttlMs=0]  Cache lifetime in ms; 0 = no caching.
 * @returns {Promise<any>}    Parsed JSON.
 * @throws on network error/timeout, non-OK status, or invalid JSON (message includes URL).
 */
export async function fetchJSON(url, ttlMs = 0) {
  const hit = cache.get(url);
  if (hit && Date.now() < hit.expires) return hit.data;

  let res;
  try {
    res = await fetchWithTimeout(url);
    // Rate limited: back off and retry a couple times (honor Retry-After if
    // present, else exponential-ish 1s/2s). These are unofficial endpoints
    // that throttle under bursts.
    for (let attempt = 0; res.status === 429 && attempt < 2; attempt++) {
      const retryAfter = Number(res.headers.get('retry-after')) * 1000;
      const wait = retryAfter || 1000 * (attempt + 1);
      await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
      res = await fetchWithTimeout(url);
    }
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Timeout after ${FETCH_TIMEOUT_MS}ms @ ${url}`);
    throw new Error(`Network error: ${e.message} @ ${url}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Invalid JSON @ ${url}`);
  }

  if (ttlMs > 0) cache.set(url, { data, expires: Date.now() + ttlMs });
  return data;
}

// Exposed for tests that need a clean cache.
export function _clearCache() {
  cache.clear();
}
