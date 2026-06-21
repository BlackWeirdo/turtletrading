// Symbol normalization + filtering shared by the core modules. Centralized so
// every endpoint sanitizes user-supplied tickers the same way before they ever
// reach a URL path.

// Uppercase, strip anything that isn't [A-Z0-9]. Use for path segments
// (crypto/fx symbols) and stored watchlist symbols.
export function sanitizeSymbol(sym) {
  return String(sym).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Lowercase variant for endpoints that expect lowercase symbols (GEX: btc/eth/sol).
export function lowerSymbol(sym) {
  return String(sym).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Build an uppercase lookup Set from a symbol list, or null when no filter is
// requested (empty/omitted) — callers treat null as "return everything".
export function toUpperSet(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return new Set(list.map((s) => String(s).toUpperCase()));
}

/**
 * Filter `all` down to the entries whose symbol (read via `keyOf`) is in `want`,
 * and report which requested symbols were not found.
 * @param {any[]} all              All candidate records.
 * @param {Set<string>|null} want  Uppercase symbol set, or null for "no filter".
 * @param {(item:any)=>string} keyOf  Extracts the symbol from a record.
 * @returns {{picked:any[], missing:string[]}}
 */
export function filterBySymbols(all, want, keyOf) {
  if (!want) return { picked: all, missing: [] };
  const found = new Set();
  const picked = all.filter((item) => {
    const sym = String(keyOf(item)).toUpperCase();
    if (!want.has(sym)) return false;
    found.add(sym);
    return true;
  });
  const missing = [...want].filter((s) => !found.has(s));
  return { picked, missing };
}
