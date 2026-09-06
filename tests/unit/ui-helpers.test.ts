import { describe, it, expect } from 'vitest';
import { getPublicAssetUrl } from '@/utils/url-utils';

describe('UI Helper Utilities', () => {
  describe('getPublicAssetUrl', () => {
    it('returns null for undefined or empty path', () => {
      expect(getPublicAssetUrl(undefined)).toBeNull();
      expect(getPublicAssetUrl('')).toBeNull();
    });

    it('extracts path after /public/ for standard filesystem paths', () => {
      const input = '/app/public/captures/screenshot-123.png';
      expect(getPublicAssetUrl(input)).toBe('/captures/screenshot-123.png');
    });

    it('handles Windows backslashes in path correctly', () => {
      const input = 'C:\\Users\\runner\\project\\public\\captures\\recording-456.webm';
      expect(getPublicAssetUrl(input)).toBe('/captures/recording-456.webm');
    });

    it('preserves already relative asset paths starting with /captures/', () => {
      expect(getPublicAssetUrl('/captures/image.png')).toBe('/captures/image.png');
      expect(getPublicAssetUrl('captures/image.png')).toBe('/captures/image.png');
    });

    it('falls back to filename under /captures/ if public is not in path', () => {
      expect(getPublicAssetUrl('/tmp/custom-file.png')).toBe('/captures/custom-file.png');
    });
  });
});
