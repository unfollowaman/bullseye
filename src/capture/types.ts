export type CaptureType = 'screenshot' | 'recording';

export type CaptureStatus = 'idle' | 'initializing' | 'capturing' | 'completed' | 'failed';

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
}

export interface ScreenshotResult {
  id: string;
  status: CaptureStatus;
  metadata?: ScreenshotMetadata;
  error?: string;
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
}

export interface RecordingResult {
  id: string;
  status: CaptureStatus;
  metadata?: RecordingMetadata;
  error?: string;
}

export interface CaptureOptions extends ScreenshotOptions {
  type?: CaptureType;
  recordingDurationMs?: number;
}

export interface CaptureResult {
  id: string;
  type: CaptureType;
  status: CaptureStatus;
  url: string;
  outputPath?: string;
  metadata?: ScreenshotMetadata | RecordingMetadata;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CaptureControllerStatus {
  ready: boolean;
  activeCaptures: number;
  supportedTypes: CaptureType[];
}
