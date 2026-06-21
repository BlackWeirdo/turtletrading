// Tiny HTTP layer: GET JSON with an in-memory TTL cache.
// KISS: no active refresh, no eviction policy beyond expiry-on-read.
// Node 24 has global fetch, so no extra dependency is needed.

const cache = new Map(); // url -> { data, expires }

/**
 * Fetch JSON from a URL with optional TTL caching.
 * @param {string} url        Absolute URL to GET.
 * @param {number} [ttlMs=0]  Cache lifetime in ms; 0 = no caching.
 * @returns {Promise<any>}    Parsed JSON.
 * @throws on network error, non-OK status, or invalid JSON (message includes URL).
 */
export async function fetchJSON(url, ttlMs = 0) {
  const hit = cache.get(url);
  if (hit && Date.now() < hit.expires) return hit.data;

  let res;
  try {
    res = await fetch(url);
    // Rate limited: back off and retry a couple times (honor Retry-After if
    // present, else exponential-ish 1s/2s). These are unofficial endpoints
    // that throttle under bursts.
    for (let attempt = 0; res.status === 429 && attempt < 2; attempt++) {
      const retryAfter = Number(res.headers.get('retry-after')) * 1000;
      const wait = retryAfter || 1000 * (attempt + 1);
      await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
      res = await fetch(url);
    }
  } catch (e) {
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
