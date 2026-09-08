import { MockupConfig } from '../types';
import {
  getPreserveAspectRatio,
  renderBackgroundSvg,
  renderShadowFilterSvg,
} from './utils';

export function renderLaptopMockupSvg(
  base64Screenshot: string,
  imgWidth: number,
  imgHeight: number,
  config: MockupConfig
): string {
  const canvasWidth = config.width || 1600;
  const padding = config.padding !== undefined ? config.padding : 100;

  const deviceColor = config.visualOptions?.deviceColor || 'space-gray';
  const enableShadow = config.visualOptions?.shadow !== false;
  const shadowBlur = config.visualOptions?.shadowBlur !== undefined ? config.visualOptions.shadowBlur : 28;
  const shadowOpacity = config.visualOptions?.shadowOpacity !== undefined ? config.visualOptions.shadowOpacity : 0.35;

  let bezelColor = '#1e1e1e';
  let bodyColor = '#2b2c30';
  let highlightColor = '#3f4046';
  let trackpadBorder = '#1a1b1e';

  if (deviceColor === 'silver' || deviceColor === 'light') {
    bezelColor = '#0f0f11';
    bodyColor = '#e2e8f0';
    highlightColor = '#cbd5e1';
    trackpadBorder = '#94a3b8';
  } else if (deviceColor === 'midnight' || deviceColor === 'dark') {
    bezelColor = '#090a0f';
    bodyColor = '#111827';
    highlightColor = '#1f2937';
    trackpadBorder = '#030712';
  }

  const maxLidWidth = Math.max(300, canvasWidth - padding * 2);

  const screenAspect = 16 / 10;
  const bezelPadding = 18;
  const topBezelHeight = 22;

  const screenWidth = maxLidWidth - bezelPadding * 2;
  const screenHeight = Math.round(screenWidth / screenAspect);

  const lidWidth = screenWidth + bezelPadding * 2;
  const lidHeight = screenHeight + topBezelHeight + bezelPadding;

  const baseWidth = lidWidth * 1.16;
  const baseHeight = 22;
  const baseLipHeight = 8;

  const totalDeviceHeight = lidHeight + baseHeight;
  const canvasHeight = config.height || totalDeviceHeight + padding * 2;

  const lidX = (canvasWidth - lidWidth) / 2;
  const lidY = (canvasHeight - totalDeviceHeight) / 2;

  const screenX = lidX + bezelPadding;
  const screenY = lidY + topBezelHeight;

  const baseX = (canvasWidth - baseWidth) / 2;
  const baseY = lidY + lidHeight;

  const preserveAspectRatio = getPreserveAspectRatio(config.fitMode || 'cover');
  const bgSvg = renderBackgroundSvg(config.background);
  const shadowFilterSvg = enableShadow
    ? renderShadowFilterSvg('laptopShadow', shadowBlur, shadowOpacity, 20)
    : '';

  return `<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    ${bgSvg.defs}
    ${shadowFilterSvg}
    <clipPath id="laptopScreenClip">
      <rect x="${screenX}" y="${screenY}" width="${screenWidth}" height="${screenHeight}" rx="4" ry="4" />
    </clipPath>
    <clipPath id="laptopLidClip">
      <rect x="${lidX}" y="${lidY}" width="${lidWidth}" height="${lidHeight}" rx="14" ry="14" />
    </clipPath>
  </defs>

  ${bgSvg.rect}

  <g ${enableShadow ? 'filter="url(#laptopShadow)"' : ''}>
    <path d="M ${baseX + 24} ${baseY}
             L ${baseX + baseWidth - 24} ${baseY}
             Q ${baseX + baseWidth} ${baseY} ${baseX + baseWidth} ${baseY + 12}
             L ${baseX + baseWidth - 8} ${baseY + baseHeight}
             Q ${baseX + baseWidth - 16} ${baseY + baseHeight + baseLipHeight} ${baseX + baseWidth - 40} ${baseY + baseHeight + baseLipHeight}
             L ${baseX + 40} ${baseY + baseHeight + baseLipHeight}
             Q ${baseX + 16} ${baseY + baseHeight + baseLipHeight} ${baseX + 8} ${baseY + baseHeight}
             L ${baseX} ${baseY + 12}
             Q ${baseX} ${baseY} ${baseX + 24} ${baseY} Z" fill="${bodyColor}" stroke="${highlightColor}" stroke-width="1" />

    <rect x="${canvasWidth / 2 - 40}" y="${baseY}" width="80" height="6" rx="3" fill="${highlightColor}" />

    <rect x="${canvasWidth / 2 - 45}" y="${baseY + 12}" width="90" height="10" rx="2" fill="none" stroke="${trackpadBorder}" stroke-width="1" opacity="0.5" />

    <rect x="${lidX}" y="${lidY}" width="${lidWidth}" height="${lidHeight}" rx="14" ry="14" fill="${bezelColor}" stroke="${highlightColor}" stroke-width="1" />

    <circle cx="${canvasWidth / 2}" cy="${lidY + topBezelHeight / 2}" r="3.5" fill="#090a0f" />
    <circle cx="${canvasWidth / 2}" cy="${lidY + topBezelHeight / 2}" r="1.5" fill="#1e293b" />
  </g>

  <g clip-path="url(#laptopScreenClip)">
    <image href="${base64Screenshot}" x="${screenX}" y="${screenY}" width="${screenWidth}" height="${screenHeight}" preserveAspectRatio="${preserveAspectRatio}" />
  </g>
</svg>`;
}
