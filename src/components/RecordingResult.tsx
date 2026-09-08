'use client';

import React, { useState } from 'react';
import { RecordingResult as IRecordingResult } from '@/capture/types';
import { getPublicAssetUrl } from '@/utils/url-utils';

export interface RecordingResultProps {
  result: IRecordingResult;
}

export const RecordingResult: React.FC<RecordingResultProps> = ({ result }) => {
  const [activeTab, setActiveTab] = useState<'webm' | 'mp4'>('webm');
  const { metadata, error, status, mp4Result } = result;

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

  const webmAssetUrl = getPublicAssetUrl(metadata.outputPath);
  const mp4FsPath = metadata.mp4OutputPath || mp4Result?.outputPath;
  const mp4AssetUrl = mp4FsPath ? getPublicAssetUrl(mp4FsPath) : undefined;

  const webmSizeMb = (metadata.fileSizeBytes / (1024 * 1024)).toFixed(2);
  const mp4SizeMb = mp4Result?.fileSizeBytes
    ? (mp4Result.fileSizeBytes / (1024 * 1024)).toFixed(2)
    : undefined;

  const mp4Failed = mp4Result?.status === 'failed';

  return (
    <div
      data-testid="recording-result-card"
      className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm space-y-3 text-sm text-gray-800"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
        <div>
          <h3 className="font-bold text-gray-900 text-base">
            Screen Recording Result {mp4AssetUrl ? '(WebM + MP4)' : '(WebM)'}
          </h3>
          <p className="text-gray-500 text-xs">ID: {metadata.id}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {webmAssetUrl && (
            <a
              href={webmAssetUrl}
              download={`recording-${metadata.id}.webm`}
              data-testid="download-recording-button"
              className="inline-flex items-center justify-center px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium text-xs transition-colors"
            >
              Download WebM
            </a>
          )}

          {mp4AssetUrl && (
            <a
              href={mp4AssetUrl}
              download={`recording-${metadata.id}.mp4`}
              data-testid="download-mp4-button"
              className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium text-xs transition-colors"
            >
              Download MP4
            </a>
          )}
        </div>
      </div>

      {/* MP4 Partial Failure Warning Banner */}
      {mp4Failed && (
        <div
          data-testid="mp4-failure-banner"
          className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs"
        >
          <span className="font-bold">⚠️ MP4 Conversion Failed: </span>
          <span>{mp4Result?.error || 'Failed to convert WebM recording to MP4.'}</span>
          <p className="mt-1 text-[11px] text-amber-800">
            The original WebM recording is intact and available for download or playback below.
          </p>
        </div>
      )}

      {/* Metadata Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-gray-50 p-2.5 rounded border border-gray-100">
        <div>
          <span className="text-gray-500 block">Dimensions</span>
          <span className="font-semibold">
            {metadata.viewport.width} x {metadata.viewport.height}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">DPR / Mode</span>
          <span className="font-semibold">
            {metadata.deviceScaleFactor}x
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">File Sizes</span>
          <span className="font-semibold">
            WebM: {webmSizeMb} MB {mp4SizeMb ? `| MP4: ${mp4SizeMb} MB` : ''}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">Duration</span>
          <span className="font-semibold">
            {(metadata.actualRecordingDurationMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Video Player & Format Tabs */}
      {mp4AssetUrl && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-1 text-xs font-semibold">
          <button
            type="button"
            data-testid="select-webm-tab"
            onClick={() => setActiveTab('webm')}
            className={`px-3 py-1 rounded-t border-b-2 transition-colors ${
              activeTab === 'webm'
                ? 'border-purple-600 text-purple-700 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            WebM Format
          </button>
          <button
            type="button"
            data-testid="select-mp4-tab"
            onClick={() => setActiveTab('mp4')}
            className={`px-3 py-1 rounded-t border-b-2 transition-colors ${
              activeTab === 'mp4'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            MP4 Format (H.264)
          </button>
        </div>
      )}

      {/* Video Element */}
      {activeTab === 'mp4' && mp4AssetUrl ? (
        <div className="mt-2 border border-gray-200 rounded overflow-hidden bg-black flex justify-center p-2">
          <video
            controls
            preload="metadata"
            src={mp4AssetUrl}
            data-testid="mp4-video-player"
            className="max-h-[500px] w-full rounded"
          >
            Your browser does not support playing MP4 videos.
          </video>
        </div>
      ) : webmAssetUrl ? (
        <div className="mt-2 border border-gray-200 rounded overflow-hidden bg-black flex justify-center p-2">
          <video
            controls
            preload="metadata"
            src={webmAssetUrl}
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
