export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

export function isValidUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getPublicAssetUrl(outputPath?: string): string | null {
  if (!outputPath) return null;
  const normalized = outputPath.replace(/\\/g, '/');
  const publicIndex = normalized.indexOf('/public/');
  if (publicIndex !== -1) {
    return normalized.substring(publicIndex + 7);
  }
  if (normalized.startsWith('/captures/')) return normalized;
  if (normalized.startsWith('captures/')) return '/' + normalized;
  const filename = normalized.split('/').pop();
  return filename ? `/captures/${filename}` : null;
}
