export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  jobId?: string;
  url?: string;
  type?: string;
  [key: string]: unknown;
}

export class CaptureLogger {
  private static formatMessage(level: LogLevel, event: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const jobIdStr = context?.jobId ? ` [job:${context.jobId}]` : '';
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${jobIdStr} ${event}${contextStr}`;
  }

  static info(event: string, context?: LogContext): void {
    console.log(this.formatMessage('info', event, context));
  }

  static warn(event: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', event, context));
  }

  static error(event: string, context?: LogContext): void {
    console.error(this.formatMessage('error', event, context));
  }

  static debug(event: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.debug(this.formatMessage('debug', event, context));
    }
  }

  // Helper capture lifecycle logging methods
  static logJobCreated(jobId: string, url: string, type: string, details?: Record<string, unknown>): void {
    this.info('job_created', { jobId, url, type, ...details });
  }

  static logValidation(jobId: string, valid: boolean, message?: string): void {
    if (valid) {
      this.info('validation_passed', { jobId });
    } else {
      this.warn('validation_failed', { jobId, message });
    }
  }

  static logCaptureStarted(jobId: string, requestedTypes: string[]): void {
    this.info('capture_started', { jobId, requestedTypes });
  }

  static logScreenshotStarted(jobId: string): void {
    this.info('screenshot_started', { jobId });
  }

  static logScreenshotCompleted(jobId: string, durationMs: number, outputPath: string): void {
    this.info('screenshot_completed', { jobId, durationMs, outputPath });
  }

  static logScreenshotFailed(jobId: string, error: string): void {
    this.error('screenshot_failed', { jobId, error });
  }

  static logRecordingStarted(jobId: string, durationMs: number): void {
    this.info('recording_started', { jobId, durationMs });
  }

  static logRecordingCompleted(jobId: string, actualDurationMs: number, outputPath: string): void {
    this.info('recording_completed', { jobId, actualDurationMs, outputPath });
  }

  static logRecordingFailed(jobId: string, error: string): void {
    this.error('recording_failed', { jobId, error });
  }

  static logCaptureCompleted(jobId: string, status: string, durationMs: number): void {
    this.info('capture_completed', { jobId, status, durationMs });
  }

  static logCaptureFailed(jobId: string, error: string): void {
    this.error('capture_failed', { jobId, error });
  }

  static logCancellation(jobId: string, reason?: string): void {
    this.warn('capture_cancelled', { jobId, reason });
  }

  static logCleanup(jobId: string, details?: string): void {
    this.info('cleanup', { jobId, details });
  }
}
