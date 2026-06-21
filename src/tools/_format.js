// Uniform MCP tool result wrapper. All tools must return through this for
// consistent JSON output (and isError flag on failure).
export function jsonResult(obj, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }],
    ...(isError && { isError: true }),
  };
}

/**
 * Wrap a core handler into an MCP tool callback with uniform error handling:
 * success -> jsonResult(result); failure -> jsonResult({ error, ...extra }, true).
 *
 * @param {(args:any)=>Promise<any>} handler  Core function (receives the tool args).
 * @param {object|((err:Error,args:any)=>object)} [onError]  Extra fields to merge
 *   into the error payload — a plain object, or a function of (err, args). Returned
 *   fields override the default `error` (used to set a custom message + `detail`).
 */
export function guard(handler, onError) {
  return async (args) => {
    try {
      return jsonResult(await handler(args));
    } catch (e) {
      const extra = typeof onError === 'function' ? onError(e, args) : onError;
      return jsonResult({ error: e.message, ...extra }, true);
    }
  };
}
