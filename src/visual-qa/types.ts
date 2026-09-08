export type VisualQAComparisonMode = 'pixel' | 'overlay' | 'diff' | 'all';
export type VisualQAOutputFormat = 'png' | 'jpeg' | 'webp';
export type VisualQAOutcome = 'pass' | 'fail' | 'error';
export type VisualQAStatus = 'completed' | 'failed' | 'error';

export interface VisualQADimensions {
  width: number;
  height: number;
}

export interface VisualQAConfig {
  baselineAssetPath?: string;
  currentAssetPath?: string;
  baselineCaptureId?: string;
  currentCaptureId?: string;
  comparisonMode?: VisualQAComparisonMode;
  pixelTolerance?: number; // Absolute RGB diff threshold (0 to 255). Default 10.
  thresholdPercent?: number; // Max changed pixel percentage allowed for PASS (0 to 100). Default 0.0%.
  diffColor?: string; // Hex color string e.g. '#ff00ff'. Default '#ff00ff'.
  overlayOpacity?: number; // Blending ratio (0.0 to 1.0). Default 0.5.
  outputFormat?: VisualQAOutputFormat; // Default 'png'.
  generateDiff?: boolean; // Default true.
  generateOverlay?: boolean; // Default true.
  outputDir?: string;
  outputFilenamePrefix?: string;
  metadata?: Record<string, unknown>;
}

export interface ResolvedVisualQAConfig {
  baselineAssetPath: string;
  currentAssetPath: string;
  baselineCaptureId?: string;
  currentCaptureId?: string;
  comparisonMode: VisualQAComparisonMode;
  pixelTolerance: number;
  thresholdPercent: number;
  diffColor: string;
  overlayOpacity: number;
  outputFormat: VisualQAOutputFormat;
  generateDiff: boolean;
  generateOverlay: boolean;
  outputDir?: string;
  outputFilenamePrefix?: string;
  metadata: Record<string, unknown>;
}

export interface VisualQAAssetRef {
  safePath: string;
  webPath: string;
  filename: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: VisualQAOutputFormat;
}

export interface VisualQAMetrics {
  changedPixels: number;
  totalPixels: number;
  changedPercentage: number;
}

export interface VisualQAResult {
  id: string;
  baselineAssetPath: string;
  currentAssetPath: string;
  baselineCaptureId?: string;
  currentCaptureId?: string;
  baselineDimensions?: VisualQADimensions;
  currentDimensions?: VisualQADimensions;
  status: VisualQAStatus;
  outcome: VisualQAOutcome;
  match: boolean;
  metrics: VisualQAMetrics;
  config: ResolvedVisualQAConfig;
  diffAsset?: VisualQAAssetRef;
  overlayAsset?: VisualQAAssetRef;
  createdAt: string;
  durationMs: number;
  warnings: string[];
  error?: string;
  version: number;
}

export interface VisualQACapabilities {
  supportedModes: VisualQAComparisonMode[];
  supportedFormats: VisualQAOutputFormat[];
  defaultConfig: ResolvedVisualQAConfig;
}

export interface VisualQAValidationResult {
  valid: boolean;
  sanitizedConfig?: ResolvedVisualQAConfig;
  errors: string[];
  warnings: string[];
}
