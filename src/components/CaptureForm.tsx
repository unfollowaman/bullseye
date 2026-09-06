'use client';

import React, { useState } from 'react';
import { UnifiedCaptureConfig, UnifiedCaptureResult, UnifiedCaptureType, ScreenshotMode } from '@/capture/types';
import { isValidUrl } from '@/utils/url-utils';
import { CaptureOptions } from './CaptureOptions';
import { CaptureStatus, ExtendedJobStatus } from './CaptureStatus';
import { ResultContainer } from './ResultContainer';

export const CaptureForm: React.FC = () => {
  // Capture configuration state
  const [url, setUrl] = useState('https://example.com');
  const [captureType, setCaptureType] = useState<UnifiedCaptureType>('screenshot');
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [preset, setPreset] = useState('Desktop HD (1280x720)');
  const [dpr, setDpr] = useState(1);
  const [mode, setMode] = useState<ScreenshotMode>('viewport');
  const [disableAnimations, setDisableAnimations] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(5000);
  const [additionalWaitMs, setAdditionalWaitMs] = useState(0);
  const [timeoutMs, setTimeoutMs] = useState(30000);

  // Job execution state
  const [status, setStatus] = useState<ExtendedJobStatus>('idle');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<UnifiedCaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [cancelling, setCancelling] = useState(false);

  // Client-side validation helper
  const validateForm = (): { valid: boolean; error?: string } => {
    if (!url || !url.trim()) {
      return { valid: false, error: 'Target URL is required.' };
    }

    if (!isValidUrl(url.trim())) {
      return {
        valid: false,
        error: `Invalid URL '${url}'. URL must start with http:// or https://`,
      };
    }

    if (isNaN(width) || width <= 0) {
      return { valid: false, error: 'Viewport width must be a positive number.' };
    }

    if (isNaN(height) || height <= 0) {
      return { valid: false, error: 'Viewport height must be a positive number.' };
    }

    if (isNaN(dpr) || dpr <= 0) {
      return { valid: false, error: 'Device scale factor (DPR) must be a positive number.' };
    }

    if (captureType === 'recording' || captureType === 'both') {
      if (isNaN(recordingDurationMs) || recordingDurationMs < 1000) {
        return { valid: false, error: 'Recording duration must be at least 1000ms (1 second).' };
      }
    }

    if (additionalWaitMs < 0 || isNaN(additionalWaitMs)) {
      return { valid: false, error: 'Additional wait time cannot be negative.' };
    }

    if (timeoutMs < 1000 || isNaN(timeoutMs)) {
      return { valid: false, error: 'Timeout limit must be at least 1000ms.' };
    }

    return { valid: true };
  };

  const handleStartCapture = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submission while already running
    if (status === 'pending' || status === 'running' || status === 'validating') {
      return;
    }

    setError(null);
    setJobResult(null);
    setStatus('validating');
    setProgressMessage('Validating input parameters...');

    // 1. Client-side validation
    const validation = validateForm();
    if (!validation.valid) {
      setStatus('failed');
      setError(validation.error || 'Invalid configuration');
      setProgressMessage('');
      return;
    }

    // 2. Build configuration payload and job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setCurrentJobId(jobId);
    setStatus('running');
    setProgressMessage(`Executing ${captureType} capture for ${url}...`);

    const payload: UnifiedCaptureConfig = {
      id: jobId,
      url: url.trim(),
      captureType,
      viewport: { width: Number(width), height: Number(height) },
      deviceScaleFactor: Number(dpr),
      screenshotOptions: {
        mode,
        fullPage: mode === 'fullPage',
      },
      recordingOptions: {
        durationMs: Number(recordingDurationMs),
      },
      stabilizationOptions: {
        disableAnimations,
        additionalWaitMs: Number(additionalWaitMs),
      },
      timeoutOptions: {
        timeoutMs: Number(timeoutMs),
      },
    };

    try {
      const response = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: UnifiedCaptureResult = await response.json();

      if (!response.ok) {
        setStatus('failed');
        if (data && data.status) {
          setJobResult(data);
          setError(data.errors?.join('; ') || 'Capture execution failed.');
        } else {
          const apiErr = (data as unknown as { error?: string })?.error || 'Capture request failed.';
          setError(apiErr);
        }
        setProgressMessage('');
      } else {
        setJobResult(data);
        setStatus(data.status);
        if (data.status === 'completed') {
          setProgressMessage('Capture finished successfully!');
        } else if (data.status === 'partial') {
          setProgressMessage('Capture finished with partial success.');
        } else if (data.status === 'cancelled') {
          setProgressMessage('Capture was cancelled.');
        } else if (data.status === 'failed') {
          setProgressMessage('Capture execution failed.');
          setError(data.errors?.join('; ') || 'Capture failed.');
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Network or server communication error';
      setStatus('failed');
      setError(errMsg);
      setProgressMessage('');
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelCapture = async () => {
    if (!currentJobId || cancelling) return;

    setCancelling(true);
    setProgressMessage('Sending cancellation request...');

    try {
      const res = await fetch('/api/capture/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: currentJobId, reason: 'Cancelled by user via UI' }),
      });

      if (res.ok) {
        setStatus('cancelled');
        setProgressMessage('Capture successfully cancelled.');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to cancel capture.');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to communicate with cancellation API';
      setError(errMsg);
    } finally {
      setCancelling(false);
    }
  };

  const isRunning = status === 'pending' || status === 'running' || status === 'validating';

  return (
    <div className="space-y-6">
      {/* Capture Form Panel */}
      <form
        onSubmit={handleStartCapture}
        noValidate
        data-testid="capture-form"
        className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm space-y-5"
      >
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Configure Capture</h2>
          <span className="text-xs text-gray-500">Phase 5 UI</span>
        </div>

        <CaptureOptions
          url={url}
          setUrl={setUrl}
          captureType={captureType}
          setCaptureType={setCaptureType}
          width={width}
          setWidth={setWidth}
          height={height}
          setHeight={setHeight}
          preset={preset}
          setPreset={setPreset}
          dpr={dpr}
          setDpr={setDpr}
          mode={mode}
          setMode={setMode}
          disableAnimations={disableAnimations}
          setDisableAnimations={setDisableAnimations}
          recordingDurationMs={recordingDurationMs}
          setRecordingDurationMs={setRecordingDurationMs}
          additionalWaitMs={additionalWaitMs}
          setAdditionalWaitMs={setAdditionalWaitMs}
          timeoutMs={timeoutMs}
          setTimeoutMs={setTimeoutMs}
          disabled={isRunning}
        />

        <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
          <button
            type="submit"
            data-testid="start-capture-button"
            disabled={isRunning}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Capturing...
              </>
            ) : (
              `Start ${captureType === 'both' ? 'Capture (Both)' : captureType}`
            )}
          </button>
        </div>
      </form>

      {/* Progress & Status Bar */}
      <CaptureStatus
        status={status}
        progressMessage={progressMessage}
        onCancel={isRunning ? handleCancelCapture : undefined}
        cancelling={cancelling}
      />

      {/* Results Container */}
      <ResultContainer jobResult={jobResult} error={error} />
    </div>
  );
};
