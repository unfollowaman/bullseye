'use client';

import React from 'react';
import { ScreenshotResult as IScreenshotResult } from '@/capture/types';
import { getPublicAssetUrl } from '@/utils/url-utils';

export interface ScreenshotResultProps {
  result: IScreenshotResult;
}

export const ScreenshotResult: React.FC<ScreenshotResultProps> = ({ result }) => {
  const { metadata, error, status } = result;

  if (status === 'failed' || error) {
    return (
      <div
        data-testid="screenshot-result-error"
        className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-900 text-sm"
      >
        <h4 className="font-semibold text-base mb-1">Screenshot Capture Failed</h4>
        <p className="text-red-700">{error || 'An error occurred during screenshot capture.'}</p>
      </div>
    );
  }

  if (!metadata) {
    return null;
  }

  const assetUrl = getPublicAssetUrl(metadata.outputPath);
  const fileSizeKb = (metadata.fileSizeBytes / 1024).toFixed(1);

  return (
    <div
      data-testid="screenshot-result-card"
      className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm space-y-3 text-sm text-gray-800"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Screenshot Result (PNG)</h3>
          <p className="text-gray-500 text-xs">ID: {metadata.id}</p>
        </div>

        {assetUrl && (
          <a
            href={assetUrl}
            download={`screenshot-${metadata.id}.png`}
            data-testid="download-screenshot-button"
            className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-xs transition-colors"
          >
            Download PNG
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
          <span className="text-gray-500 block">Mode / DPR</span>
          <span className="font-semibold">
            {metadata.mode} ({metadata.deviceScaleFactor}x)
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">File Size</span>
          <span className="font-semibold">{fileSizeKb} KB</span>
        </div>
        <div>
          <span className="text-gray-500 block">Duration</span>
          <span className="font-semibold">{metadata.durationMs} ms</span>
        </div>
      </div>

      {/* Image Preview */}
      {assetUrl ? (
        <div className="mt-2 border border-gray-200 rounded overflow-hidden bg-gray-100 flex justify-center p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl}
            alt={`Screenshot preview of ${metadata.url}`}
            data-testid="screenshot-preview-image"
            className="max-h-[500px] w-auto max-w-full object-contain rounded shadow-sm"
          />
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">Preview unavailable</p>
      )}
    </div>
  );
};
