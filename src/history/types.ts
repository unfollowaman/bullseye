import { JobStatus, UnifiedCaptureType, ViewportDimensions } from '@/capture/types';

export interface ScreenshotOutputMetadata {
  path: string; // Safe web relative asset URL e.g. /captures/screenshot-123.png
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export interface RecordingOutputMetadata {
  path: string; // Safe web relative asset URL e.g. /captures/recording-123.webm
  durationMs?: number;
  sizeBytes?: number;
  format?: string;
}

export interface CaptureHistoryOutputs {
  screenshot?: ScreenshotOutputMetadata;
  recording?: RecordingOutputMetadata;
}

export interface CaptureHistoryRecord {
  id: string;
  jobId?: string;
  projectId?: string;
  recipeId?: string;
  url: string;
  captureType: UnifiedCaptureType;
  status: JobStatus;
  viewport: ViewportDimensions;
  dpr: number;
  timestamp: string; // ISO date string
  durationMs: number;
  outputs: CaptureHistoryOutputs;
  error?: string;
  warnings?: string[];
  createdAt: string;
}

export interface CreateHistoryRecordInput {
  jobId?: string;
  projectId?: string;
  recipeId?: string;
  url: string;
  captureType: UnifiedCaptureType;
  status: JobStatus;
  viewport: ViewportDimensions;
  dpr: number;
  timestamp?: string;
  durationMs: number;
  outputs?: CaptureHistoryOutputs;
  error?: string;
  warnings?: string[];
}

export interface CaptureHistoryFilter {
  projectId?: string;
  recipeId?: string;
  status?: string;
  captureType?: string;
  limit?: number;
  offset?: number;
}
