'use client';

import React from 'react';
import { UnifiedCaptureResult } from '@/capture/types';
import { ScreenshotResult } from './ScreenshotResult';
import { RecordingResult } from './RecordingResult';

export interface ResultContainerProps {
  jobResult?: UnifiedCaptureResult | null;
  error?: string | null;
}

export const ResultContainer: React.FC<ResultContainerProps> = ({ jobResult, error }) => {
  if (error && !jobResult) {
    return (
      <div
        data-testid="result-container"
        className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-900 text-sm space-y-1"
      >
        <h3 className="font-bold text-base">Capture Request Failed</h3>
        <p className="text-red-700" data-testid="job-global-error">{error}</p>
      </div>
    );
  }

  if (!jobResult) {
    return null;
  }

  const { status, screenshotResult, recordingResult, errors, warnings } = jobResult;

  const isPartial = status === 'partial';
  const isFailed = status === 'failed';

  return (
    <div data-testid="result-container" className="space-y-4">
      {/* Partial Success / General Job Warnings */}
      {isPartial && (
        <div
          data-testid="partial-status-banner"
          className="p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm"
        >
          <div className="font-semibold flex items-center gap-2">
            <span>⚠️ Partial Capture Completed</span>
          </div>
          <p className="text-xs text-amber-800 mt-1">
            One of the capture operations succeeded while another failed. The successful output is
            available below.
          </p>
        </div>
      )}

      {/* Warnings Banner */}
      {warnings && warnings.length > 0 && !isPartial && (
        <div className="p-3 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-900 text-xs space-y-1">
          {warnings.map((w, idx) => (
            <p key={idx}>⚠️ {w}</p>
          ))}
        </div>
      )}

      {/* Global Job Failure Banner */}
      {isFailed && (
        <div
          data-testid="job-failed-banner"
          className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-900 text-sm space-y-2"
        >
          <h3 className="font-bold text-base">Capture Failed</h3>
          {errors && errors.length > 0 ? (
            <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-red-700">{error || 'An unexpected error occurred during execution.'}</p>
          )}
        </div>
      )}

      {/* Results grid */}
      <div className="space-y-4">
        {screenshotResult && (
          <ScreenshotResult result={screenshotResult} />
        )}

        {recordingResult && (
          <RecordingResult result={recordingResult} />
        )}
      </div>
    </div>
  );
};
