import { MockupConfig } from '../types';
import {
  getPreserveAspectRatio,
  renderBackgroundSvg,
  renderShadowFilterSvg,
} from './utils';

export function renderPresentationMockupSvg(
  base64Screenshot: string,
  imgWidth: number,
  imgHeight: number,
  config: MockupConfig
): string {
  const canvasWidth = config.width || 1600;
  const padding = config.padding !== undefined ? config.padding : 100;

  const enableShadow = config.visualOptions?.shadow !== false;
  const shadowBlur = config.visualOptions?.shadowBlur !== undefined ? config.visualOptions.shadowBlur : 30;
  const shadowOpacity = config.visualOptions?.shadowOpacity !== undefined ? config.visualOptions.shadowOpacity : 0.35;
  const borderRadius = config.visualOptions?.borderRadius !== undefined ? config.visualOptions.borderRadius : 16;

  const cardWidth = Math.max(200, canvasWidth - padding * 2);
  const screenshotAspect = imgWidth / imgHeight;

  let cardHeight: number;
  let canvasHeight: number;

  if (config.height) {
    canvasHeight = config.height;
    cardHeight = Math.max(100, canvasHeight - padding * 2);
  } else {
    cardHeight = Math.round(cardWidth / screenshotAspect);
    cardHeight = Math.max(200, Math.min(2400, cardHeight));
    canvasHeight = cardHeight + padding * 2;
  }

  const cardX = padding;
  const cardY = padding;

  const isDark = config.visualOptions?.deviceColor === 'dark';
  const cardBorderColor = isDark ? '#334155' : '#ffffff';
  const cardBorderOpacity = isDark ? '0.4' : '0.8';

  const preserveAspectRatio = getPreserveAspectRatio(config.fitMode || 'cover');
  const bgSvg = renderBackgroundSvg(config.background || { type: 'gradient', startColor: '#1e293b', stopColor: '#0f172a' });
  const shadowFilterSvg = enableShadow
    ? renderShadowFilterSvg('cardShadow', shadowBlur, shadowOpacity, 20)
    : '';

  return `<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    ${bgSvg.defs}
    ${shadowFilterSvg}
    <clipPath id="cardClip">
      <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="${borderRadius}" ry="${borderRadius}" />
    </clipPath>
  </defs>

  ${bgSvg.rect}

  <g ${enableShadow ? 'filter="url(#cardShadow)"' : ''}>
    <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="${borderRadius}" ry="${borderRadius}" fill="#0f172a" />
  </g>

  <g clip-path="url(#cardClip)">
    <image href="${base64Screenshot}" x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" preserveAspectRatio="${preserveAspectRatio}" />
    <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="${borderRadius}" ry="${borderRadius}" fill="none" stroke="${cardBorderColor}" stroke-opacity="${cardBorderOpacity}" stroke-width="2" />
  </g>
</svg>`;
}
