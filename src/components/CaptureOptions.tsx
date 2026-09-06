'use client';

import React from 'react';
import { UnifiedCaptureType, ScreenshotMode } from '@/capture/types';

export interface ViewportPreset {
  name: string;
  width: number;
  height: number;
}

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { name: 'Desktop HD (1280x720)', width: 1280, height: 720 },
  { name: 'Desktop Full HD (1920x1080)', width: 1920, height: 1080 },
  { name: 'Mobile - iPhone (375x812)', width: 375, height: 812 },
  { name: 'Tablet - iPad (768x1024)', width: 768, height: 1024 },
  { name: 'Custom', width: 0, height: 0 },
];

export interface CaptureOptionsProps {
  url: string;
  setUrl: (url: string) => void;
  captureType: UnifiedCaptureType;
  setCaptureType: (type: UnifiedCaptureType) => void;
  width: number;
  setWidth: (width: number) => void;
  height: number;
  setHeight: (height: number) => void;
  preset: string;
  setPreset: (preset: string) => void;
  dpr: number;
  setDpr: (dpr: number) => void;
  mode: ScreenshotMode;
  setMode: (mode: ScreenshotMode) => void;
  disableAnimations: boolean;
  setDisableAnimations: (disable: boolean) => void;
  recordingDurationMs: number;
  setRecordingDurationMs: (ms: number) => void;
  additionalWaitMs: number;
  setAdditionalWaitMs: (ms: number) => void;
  timeoutMs: number;
  setTimeoutMs: (ms: number) => void;
  disabled?: boolean;
}

export const CaptureOptions: React.FC<CaptureOptionsProps> = ({
  url,
  setUrl,
  captureType,
  setCaptureType,
  width,
  setWidth,
  height,
  setHeight,
  preset,
  setPreset,
  dpr,
  setDpr,
  mode,
  setMode,
  disableAnimations,
  setDisableAnimations,
  recordingDurationMs,
  setRecordingDurationMs,
  additionalWaitMs,
  setAdditionalWaitMs,
  timeoutMs,
  setTimeoutMs,
  disabled = false,
}) => {
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    setPreset(selectedName);
    const found = VIEWPORT_PRESETS.find((p) => p.name === selectedName);
    if (found && found.width > 0 && found.height > 0) {
      setWidth(found.width);
      setHeight(found.height);
    }
  };

  const showScreenshotOpts = captureType === 'screenshot' || captureType === 'both';
  const showRecordingOpts = captureType === 'recording' || captureType === 'both';

  return (
    <div className="space-y-4 text-sm text-gray-800">
      {/* Target URL Input */}
      <div>
        <label htmlFor="target-url" className="block font-semibold mb-1">
          Target URL <span className="text-red-500">*</span>
        </label>
        <input
          id="target-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          disabled={disabled}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Capture Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="capture-type" className="block font-semibold mb-1">
            Capture Type
          </label>
          <select
            id="capture-type"
            value={captureType}
            onChange={(e) => setCaptureType(e.target.value as UnifiedCaptureType)}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="screenshot">Screenshot (PNG)</option>
            <option value="recording">Screen Recording (WebM)</option>
            <option value="both">Both (Screenshot + Recording)</option>
          </select>
        </div>

        {/* Viewport Presets */}
        <div>
          <label htmlFor="viewport-preset" className="block font-semibold mb-1">
            Viewport Preset
          </label>
          <select
            id="viewport-preset"
            value={preset}
            onChange={handlePresetChange}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {VIEWPORT_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Device Scale Factor (DPR) */}
        <div>
          <label htmlFor="device-scale-factor" className="block font-semibold mb-1">
            Device Scale Factor (DPR)
          </label>
          <select
            id="device-scale-factor"
            value={dpr}
            onChange={(e) => setDpr(Number(e.target.value))}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value={1}>1x (Standard)</option>
            <option value={2}>2x (Retina / High-DPI)</option>
            <option value={3}>3x (Ultra High-DPI)</option>
          </select>
        </div>
      </div>

      {/* Viewport Dimensions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="viewport-width" className="block font-semibold mb-1">
            Width (px)
          </label>
          <input
            id="viewport-width"
            type="number"
            min={100}
            max={7680}
            value={width}
            onChange={(e) => {
              setWidth(Number(e.target.value));
              setPreset('Custom');
            }}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="viewport-height" className="block font-semibold mb-1">
            Height (px)
          </label>
          <input
            id="viewport-height"
            type="number"
            min={100}
            max={4320}
            value={height}
            onChange={(e) => {
              setHeight(Number(e.target.value));
              setPreset('Custom');
            }}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Conditional Options Grid */}
      <div className="border-t border-gray-200 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Screenshot Options */}
        {showScreenshotOpts && (
          <div className="space-y-3 bg-blue-50/50 p-3 rounded border border-blue-100">
            <h4 className="font-semibold text-blue-900">Screenshot Options</h4>
            <div>
              <label htmlFor="screenshot-mode" className="block font-medium mb-1">
                Capture Mode
              </label>
              <select
                id="screenshot-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as ScreenshotMode)}
                disabled={disabled}
                className="w-full p-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="viewport">Viewport Only</option>
                <option value="fullPage">Full Page</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={disableAnimations}
                  onChange={(e) => setDisableAnimations(e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">Disable CSS Animations / Transitions</span>
              </label>
            </div>
          </div>
        )}

        {/* Recording Options */}
        {showRecordingOpts && (
          <div className="space-y-3 bg-purple-50/50 p-3 rounded border border-purple-100">
            <h4 className="font-semibold text-purple-900">Recording Options</h4>
            <div>
              <label htmlFor="recording-duration" className="block font-medium mb-1">
                Recording Duration (ms)
              </label>
              <input
                id="recording-duration"
                type="number"
                step={500}
                min={1000}
                max={60000}
                value={recordingDurationMs}
                onChange={(e) => setRecordingDurationMs(Number(e.target.value))}
                disabled={disabled}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              />
              <span className="text-xs text-gray-500 mt-1 block">
                {(recordingDurationMs / 1000).toFixed(1)} seconds
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Wait & Timeout Options */}
      <div className="border-t border-gray-200 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="additional-wait" className="block font-semibold mb-1">
            Additional Wait Time (ms)
          </label>
          <input
            id="additional-wait"
            type="number"
            step={100}
            min={0}
            max={30000}
            value={additionalWaitMs}
            onChange={(e) => setAdditionalWaitMs(Number(e.target.value))}
            disabled={disabled}
            placeholder="0"
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div>
          <label htmlFor="timeout-ms" className="block font-semibold mb-1">
            Timeout Limit (ms)
          </label>
          <input
            id="timeout-ms"
            type="number"
            step={1000}
            min={1000}
            max={120000}
            value={timeoutMs}
            onChange={(e) => setTimeoutMs(Number(e.target.value))}
            disabled={disabled}
            placeholder="30000"
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      </div>
    </div>
  );
};
