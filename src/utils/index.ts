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

export { validateWebM, type WebMValidationResult } from './webm-validator';
