import { CapturePreset } from './types';

export const BUILTIN_CAPTURE_PRESETS: CapturePreset[] = [
  {
    id: 'preset_quick_desktop_snap',
    name: 'Quick Desktop Screenshot',
    description: '1920x1080 Viewport Screenshot with default settings.',
    isBuiltIn: true,
    devicePresetId: 'device_desktop_hd',
    config: {
      url: '',
      captureType: 'screenshot',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      screenshotOptions: {
        mode: 'viewport',
        fullPage: false,
      },
      stabilizationOptions: {
        disableAnimations: false,
        additionalWaitMs: 0,
      },
      timeoutOptions: {
        timeoutMs: 30000,
      },
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    version: 1,
  },
  {
    id: 'preset_fullpage_audit',
    name: 'Full Page Desktop Audit',
    description: 'Full-page desktop screenshot with disabled animations for clean output.',
    isBuiltIn: true,
    devicePresetId: 'device_desktop_hd',
    config: {
      url: '',
      captureType: 'screenshot',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      screenshotOptions: {
        mode: 'fullPage',
        fullPage: true,
      },
      stabilizationOptions: {
        disableAnimations: true,
        additionalWaitMs: 500,
      },
      timeoutOptions: {
        timeoutMs: 45000,
      },
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    version: 1,
  },
  {
    id: 'preset_7s_demo_recording',
    name: '7s Product Demo',
    description: '7-second desktop video recording for feature walkthroughs.',
    isBuiltIn: true,
    devicePresetId: 'device_desktop_hd',
    config: {
      url: '',
      captureType: 'recording',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      recordingOptions: {
        durationMs: 7000,
      },
      stabilizationOptions: {
        disableAnimations: false,
        additionalWaitMs: 200,
      },
      timeoutOptions: {
        timeoutMs: 30000,
      },
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    version: 1,
  },
  {
    id: 'preset_mobile_iphone_snap',
    name: 'Mobile Viewport Snap',
    description: 'iPhone high-DPR mobile screenshot.',
    isBuiltIn: true,
    devicePresetId: 'device_mobile_iphone',
    config: {
      url: '',
      captureType: 'screenshot',
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      screenshotOptions: {
        mode: 'viewport',
        fullPage: false,
      },
      stabilizationOptions: {
        disableAnimations: true,
        additionalWaitMs: 300,
      },
      timeoutOptions: {
        timeoutMs: 30000,
      },
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    version: 1,
  },
];

export function getBuiltInCapturePresets(): CapturePreset[] {
  return BUILTIN_CAPTURE_PRESETS.map((preset) => JSON.parse(JSON.stringify(preset)));
}

export function getBuiltInCapturePresetById(id: string): CapturePreset | undefined {
  const found = BUILTIN_CAPTURE_PRESETS.find((p) => p.id === id);
  return found ? JSON.parse(JSON.stringify(found)) : undefined;
}
