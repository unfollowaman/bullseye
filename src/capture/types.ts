import { CaptureAction, ActionDiagnostic } from './action-types';

export * from './action-types';

export type CaptureType = 'screenshot' | 'recording';
export type UnifiedCaptureType = 'screenshot' | 'recording' | 'both';

export type CaptureStatus = 'idle' | 'initializing' | 'capturing' | 'completed' | 'failed';
export type JobStatus = 'pending' | 'running' | 'completed' | 'partial' | 'failed' | 'cancelled';

export type ScreenshotMode = 'viewport' | 'fullPage';

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface ScreenshotOptions {
  url: string;
  viewport?: ViewportDimensions;
  deviceScaleFactor?: number;
  mode?: ScreenshotMode;
  fullPage?: boolean; // Convenience alias or fallback for mode === 'fullPage'
  disableAnimations?: boolean;
  additionalWaitMs?: number;
  timeout?: number; // Timeout in milliseconds
  outputDir?: string;
  filename?: string;
  cancellationToken?: { cancelled: boolean };
  actions?: CaptureAction[];
}

export interface ScreenshotMetadata {
  id: string;
  url: string;
  viewport: ViewportDimensions;
  deviceScaleFactor: number;
  mode: ScreenshotMode;
  outputPath: string;
  capturedAt: string;
  durationMs: number;
  fileSizeBytes: number;
  actionDiagnostics?: ActionDiagnostic[];
}

export interface ScreenshotResult {
  id: string;
  status: CaptureStatus;
  metadata?: ScreenshotMetadata;
  error?: string;
  actionDiagnostics?: ActionDiagnostic[];
}

export interface RecordingOptions {
  url: string;
  viewport?: ViewportDimensions;
  deviceScaleFactor?: number;
  recordingDurationMs?: number;
  durationMs?: number; // Alias for recordingDurationMs or total duration override
  additionalWaitMs?: number;
  timeout?: number;
  outputDir?: string;
  filename?: string;
  cancellationToken?: { cancelled: boolean };
  actions?: CaptureAction[];
}

export interface RecordingMetadata {
  id: string;
  url: string;
  viewport: ViewportDimensions;
  deviceScaleFactor: number;
  recordingDurationMs: number;
  actualRecordingDurationMs: number;
  durationMs: number;
  format: 'webm';
  outputPath: string;
  capturedAt: string;
  fileSizeBytes: number;
  actionDiagnostics?: ActionDiagnostic[];
}

export interface RecordingResult {
  id: string;
  status: CaptureStatus;
  metadata?: RecordingMetadata;
  error?: string;
  actionDiagnostics?: ActionDiagnostic[];
}

// Phase 1-3 legacy/convenience options format
export interface CaptureOptions extends ScreenshotOptions {
  type?: UnifiedCaptureType;
  captureType?: UnifiedCaptureType;
  recordingDurationMs?: number;
}

// Unified Capture Config options structure for Phase 4
export interface UnifiedScreenshotOptions {
  mode?: ScreenshotMode;
  fullPage?: boolean;
  filename?: string;
}

export interface UnifiedRecordingOptions {
  durationMs?: number;
  filename?: string;
}

export interface StabilizationOptions {
  disableAnimations?: boolean;
  additionalWaitMs?: number;
}

export interface TimeoutOptions {
  timeoutMs?: number; // Navigation & total capture timeout limit
}

export interface UnifiedCaptureConfig {
  id?: string;
  url: string;
  captureType?: UnifiedCaptureType;
  type?: UnifiedCaptureType; // Alias for captureType
  viewport?: ViewportDimensions;
  deviceScaleFactor?: number;
  screenshotOptions?: UnifiedScreenshotOptions;
  recordingOptions?: UnifiedRecordingOptions;
  stabilizationOptions?: StabilizationOptions;
  timeoutOptions?: TimeoutOptions;
  outputDir?: string;
  actions?: CaptureAction[];
  // Flattened / legacy fallbacks for maximum usability:
  mode?: ScreenshotMode;
  fullPage?: boolean;
  disableAnimations?: boolean;
  additionalWaitMs?: number;
  recordingDurationMs?: number;
  timeout?: number;
  filename?: string;
}

export interface UnifiedCaptureOutputPaths {
  screenshot?: string;
  recording?: string;
}

export interface UnifiedCaptureTimestamps {
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface UnifiedCaptureDurations {
  totalMs?: number;
  screenshotMs?: number;
  recordingMs?: number;
}

export interface UnifiedCaptureResult {
  id: string;
  status: JobStatus;
  url: string;
  viewport: ViewportDimensions;
  deviceScaleFactor: number;
  requestedCaptureTypes: ('screenshot' | 'recording')[];
  screenshotResult?: ScreenshotResult;
  recordingResult?: RecordingResult;
  outputPaths: UnifiedCaptureOutputPaths;
  timestamps: UnifiedCaptureTimestamps;
  durations: UnifiedCaptureDurations;
  errors: string[];
  warnings: string[];
  actionDiagnostics?: ActionDiagnostic[];
}

// Legacy CaptureResult for backwards compatibility
export interface CaptureResult {
  id: string;
  type: UnifiedCaptureType;
  status: CaptureStatus | JobStatus;
  url: string;
  outputPath?: string;
  metadata?: ScreenshotMetadata | RecordingMetadata;
  error?: string;
  createdAt: string;
  completedAt?: string;
  unifiedResult?: UnifiedCaptureResult;
}

export interface CaptureControllerStatus {
  ready: boolean;
  activeCaptures: number;
  supportedTypes: UnifiedCaptureType[];
}
