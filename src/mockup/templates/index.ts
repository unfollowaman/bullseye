import { MockupCapabilitiesResponse, MockupConfig } from '../types';
import { renderBrowserMockupSvg } from './browser';
import { renderLaptopMockupSvg } from './laptop';
import { renderPhoneMockupSvg } from './phone';
import { renderPresentationMockupSvg } from './presentation';

export { renderBrowserMockupSvg } from './browser';
export { renderLaptopMockupSvg } from './laptop';
export { renderPhoneMockupSvg } from './phone';
export { renderPresentationMockupSvg } from './presentation';

export function renderMockupSvg(
  base64Screenshot: string,
  imgWidth: number,
  imgHeight: number,
  config: MockupConfig
): string {
  switch (config.type) {
    case 'browser':
      return renderBrowserMockupSvg(base64Screenshot, imgWidth, imgHeight, config);
    case 'laptop':
      return renderLaptopMockupSvg(base64Screenshot, imgWidth, imgHeight, config);
    case 'phone':
      return renderPhoneMockupSvg(base64Screenshot, imgWidth, imgHeight, config);
    case 'presentation':
      return renderPresentationMockupSvg(base64Screenshot, imgWidth, imgHeight, config);
    default:
      throw new Error(`Unsupported mockup type: ${(config as { type: string }).type}`);
  }
}

export const MOCKUP_CAPABILITIES: MockupCapabilitiesResponse = {
  supportedTypes: [
    {
      type: 'browser',
      name: 'Browser Window',
      description: 'Clean macOS-style or dark browser window mockup with address bar and window controls.',
      defaultDimensions: { width: 1600, height: 1200 },
      aspectRatio: '4:3',
      supportedDeviceColors: ['light', 'dark'],
      features: ['windowControls', 'customUrl', 'shadow', 'borderRadius', 'fitModes'],
    },
    {
      type: 'laptop',
      name: 'Laptop Display',
      description: 'Modern laptop display mockup with realistic bezels, hinge, and trackpad shelf.',
      defaultDimensions: { width: 1600, height: 1200 },
      aspectRatio: '16:10',
      supportedDeviceColors: ['space-gray', 'silver', 'midnight', 'dark'],
      features: ['deviceColor', 'cameraNotch', 'shadow', 'fitModes'],
    },
    {
      type: 'phone',
      name: 'Mobile Smartphone',
      description: 'Sleek smartphone frame with dynamic notch island, rounded corners, and home indicator.',
      defaultDimensions: { width: 1200, height: 1400 },
      aspectRatio: '9:19.5',
      supportedDeviceColors: ['midnight', 'silver', 'space-gray', 'dark'],
      features: ['deviceColor', 'dynamicIsland', 'homeBar', 'shadow', 'fitModes'],
    },
    {
      type: 'presentation',
      name: 'Presentation Card',
      description: 'Elevated presentation card mockup with glassmorphism border and background backdrop.',
      defaultDimensions: { width: 1600, height: 1200 },
      aspectRatio: '4:3',
      supportedDeviceColors: ['light', 'dark'],
      features: ['glassBorder', 'gradientBackground', 'shadow', 'borderRadius', 'fitModes'],
    },
  ],
  supportedFormats: ['png', 'jpeg', 'webp'],
  defaultBackgrounds: [
    { type: 'gradient', startColor: '#4f46e5', stopColor: '#06b6d4', angle: 135 },
    { type: 'gradient', startColor: '#1e293b', stopColor: '#0f172a', angle: 135 },
    { type: 'solid', color: '#0f172a' },
    { type: 'solid', color: '#f8fafc' },
    { type: 'transparent' },
  ],
};
