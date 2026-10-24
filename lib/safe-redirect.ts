/**
 * Validates whether a redirect URL is a safe, relative application path.
 * Prevents Open Redirect (CWE-601) via protocol-relative URLs (`//attacker.com`),
 * backslash escapes (`/\\attacker.com`), and non-HTTP protocols.
 */
export function isSafeRedirectUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== 'string') return false;

  // Must begin with a single slash and not double slashes or backslashes
  if (!url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) {
    return false;
  }

  try {
    const resolved = new URL(url, 'http://localhost');
    return resolved.origin === 'http://localhost';
  } catch {
    return false;
  }
}
