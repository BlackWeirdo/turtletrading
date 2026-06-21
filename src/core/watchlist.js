// Local watchlist persisted to data/watchlist.json. Single-user, no auth,
// no lock (YAGNI). Path resolved relative to this module, not cwd.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../../data/watchlist.json', import.meta.url));
const VALID_TYPES = ['stock', 'crypto', 'fx'];

async function loadFile() {
  try {
    const txt = await readFile(FILE, 'utf8');
    const obj = JSON.parse(txt);
    if (!obj || !Array.isArray(obj.items)) return { items: [] };
    return obj;
  } catch (e) {
    if (e.code === 'ENOENT') return { items: [] };
    // Corrupt file (hand-edited): degrade to empty rather than crash.
    return { items: [], warning: `watchlist file unreadable: ${e.message}` };
  }
}

async function saveFile(obj) {
  await mkdir(dirname(FILE), { recursive: true });
  // Atomic-ish: write to temp then rename, so a crash mid-write can't truncate
  // (and thus silently wipe) the watchlist.
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  await rename(tmp, FILE);
}

export async function get() {
  const { items, warning } = await loadFile();
  return { count: items.length, items, ...(warning && { warning }) };
}

export async function add({ symbol, type = 'stock' }) {
  if (!VALID_TYPES.includes(type)) throw new Error(`invalid type '${type}', expected one of ${VALID_TYPES.join('/')}`);
  const SYM = String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const data = await loadFile();
  const exists = data.items.some((i) => i.symbol === SYM && i.type === type);
  if (exists) return { added: false, reason: 'exists', count: data.items.length };
  const item = { symbol: SYM, type, added_at: new Date().toISOString() };
  data.items.push(item);
  await saveFile({ items: data.items });
  return { added: true, item, count: data.items.length };
}

export async function remove({ symbol }) {
  const SYM = String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const data = await loadFile();
  const before = data.items.length;
  const kept = data.items.filter((i) => i.symbol !== SYM);
  if (kept.length !== before) await saveFile({ items: kept });
  return { removed: before - kept.length, count: kept.length };
}
