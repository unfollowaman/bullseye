export type CaptureType = 'screenshot' | 'recording';

export type CaptureStatus = 'idle' | 'initializing' | 'capturing' | 'completed' | 'failed';

export interface CaptureOptions {
  url: string;
  viewport?: {
    width: number;
    height: number;
  };
  fullPage?: boolean;
}

export interface CaptureResult {
  id: string;
  type: CaptureType;
  status: CaptureStatus;
  url: string;
  outputPath?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CaptureControllerStatus {
  ready: boolean;
  activeCaptures: number;
  supportedTypes: CaptureType[];
}
