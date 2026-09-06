'use client';

import React from 'react';
import { RecordingResult as IRecordingResult } from '@/capture/types';
import { getPublicAssetUrl } from '@/utils/url-utils';

export interface RecordingResultProps {
  result: IRecordingResult;
}

export const RecordingResult: React.FC<RecordingResultProps> = ({ result }) => {
  const { metadata, error, status } = result;

  if (status === 'failed' || error) {
    return (
      <div
        data-testid="recording-result-error"
        className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-900 text-sm"
      >
        <h4 className="font-semibold text-base mb-1">Screen Recording Failed</h4>
        <p className="text-red-700">{error || 'An error occurred during screen recording.'}</p>
      </div>
    );
  }

  if (!metadata) {
    return null;
  }

  const assetUrl = getPublicAssetUrl(metadata.outputPath);
  const fileSizeMb = (metadata.fileSizeBytes / (1024 * 1024)).toFixed(2);

  return (
    <div
      data-testid="recording-result-card"
      className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm space-y-3 text-sm text-gray-800"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Screen Recording Result (WebM)</h3>
          <p className="text-gray-500 text-xs">ID: {metadata.id}</p>
        </div>

        {assetUrl && (
          <a
            href={assetUrl}
            download={`recording-${metadata.id}.webm`}
            data-testid="download-recording-button"
            className="inline-flex items-center justify-center px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium text-xs transition-colors"
          >
            Download WebM
          </a>
        )}
      </div>

      {/* Metadata Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-gray-50 p-2.5 rounded border border-gray-100">
        <div>
          <span className="text-gray-500 block">Dimensions</span>
          <span className="font-semibold">
            {metadata.viewport.width} x {metadata.viewport.height}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">Format / DPR</span>
          <span className="font-semibold">
            {metadata.format.toUpperCase()} ({metadata.deviceScaleFactor}x)
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">File Size</span>
          <span className="font-semibold">{fileSizeMb} MB</span>
        </div>
        <div>
          <span className="text-gray-500 block">Duration</span>
          <span className="font-semibold">
            {(metadata.actualRecordingDurationMs / 1000).toFixed(1)}s (Target:{' '}
            {(metadata.recordingDurationMs / 1000).toFixed(1)}s)
          </span>
        </div>
      </div>

      {/* Video Player */}
      {assetUrl ? (
        <div className="mt-2 border border-gray-200 rounded overflow-hidden bg-black flex justify-center p-2">
          <video
            controls
            preload="metadata"
            src={assetUrl}
            data-testid="recording-video-player"
            className="max-h-[500px] w-full rounded"
          >
            Your browser does not support the WebM video format.
          </video>
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">Video preview unavailable</p>
      )}
    </div>
  );
};
