import { MockupConfig } from '../types';
import {
  escapeXml,
  getPreserveAspectRatio,
  renderBackgroundSvg,
  renderShadowFilterSvg,
} from './utils';

export function renderBrowserMockupSvg(
  base64Screenshot: string,
  imgWidth: number,
  imgHeight: number,
  config: MockupConfig
): string {
  const canvasWidth = config.width || 1600;
  const padding = config.padding !== undefined ? config.padding : 80;

  const screenshotAspect = imgWidth / imgHeight;
  const headerHeight = 44;
  const borderRadius = config.visualOptions?.borderRadius !== undefined ? config.visualOptions.borderRadius : 12;

  const frameWidth = Math.max(200, canvasWidth - padding * 2);

  let bodyHeight: number;
  let canvasHeight: number;

  if (config.height) {
    canvasHeight = config.height;
    const availableFrameHeight = Math.max(100, canvasHeight - padding * 2);
    bodyHeight = Math.max(50, availableFrameHeight - headerHeight);
  } else {
    bodyHeight = Math.round(frameWidth / screenshotAspect);
    bodyHeight = Math.max(200, Math.min(2400, bodyHeight));
    canvasHeight = frameWidth + padding * 2 > 0 ? bodyHeight + headerHeight + padding * 2 : 1200;
  }

  const frameHeight = headerHeight + bodyHeight;
  const frameX = padding;
  const frameY = padding;

  const isDark = config.visualOptions?.deviceColor === 'dark';
  const showControls = config.visualOptions?.showWindowControls !== false;
  const enableShadow = config.visualOptions?.shadow !== false;
  const shadowBlur = config.visualOptions?.shadowBlur !== undefined ? config.visualOptions.shadowBlur : 24;
  const shadowOpacity = config.visualOptions?.shadowOpacity !== undefined ? config.visualOptions.shadowOpacity : 0.3;

  const titleText = config.visualOptions?.browserTitle ? escapeXml(config.visualOptions.browserTitle) : '';
  const urlText = escapeXml(config.visualOptions?.browserUrl || 'https://example.com');
  const displayUrl = titleText ? `${titleText} — ${urlText}` : urlText;

  const preserveAspectRatio = getPreserveAspectRatio(config.fitMode || 'cover');
  const bgSvg = renderBackgroundSvg(config.background);

  const headerBg = isDark ? '#1e293b' : '#f8fafc';
  const headerBorder = isDark ? '#334155' : '#e2e8f0';
  const urlBg = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const shadowFilterSvg = enableShadow
    ? renderShadowFilterSvg('browserShadow', shadowBlur, shadowOpacity, 16)
    : '';

  return `<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    ${bgSvg.defs}
    ${shadowFilterSvg}
    <clipPath id="browserClip">
      <rect x="${frameX}" y="${frameY}" width="${frameWidth}" height="${frameHeight}" rx="${borderRadius}" ry="${borderRadius}" />
    </clipPath>
    <clipPath id="screenClip">
      <rect x="${frameX}" y="${frameY + headerHeight}" width="${frameWidth}" height="${bodyHeight}" />
    </clipPath>
  </defs>

  ${bgSvg.rect}

  <g ${enableShadow ? 'filter="url(#browserShadow)"' : ''}>
    <rect x="${frameX}" y="${frameY}" width="${frameWidth}" height="${frameHeight}" rx="${borderRadius}" ry="${borderRadius}" fill="${headerBg}" stroke="${headerBorder}" stroke-width="1" />

    <path d="M ${frameX} ${frameY + borderRadius}
             A ${borderRadius} ${borderRadius} 0 0 1 ${frameX + borderRadius} ${frameY}
             L ${frameX + frameWidth - borderRadius} ${frameY}
             A ${borderRadius} ${borderRadius} 0 0 1 ${frameX + frameWidth} ${frameY + borderRadius}
             L ${frameX + frameWidth} ${frameY + headerHeight}
             L ${frameX} ${frameY + headerHeight} Z" fill="${headerBg}" />

    ${
      showControls
        ? `<circle cx="${frameX + 20}" cy="${frameY + headerHeight / 2}" r="6" fill="#ff5f56" />
           <circle cx="${frameX + 38}" cy="${frameY + headerHeight / 2}" r="6" fill="#ffbd2e" />
           <circle cx="${frameX + 56}" cy="${frameY + headerHeight / 2}" r="6" fill="#27c93f" />`
        : ''
    }

    <rect x="${frameX + (showControls ? 80 : 20)}" y="${frameY + 8}" width="${Math.max(100, frameWidth - (showControls ? 100 : 40))}" height="${headerHeight - 16}" rx="6" fill="${urlBg}" stroke="${headerBorder}" stroke-width="1" />

    <g transform="translate(${frameX + (showControls ? 90 : 30)}, ${frameY + 14})">
      <path d="M4 6a2 2 0 012-2h4a2 2 0 012 2v2H4V6z M3 8h10v6H3V8z" fill="none" stroke="${textColor}" stroke-width="1.2" />
      <text x="18" y="11" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" fill="${textColor}">${displayUrl}</text>
    </g>

    <line x1="${frameX}" y1="${frameY + headerHeight}" x2="${frameX + frameWidth}" y2="${frameY + headerHeight}" stroke="${headerBorder}" stroke-width="1" />
  </g>

  <g clip-path="url(#browserClip)">
    <g clip-path="url(#screenClip)">
      <image href="${base64Screenshot}" x="${frameX}" y="${frameY + headerHeight}" width="${frameWidth}" height="${bodyHeight}" preserveAspectRatio="${preserveAspectRatio}" />
    </g>
  </g>
</svg>`;
}
