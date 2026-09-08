'use client';

import React, { useState, useEffect } from 'react';
import { UnifiedCaptureType, ScreenshotMode, UnifiedCaptureConfig, Mp4QualityPreset } from '@/capture/types';
import { DevicePreset, CapturePreset } from '@/presets/types';
import { BUILTIN_DEVICE_PRESETS } from '@/presets/devices';

export interface CaptureOptionsProps {
  url: string;
  setUrl: (url: string) => void;
  captureType: UnifiedCaptureType;
  setCaptureType: (type: UnifiedCaptureType) => void;
  width: number;
  setWidth: (width: number) => void;
  height: number;
  setHeight: (height: number) => void;
  preset: string; // Device preset name / ID
  setPreset: (preset: string) => void;
  dpr: number;
  setDpr: (dpr: number) => void;
  mode: ScreenshotMode;
  setMode: (mode: ScreenshotMode) => void;
  disableAnimations: boolean;
  setDisableAnimations: (disable: boolean) => void;
  recordingDurationMs: number;
  setRecordingDurationMs: (ms: number) => void;
  convertToMp4?: boolean;
  setConvertToMp4?: (convert: boolean) => void;
  mp4Quality?: Mp4QualityPreset;
  setMp4Quality?: (quality: Mp4QualityPreset) => void;
  advancedCursorEnabled?: boolean;
  setAdvancedCursorEnabled?: (enabled: boolean) => void;
  advancedClickIndicatorEnabled?: boolean;
  setAdvancedClickIndicatorEnabled?: (enabled: boolean) => void;
  advancedCursorStyle?: 'default' | 'dot' | 'pointer' | 'brand';
  setAdvancedCursorStyle?: (style: 'default' | 'dot' | 'pointer' | 'brand') => void;
  additionalWaitMs: number;
  setAdditionalWaitMs: (ms: number) => void;
  timeoutMs: number;
  setTimeoutMs: (ms: number) => void;
  disabled?: boolean;
  onApplyCapturePreset?: (preset: CapturePreset) => void;
  onSaveAsPreset?: (name: string, description: string) => void;
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
  convertToMp4 = false,
  setConvertToMp4,
  mp4Quality = 'medium',
  setMp4Quality,
  advancedCursorEnabled = true,
  setAdvancedCursorEnabled,
  advancedClickIndicatorEnabled = true,
  setAdvancedClickIndicatorEnabled,
  advancedCursorStyle = 'default',
  setAdvancedCursorStyle,
  additionalWaitMs,
  setAdditionalWaitMs,
  timeoutMs,
  setTimeoutMs,
  disabled = false,
  onApplyCapturePreset,
  onSaveAsPreset,
}) => {
  const [devicePresets, setDevicePresets] = useState<DevicePreset[]>(BUILTIN_DEVICE_PRESETS);
  const [capturePresets, setCapturePresets] = useState<CapturePreset[]>([]);
  const [selectedCapturePresetId, setSelectedCapturePresetId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch device and capture presets on mount
  useEffect(() => {
    fetch('/api/presets/devices')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DevicePreset[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setDevicePresets(data);
        }
      })
      .catch(() => {});

    fetch('/api/presets/capture')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CapturePreset[]) => {
        if (Array.isArray(data)) {
          setCapturePresets(data);
        }
      })
      .catch(() => {});
  }, []);

  // Handle device preset change
  const handleDevicePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setPreset(selectedId);

    if (selectedId === 'custom') {
      return;
    }

    const found = devicePresets.find((d) => d.id === selectedId || d.name === selectedId);
    if (found) {
      setWidth(found.viewport.width);
      setHeight(found.viewport.height);
      setDpr(found.deviceScaleFactor);
    }
  };

  // Handle capture preset selection & application
  const handleCapturePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedCapturePresetId(presetId);
    if (!presetId) return;

    const found = capturePresets.find((p) => p.id === presetId);
    if (!found) return;

    applyCapturePreset(found);
  };

  const applyCapturePreset = (presetToApply: CapturePreset) => {
    const cfg = presetToApply.config;

    if (cfg.captureType) setCaptureType(cfg.captureType);
    if (cfg.viewport) {
      setWidth(cfg.viewport.width);
      setHeight(cfg.viewport.height);
    }
    if (cfg.deviceScaleFactor) setDpr(cfg.deviceScaleFactor);

    if (cfg.devicePresetId) {
      setPreset(cfg.devicePresetId);
    } else {
      setPreset('custom');
    }

    if (cfg.screenshotOptions?.mode) setMode(cfg.screenshotOptions.mode);
    if (cfg.stabilizationOptions?.disableAnimations !== undefined) {
      setDisableAnimations(cfg.stabilizationOptions.disableAnimations);
    }
    if (cfg.stabilizationOptions?.additionalWaitMs !== undefined) {
      setAdditionalWaitMs(cfg.stabilizationOptions.additionalWaitMs);
    }
    const recDuration = cfg.recordingOptions?.durationMs ?? cfg.recordingDurationMs;
    if (recDuration) setRecordingDurationMs(recDuration);

    const convMp4 = cfg.recordingOptions?.convertToMp4 ?? cfg.convertToMp4;
    if (convMp4 !== undefined && setConvertToMp4) {
      setConvertToMp4(convMp4);
    }
    const mp4Qual = cfg.recordingOptions?.mp4Options?.quality ?? cfg.mp4Options?.quality;
    if (mp4Qual && setMp4Quality) {
      setMp4Quality(mp4Qual);
    }

    const advRec = cfg.recordingOptions?.advancedRecordingOptions ?? cfg.advancedRecordingOptions;
    if (advRec) {
      if (advRec.cursorEnabled !== undefined && setAdvancedCursorEnabled) {
        setAdvancedCursorEnabled(advRec.cursorEnabled);
      }
      if (advRec.clickIndicatorEnabled !== undefined && setAdvancedClickIndicatorEnabled) {
        setAdvancedClickIndicatorEnabled(advRec.clickIndicatorEnabled);
      }
      if (advRec.cursorStyle && setAdvancedCursorStyle) {
        setAdvancedCursorStyle(advRec.cursorStyle);
      }
    }

    if (cfg.timeoutOptions?.timeoutMs !== undefined) {
      setTimeoutMs(cfg.timeoutOptions.timeoutMs);
    }

    if (onApplyCapturePreset) {
      onApplyCapturePreset(presetToApply);
    }
  };

  const handleSavePresetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    setSaveError(null);

    const configToSave: UnifiedCaptureConfig = {
      url: url || '',
      captureType,
      viewport: { width: Number(width), height: Number(height) },
      deviceScaleFactor: Number(dpr),
      devicePresetId: preset !== 'custom' ? preset : undefined,
      screenshotOptions: {
        mode,
        fullPage: mode === 'fullPage',
      },
      recordingOptions: {
        durationMs: Number(recordingDurationMs),
        convertToMp4,
        mp4Options: {
          quality: mp4Quality,
        },
        advancedRecordingOptions: {
          cursorEnabled: advancedCursorEnabled,
          clickIndicatorEnabled: advancedClickIndicatorEnabled,
          cursorStyle: advancedCursorStyle,
        },
      },
      stabilizationOptions: {
        disableAnimations,
        additionalWaitMs: Number(additionalWaitMs),
      },
      timeoutOptions: {
        timeoutMs: Number(timeoutMs),
      },
    };

    if (onSaveAsPreset) {
      onSaveAsPreset(newPresetName.trim(), newPresetDesc.trim());
      setShowSaveModal(false);
      setNewPresetName('');
      setNewPresetDesc('');
      return;
    }

    try {
      const res = await fetch('/api/presets/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPresetName.trim(),
          description: newPresetDesc.trim(),
          devicePresetId: preset !== 'custom' ? preset : undefined,
          config: configToSave,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save custom preset');
      }

      const created: CapturePreset = await res.json();
      setCapturePresets((prev) => [...prev, created]);
      setSelectedCapturePresetId(created.id);
      setShowSaveModal(false);
      setNewPresetName('');
      setNewPresetDesc('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setSaveError(msg);
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

      {/* Preset Application Toolbar */}
      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex-1">
            <label htmlFor="capture-preset-select" className="block font-semibold text-blue-900 text-xs uppercase tracking-wider mb-1">
              Apply Capture Preset
            </label>
            <select
              id="capture-preset-select"
              data-testid="capture-preset-select"
              value={selectedCapturePresetId}
              onChange={handleCapturePresetChange}
              disabled={disabled}
              className="w-full p-2 border border-blue-300 rounded bg-white text-gray-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">-- Select a Capture Preset --</option>
              {capturePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isBuiltIn ? '(Built-in)' : '(Custom)'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              data-testid="save-as-preset-btn"
              onClick={() => setShowSaveModal(true)}
              disabled={disabled}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              Save Form as Preset
            </button>
          </div>
        </div>
      </div>

      {/* Save Preset Inline Modal */}
      {showSaveModal && (
        <form onSubmit={handleSavePresetSubmit} className="p-4 bg-white border-2 border-blue-500 rounded-lg shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h4 className="font-bold text-gray-900 text-xs uppercase">Save Current Options as Preset</h4>
            <button
              type="button"
              onClick={() => setShowSaveModal(false)}
              className="text-gray-400 hover:text-gray-600 font-bold text-xs"
            >
              ✕
            </button>
          </div>
          {saveError && <div className="p-2 bg-red-50 text-red-700 rounded text-xs">{saveError}</div>}
          <div>
            <label className="block text-xs font-semibold mb-1">Preset Name *</label>
            <input
              type="text"
              required
              data-testid="preset-name-input"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="e.g. My Custom Desktop Capture"
              className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Description (Optional)</label>
            <input
              type="text"
              value={newPresetDesc}
              onChange={(e) => setNewPresetDesc(e.target.value)}
              placeholder="e.g. Viewport capture with 5s recording"
              className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              data-testid="save-preset-confirm-btn"
              className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded text-xs hover:bg-blue-700"
            >
              Save Preset
            </button>
            <button
              type="button"
              onClick={() => setShowSaveModal(false)}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 font-semibold rounded text-xs hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Capture Type Selection & Device Preset */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="capture-type" className="block font-semibold mb-1">
            Capture Type
          </label>
          <select
            id="capture-type"
            data-testid="capture-type-select"
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

        {/* Device Presets */}
        <div>
          <label htmlFor="device-preset" className="block font-semibold mb-1">
            Device Preset
          </label>
          <select
            id="device-preset"
            data-testid="device-preset-select"
            value={preset}
            onChange={handleDevicePresetChange}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {devicePresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="custom">Custom Dimensions...</option>
          </select>
        </div>

        {/* Device Scale Factor (DPR) */}
        <div>
          <label htmlFor="device-scale-factor" className="block font-semibold mb-1">
            Device Scale Factor (DPR)
          </label>
          <select
            id="device-scale-factor"
            data-testid="device-scale-factor-select"
            value={dpr}
            onChange={(e) => {
              setDpr(Number(e.target.value));
            }}
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
            data-testid="viewport-width-input"
            type="number"
            min={100}
            max={7680}
            value={width}
            onChange={(e) => {
              setWidth(Number(e.target.value));
              setPreset('custom');
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
            data-testid="viewport-height-input"
            type="number"
            min={100}
            max={4320}
            value={height}
            onChange={(e) => {
              setHeight(Number(e.target.value));
              setPreset('custom');
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
                data-testid="screenshot-mode-select"
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
                data-testid="recording-duration-input"
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

            {/* Advanced Demo Visual Toggles */}
            <div className="pt-2 border-t border-purple-200/60 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  data-testid="cursor-enabled-checkbox"
                  checked={advancedCursorEnabled}
                  onChange={(e) => setAdvancedCursorEnabled && setAdvancedCursorEnabled(e.target.checked)}
                  disabled={disabled}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="font-medium text-xs text-purple-950">Cursor Visualization Overlay</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  data-testid="click-indicator-checkbox"
                  checked={advancedClickIndicatorEnabled}
                  onChange={(e) => setAdvancedClickIndicatorEnabled && setAdvancedClickIndicatorEnabled(e.target.checked)}
                  disabled={disabled}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="font-medium text-xs text-purple-950">Click Indicator Ripple Animations</span>
              </label>

              {advancedCursorEnabled && setAdvancedCursorStyle && (
                <div>
                  <label htmlFor="cursor-style-select" className="block text-[11px] font-semibold text-purple-900 mb-0.5">
                    Cursor Style
                  </label>
                  <select
                    id="cursor-style-select"
                    data-testid="cursor-style-select"
                    value={advancedCursorStyle}
                    onChange={(e) => setAdvancedCursorStyle(e.target.value as 'default' | 'dot' | 'pointer' | 'brand')}
                    disabled={disabled}
                    className="w-full p-1.5 border border-purple-300 rounded bg-white text-xs text-gray-800"
                  >
                    <option value="default">Default Blue Arrow</option>
                    <option value="dot">Highlight Dot Circle</option>
                    <option value="brand">Brand Red Pointer</option>
                  </select>
                </div>
              )}
            </div>

            {/* MP4 Conversion Toggle */}
            {setConvertToMp4 && (
              <div className="pt-2 border-t border-purple-200/60 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    data-testid="convert-to-mp4-checkbox"
                    checked={convertToMp4}
                    onChange={(e) => setConvertToMp4(e.target.checked)}
                    disabled={disabled}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="font-medium text-purple-950">Convert WebM to MP4 (via local FFmpeg)</span>
                </label>

                {convertToMp4 && setMp4Quality && (
                  <div>
                    <label htmlFor="mp4-quality-select" className="block text-xs font-semibold text-purple-900 mb-1">
                      MP4 Quality / Compression Strategy
                    </label>
                    <select
                      id="mp4-quality-select"
                      data-testid="mp4-quality-select"
                      value={mp4Quality}
                      onChange={(e) => setMp4Quality(e.target.value as Mp4QualityPreset)}
                      disabled={disabled}
                      className="w-full p-1.5 border border-purple-300 rounded bg-white text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="high">High Quality (CRF 18)</option>
                      <option value="medium">Balanced / Medium (CRF 23)</option>
                      <option value="low">Compact / Small File (CRF 28)</option>
                    </select>
                  </div>
                )}
              </div>
            )}
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
