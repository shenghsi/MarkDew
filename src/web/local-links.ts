// Markdown destinations are decoded here for validation only. The host receives
// the original spelling and decodes it once using native path rules.
export function localLink(destination: string): { destination: string; fragment?: string } {
  if (new TextEncoder().encode(destination).length > 8192 || /\p{Cc}/u.test(destination))
    throw new Error('Use a bounded local file link without control characters.');
  const hash = destination.indexOf('#'), path = hash < 0 ? destination : destination.slice(0, hash);
  if (!path || path.includes('?')) throw new Error('Use a local file path without a query.');
  let decoded: string, fragment: string | undefined;
  try { decoded = decodeURIComponent(path); fragment = hash < 0 ? undefined : decodeURIComponent(destination.slice(hash + 1)); }
  catch { throw new Error('The file link has an invalid percent escape.'); }
  if (/\p{Cc}/u.test(decoded) || (fragment !== undefined && /\p{Cc}/u.test(fragment)) || decoded.startsWith('//') ||
    (/^[^/\\]*:/.test(decoded) && !/^[a-z]:[/\\]/i.test(decoded)))
    throw new Error('Use a local file path, not a URL.');
  if (!/\.(md|markdown|txt)$/i.test(decoded)) throw new Error('Use a Markdown or text file link.');
  return { destination: path, ...(fragment === undefined ? {} : { fragment }) };
}
