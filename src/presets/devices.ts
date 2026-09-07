import { DevicePreset } from './types';

export const BUILTIN_DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'device_desktop_4k',
    name: 'Desktop 4K (3840×2160)',
    category: 'desktop',
    viewport: { width: 3840, height: 2160 },
    deviceScaleFactor: 1,
    isBuiltIn: true,
    description: 'High-resolution 4K Ultra HD desktop viewport.',
  },
  {
    id: 'device_desktop_hd',
    name: 'Desktop HD (1920×1080)',
    category: 'desktop',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isBuiltIn: true,
    description: 'Standard 1080p Full HD desktop display.',
  },
  {
    id: 'device_laptop_std',
    name: 'Laptop Standard (1366×768)',
    category: 'laptop',
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    isBuiltIn: true,
    description: 'Common budget / 13-inch laptop resolution.',
  },
  {
    id: 'device_laptop_retina',
    name: 'Laptop Retina (1440×900)',
    category: 'laptop',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isBuiltIn: true,
    description: 'Modern MacBook / Retina level display density.',
  },
  {
    id: 'device_tablet_ipad',
    name: 'Tablet iPad (768×1024)',
    category: 'tablet',
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    isBuiltIn: true,
    description: 'Standard portrait tablet viewport with touch metadata.',
    deviceMetadata: {
      isMobile: true,
      hasTouch: true,
    },
  },
  {
    id: 'device_mobile_iphone',
    name: 'Mobile iPhone (390×844)',
    category: 'mobile',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isBuiltIn: true,
    description: 'Modern iPhone portrait viewport with high pixel density.',
    deviceMetadata: {
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    },
  },
  {
    id: 'device_mobile_android',
    name: 'Mobile Android (360×800)',
    category: 'mobile',
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 3,
    isBuiltIn: true,
    description: 'Standard Android smartphone portrait viewport.',
    deviceMetadata: {
      isMobile: true,
      hasTouch: true,
    },
  },
];

export function getBuiltInDevicePresets(): DevicePreset[] {
  return [...BUILTIN_DEVICE_PRESETS];
}

export function getBuiltInDevicePresetById(id: string): DevicePreset | undefined {
  return BUILTIN_DEVICE_PRESETS.find((d) => d.id === id);
}
