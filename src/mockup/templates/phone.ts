import { MockupConfig } from '../types';
import {
  getPreserveAspectRatio,
  renderBackgroundSvg,
  renderShadowFilterSvg,
} from './utils';

export function renderPhoneMockupSvg(
  base64Screenshot: string,
  imgWidth: number,
  imgHeight: number,
  config: MockupConfig
): string {
  const canvasWidth = config.width || 1200;
  const padding = config.padding !== undefined ? config.padding : 80;

  const deviceColor = config.visualOptions?.deviceColor || 'midnight';
  const enableShadow = config.visualOptions?.shadow !== false;
  const shadowBlur = config.visualOptions?.shadowBlur !== undefined ? config.visualOptions.shadowBlur : 32;
  const shadowOpacity = config.visualOptions?.shadowOpacity !== undefined ? config.visualOptions.shadowOpacity : 0.4;

  let frameColor = '#1e1e1e';
  let bezelColor = '#000000';
  let strokeColor = '#383838';

  if (deviceColor === 'silver' || deviceColor === 'light') {
    frameColor = '#e2e8f0';
    bezelColor = '#0f172a';
    strokeColor = '#cbd5e1';
  } else if (deviceColor === 'space-gray') {
    frameColor = '#334155';
    bezelColor = '#020617';
    strokeColor = '#475569';
  }

  const phoneAspect = 9 / 19.5;
  const maxPhoneHeight = Math.max(300, (config.height || 1400) - padding * 2);

  let phoneHeight = maxPhoneHeight;
  let phoneWidth = Math.round(phoneHeight * phoneAspect);

  if (phoneWidth > canvasWidth - padding * 2) {
    phoneWidth = canvasWidth - padding * 2;
    phoneHeight = Math.round(phoneWidth / phoneAspect);
  }

  const canvasHeight = config.height || phoneHeight + padding * 2;

  const phoneX = (canvasWidth - phoneWidth) / 2;
  const phoneY = (canvasHeight - phoneHeight) / 2;

  const bezelMargin = 12;
  const screenWidth = phoneWidth - bezelMargin * 2;
  const screenHeight = phoneHeight - bezelMargin * 2;

  const screenX = phoneX + bezelMargin;
  const screenY = phoneY + bezelMargin;

  const outerRadius = Math.round(phoneWidth * 0.13);
  const innerRadius = Math.round(screenWidth * 0.11);

  const islandWidth = Math.round(screenWidth * 0.32);
  const islandHeight = 28;
  const islandX = (canvasWidth - islandWidth) / 2;
  const islandY = screenY + 12;

  const homeBarWidth = Math.round(screenWidth * 0.38);
  const homeBarHeight = 5;
  const homeBarX = (canvasWidth - homeBarWidth) / 2;
  const homeBarY = screenY + screenHeight - 16;

  const preserveAspectRatio = getPreserveAspectRatio(config.fitMode || 'cover');
  const bgSvg = renderBackgroundSvg(config.background);
  const shadowFilterSvg = enableShadow
    ? renderShadowFilterSvg('phoneShadow', shadowBlur, shadowOpacity, 24)
    : '';

  return `<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    ${bgSvg.defs}
    ${shadowFilterSvg}
    <clipPath id="phoneScreenClip">
      <rect x="${screenX}" y="${screenY}" width="${screenWidth}" height="${screenHeight}" rx="${innerRadius}" ry="${innerRadius}" />
    </clipPath>
  </defs>

  ${bgSvg.rect}

  <g ${enableShadow ? 'filter="url(#phoneShadow)"' : ''}>
    <rect x="${phoneX}" y="${phoneY}" width="${phoneWidth}" height="${phoneHeight}" rx="${outerRadius}" ry="${outerRadius}" fill="${frameColor}" stroke="${strokeColor}" stroke-width="2" />
    <rect x="${screenX}" y="${screenY}" width="${screenWidth}" height="${screenHeight}" rx="${innerRadius}" ry="${innerRadius}" fill="${bezelColor}" />
  </g>

  <g clip-path="url(#phoneScreenClip)">
    <image href="${base64Screenshot}" x="${screenX}" y="${screenY}" width="${screenWidth}" height="${screenHeight}" preserveAspectRatio="${preserveAspectRatio}" />
    <rect x="${islandX}" y="${islandY}" width="${islandWidth}" height="${islandHeight}" rx="14" ry="14" fill="#000000" />
    <circle cx="${islandX + islandWidth - 16}" cy="${islandY + islandHeight / 2}" r="4" fill="#111827" />
    <rect x="${homeBarX}" y="${homeBarY}" width="${homeBarWidth}" height="${homeBarHeight}" rx="2.5" ry="2.5" fill="#ffffff" opacity="0.8" />
  </g>
</svg>`;
}
