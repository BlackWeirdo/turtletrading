// Uniform MCP tool result wrapper. All tools must return through this for
// consistent JSON output (and isError flag on failure).
export function jsonResult(obj, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }],
    ...(isError && { isError: true }),
  };
}
