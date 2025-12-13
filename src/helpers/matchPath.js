export function matchPath(pattern, pathname) {
  // Exact match
  if (pattern === pathname) return true;

  // Wildcard match (e.g., /blog/*)
  if (pattern.endsWith("/*")) {
    const base = pattern.replace("/*", "");
    return pathname.startsWith(base);
  }

  return false;
}