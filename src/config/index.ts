export interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  appUrl: string;
  isHeadless: boolean;
  maxConcurrentJobs: number;
  defaultTimeoutMs: number;
  maxTimeoutMs: number;
  defaultRecordingDurationMs: number;
  maxRecordingDurationMs: number;
  maxViewportWidth: number;
  maxViewportHeight: number;
  maxSubprocessStderrBuffer: number;
  maxBodySizeBytes: number;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: (process.env.NODE_ENV as AppConfig['env']) || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  isHeadless: process.env.HEADLESS !== 'false',
  maxConcurrentJobs: Math.min(10, Math.max(1, parseInt(process.env.MAX_CONCURRENT_JOBS || '4', 10))),
  defaultTimeoutMs: 30000,
  maxTimeoutMs: 120000,
  defaultRecordingDurationMs: 5000,
  maxRecordingDurationMs: 300000, // 5 minutes max
  maxViewportWidth: 7680, // 8K max width
  maxViewportHeight: 4320, // 8K max height
  maxSubprocessStderrBuffer: 100000, // 100KB max stderr buffer
  maxBodySizeBytes: 10 * 1024 * 1024, // 10MB max body size
};
