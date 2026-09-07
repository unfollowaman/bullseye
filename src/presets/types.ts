import { UnifiedCaptureConfig, ViewportDimensions } from '@/capture/types';

export type DeviceCategory = 'desktop' | 'laptop' | 'tablet' | 'mobile' | 'custom';

export interface DeviceEmulationMetadata {
  userAgent?: string;
  isMobile?: boolean;
  hasTouch?: boolean;
}

export interface DevicePreset {
  id: string;
  name: string;
  category: DeviceCategory;
  viewport: ViewportDimensions;
  deviceScaleFactor: number;
  isBuiltIn: boolean;
  description?: string;
  deviceMetadata?: DeviceEmulationMetadata;
}

export interface CustomDeviceConfig {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export interface CapturePreset {
  id: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;
  devicePresetId?: string;
  config: UnifiedCaptureConfig;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateCapturePresetInput {
  name: string;
  description?: string;
  devicePresetId?: string;
  config: UnifiedCaptureConfig;
}

export interface UpdateCapturePresetInput {
  name?: string;
  description?: string;
  devicePresetId?: string | null;
  config?: UnifiedCaptureConfig;
}

export interface PresetValidationResult {
  valid: boolean;
  errors: string[];
}
