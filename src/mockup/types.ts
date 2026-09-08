export type MockupType = 'browser' | 'laptop' | 'phone' | 'presentation';

export type MockupOutputFormat = 'png' | 'jpeg' | 'webp';

export type MockupFitMode = 'cover' | 'contain' | 'fill';

export interface SolidBackground {
  type: 'solid';
  color: string;
}

export interface GradientBackground {
  type: 'gradient';
  startColor: string;
  stopColor: string;
  angle?: number;
}

export interface TransparentBackground {
  type: 'transparent';
}

export type MockupBackground = SolidBackground | GradientBackground | TransparentBackground;

export interface MockupVisualOptions {
  shadow?: boolean;
  shadowBlur?: number;
  shadowOpacity?: number;
  borderRadius?: number;
  browserTitle?: string;
  browserUrl?: string;
  showWindowControls?: boolean;
  deviceColor?: 'dark' | 'light' | 'space-gray' | 'silver' | 'midnight' | string;
  padding?: number;
  scale?: number;
}

export interface MockupConfig {
  type: MockupType;
  sourceAssetPath: string;
  sourceCaptureId?: string;
  outputFormat?: MockupOutputFormat;
  outputDir?: string;
  outputFilename?: string;
  width?: number;
  height?: number;
  padding?: number;
  scale?: number;
  fitMode?: MockupFitMode;
  background?: MockupBackground;
  visualOptions?: MockupVisualOptions;
}

export interface MockupGeneratedAsset {
  safePath: string;
  webPath: string;
  filename: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: MockupOutputFormat;
}

export interface MockupResult {
  id: string;
  mockupType: MockupType;
  sourceAssetPath: string;
  sourceCaptureId?: string;
  config: MockupConfig;
  generatedAsset: MockupGeneratedAsset;
  dimensions: {
    width: number;
    height: number;
  };
  createdAt: string;
  version: number;
  warnings: string[];
  errors?: string[];
}

export interface MockupTypeCapability {
  type: MockupType;
  name: string;
  description: string;
  defaultDimensions: {
    width: number;
    height: number;
  };
  aspectRatio: string;
  supportedDeviceColors?: string[];
  features: string[];
}

export interface MockupCapabilitiesResponse {
  supportedTypes: MockupTypeCapability[];
  supportedFormats: MockupOutputFormat[];
  defaultBackgrounds: MockupBackground[];
}
