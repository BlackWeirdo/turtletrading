import { jsonResult } from './_format.js';

// Smoke-test tool: confirms the server is alive without touching the network.
export function registerHealthTools(server) {
  server.tool(
    'health',
    'Smoke check: server alive. Returns name/version/time.',
    {},
    { readOnlyHint: true },
    async () =>
      jsonResult({
        ok: true,
        name: 'turtle-trading',
        version: '1.0.0',
        time: new Date().toISOString(),
      })
  );
}
