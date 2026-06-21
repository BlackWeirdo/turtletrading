import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import * as wl from '../src/core/watchlist.js';

// Sentinels chosen to not collide with anything a user would realistically add.
const SENTINEL_STOCK = 'TESTSYM';
const SENTINEL_FX = 'TESTFX';

after(async () => {
  // Teardown: leave the real watchlist file clean.
  await wl.remove({ symbol: SENTINEL_STOCK });
  await wl.remove({ symbol: SENTINEL_FX });
});

test('add + get + dedupe + remove round-trip on the real file', async () => {
  await wl.remove({ symbol: SENTINEL_STOCK });
  await wl.remove({ symbol: SENTINEL_FX });

  const a1 = await wl.add({ symbol: SENTINEL_STOCK, type: 'stock' });
  assert.equal(a1.added, true);
  const a2 = await wl.add({ symbol: SENTINEL_FX, type: 'fx' });
  assert.equal(a2.added, true);

  const got = await wl.get();
  assert.ok(got.items.some((i) => i.symbol === SENTINEL_STOCK && i.type === 'stock'));
  assert.ok(got.items.some((i) => i.symbol === SENTINEL_FX && i.type === 'fx'));

  const dup = await wl.add({ symbol: SENTINEL_STOCK, type: 'stock' });
  assert.equal(dup.added, false);

  const rm = await wl.remove({ symbol: SENTINEL_STOCK });
  assert.equal(rm.removed, 1);
  const after = await wl.get();
  assert.ok(!after.items.some((i) => i.symbol === SENTINEL_STOCK));
});

test('add rejects an invalid type', async () => {
  await assert.rejects(() => wl.add({ symbol: 'X', type: 'bogus' }), /invalid type/);
});
