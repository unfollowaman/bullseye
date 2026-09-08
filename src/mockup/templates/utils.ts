import { MockupBackground, MockupFitMode } from '../types';

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderBackgroundSvg(bg?: MockupBackground): { defs: string; rect: string } {
  if (!bg || bg.type === 'transparent') {
    return { defs: '', rect: '' };
  }

  if (bg.type === 'solid') {
    const color = escapeXml(bg.color || '#f1f5f9');
    return {
      defs: '',
      rect: `<rect width="100%" height="100%" fill="${color}" />`,
    };
  }

  if (bg.type === 'gradient') {
    const start = escapeXml(bg.startColor || '#4f46e5');
    const stop = escapeXml(bg.stopColor || '#06b6d4');
    const angle = bg.angle !== undefined ? bg.angle : 135;

    const rad = (angle * Math.PI) / 180;
    const x1 = Math.round(50 - Math.cos(rad) * 50);
    const y1 = Math.round(50 - Math.sin(rad) * 50);
    const x2 = Math.round(50 + Math.cos(rad) * 50);
    const y2 = Math.round(50 + Math.sin(rad) * 50);

    const defs = `<linearGradient id="bgGradient" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      <stop offset="0%" stop-color="${start}" />
      <stop offset="100%" stop-color="${stop}" />
    </linearGradient>`;

    const rect = `<rect width="100%" height="100%" fill="url(#bgGradient)" />`;
    return { defs, rect };
  }

  return { defs: '', rect: '' };
}

export function renderShadowFilterSvg(
  id: string = 'deviceShadow',
  blur: number = 20,
  opacity: number = 0.35,
  dy: number = 12
): string {
  return `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="#000000" flood-opacity="${opacity}" />
  </filter>`;
}

export function getPreserveAspectRatio(fitMode: MockupFitMode = 'cover'): string {
  switch (fitMode) {
    case 'contain':
      return 'xMidYMid meet';
    case 'fill':
      return 'none';
    case 'cover':
    default:
      return 'xMidYMid slice';
  }
}
