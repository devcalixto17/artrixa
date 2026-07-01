/**
 * Validates that a URL uses http(s) protocol to prevent javascript:, data:, etc.
 */
export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return true; // empty/null treated as valid (skip)
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateMediaUrls(urls: (string | null | undefined)[]): boolean {
  return urls.every((u) => isSafeHttpUrl(u));
}
