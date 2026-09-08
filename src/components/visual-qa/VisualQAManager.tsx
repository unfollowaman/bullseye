'use client';

import React, { useEffect, useState } from 'react';
import { CaptureHistoryRecord } from '@/history/types';
import {
  VisualQAConfig,
  VisualQAResult,
} from '@/visual-qa/types';

export const VisualQAManager: React.FC = () => {
  const [historyRecords, setHistoryRecords] = useState<CaptureHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form Inputs
  const [baselineAssetPath, setBaselineAssetPath] = useState('');
  const [currentAssetPath, setCurrentAssetPath] = useState('');
  const [baselineCaptureId, setBaselineCaptureId] = useState<string | undefined>();
  const [currentCaptureId, setCurrentCaptureId] = useState<string | undefined>();

  // Config options
  const [pixelTolerance, setPixelTolerance] = useState(10);
  const [thresholdPercent, setThresholdPercent] = useState(0.0);
  const [diffColor, setDiffColor] = useState('#ff00ff');
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [generateDiff, setGenerateDiff] = useState(true);
  const [generateOverlay, setGenerateOverlay] = useState(true);

  // Execution state
  const [comparing, setComparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<VisualQAResult | null>(null);

  // Previous comparisons list
  const [pastComparisons, setPastComparisons] = useState<VisualQAResult[]>([]);
  const [loadingComparisons, setLoadingComparisons] = useState(false);

  // Active preview tab for current result
  const [activePreviewTab, setActivePreviewTab] = useState<'baseline' | 'current' | 'diff' | 'overlay'>('diff');

  // Load history records for dropdown picker
  const fetchCaptureHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/history?limit=50');
      if (res.ok) {
        const data = await res.json();
        const records = Array.isArray(data) ? data : data.records || [];
        // Only keep records that have screenshot output
        const screenshotRecords = records.filter(
          (r: CaptureHistoryRecord) => r.outputs?.screenshot?.path
        );
        setHistoryRecords(screenshotRecords);
      }
    } catch {
      // Ignore background error
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load past Visual QA comparisons
  const fetchPastComparisons = async () => {
    setLoadingComparisons(true);
    try {
      const res = await fetch('/api/visual-qa?limit=20');
      if (res.ok) {
        const data = await res.json();
        setPastComparisons(Array.isArray(data) ? data : []);
      }
    } catch {
      // Ignore background error
    } finally {
      setLoadingComparisons(false);
    }
  };

  useEffect(() => {
    fetchCaptureHistory();
    fetchPastComparisons();
  }, []);

  const handleSelectBaseline = (id: string) => {
    setBaselineCaptureId(id);
    const rec = historyRecords.find((r) => r.id === id);
    if (rec?.outputs?.screenshot?.path) {
      setBaselineAssetPath(rec.outputs.screenshot.path);
    }
  };

  const handleSelectCurrent = (id: string) => {
    setCurrentCaptureId(id);
    const rec = historyRecords.find((r) => r.id === id);
    if (rec?.outputs?.screenshot?.path) {
      setCurrentAssetPath(rec.outputs.screenshot.path);
    }
  };

  const handleRunComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baselineAssetPath.trim() || !currentAssetPath.trim()) {
      setErrorMsg('Please select or specify both Baseline and Current screenshot paths.');
      return;
    }

    setErrorMsg(null);
    setComparing(true);

    const config: VisualQAConfig = {
      baselineAssetPath: baselineAssetPath.trim(),
      currentAssetPath: currentAssetPath.trim(),
      baselineCaptureId,
      currentCaptureId,
      pixelTolerance,
      thresholdPercent,
      diffColor,
      overlayOpacity,
      outputFormat,
      generateDiff,
      generateOverlay,
    };

    try {
      const res = await fetch('/api/visual-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data: VisualQAResult = await res.json();
      setCurrentResult(data);

      if (data.status === 'error' && data.error) {
        setErrorMsg(data.error);
      } else {
        if (data.diffAsset) {
          setActivePreviewTab('diff');
        } else if (data.overlayAsset) {
          setActivePreviewTab('overlay');
        } else {
          setActivePreviewTab('baseline');
        }
      }

      // Refresh history list
      fetchPastComparisons();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to run comparison.');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="visual-qa-container">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-bold text-gray-900">Visual QA & Screenshot Comparison</h2>
        <p className="text-sm text-gray-500 mt-1">
          Compare screenshots pixel-by-pixel, generate difference maps and blended overlays, and verify visual regressions.
        </p>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <form onSubmit={handleRunComparison} className="space-y-6">
          {/* Screenshot Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Baseline Screenshot */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-semibold text-gray-800">
                1. Baseline Screenshot
              </label>

              {/* Select from Capture History */}
              <div>
                <span className="text-xs text-gray-500 block mb-1">
                  Select from Capture History:
                </span>
                <select
                  data-testid="vqa-baseline-select"
                  value={baselineCaptureId || ''}
                  onChange={(e) => handleSelectBaseline(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-2 bg-white"
                  disabled={loadingHistory}
                >
                  <option value="">-- Choose baseline capture --</option>
                  {historyRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.url} ({r.viewport.width}x{r.viewport.height}) - {new Date(r.timestamp).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Path Input */}
              <div>
                <span className="text-xs text-gray-500 block mb-1">
                  Or Asset Web/File Path:
                </span>
                <input
                  type="text"
                  data-testid="vqa-baseline-input"
                  placeholder="/captures/screenshot-123.png"
                  value={baselineAssetPath}
                  onChange={(e) => setBaselineAssetPath(e.target.value)}
                  className="w-full text-xs font-mono border border-gray-300 rounded p-2 bg-white"
                />
              </div>
            </div>

            {/* Current Screenshot */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-semibold text-gray-800">
                2. Current Screenshot
              </label>

              {/* Select from Capture History */}
              <div>
                <span className="text-xs text-gray-500 block mb-1">
                  Select from Capture History:
                </span>
                <select
                  data-testid="vqa-current-select"
                  value={currentCaptureId || ''}
                  onChange={(e) => handleSelectCurrent(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-2 bg-white"
                  disabled={loadingHistory}
                >
                  <option value="">-- Choose current capture --</option>
                  {historyRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.url} ({r.viewport.width}x{r.viewport.height}) - {new Date(r.timestamp).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Path Input */}
              <div>
                <span className="text-xs text-gray-500 block mb-1">
                  Or Asset Web/File Path:
                </span>
                <input
                  type="text"
                  data-testid="vqa-current-input"
                  placeholder="/captures/screenshot-456.png"
                  value={currentAssetPath}
                  onChange={(e) => setCurrentAssetPath(e.target.value)}
                  className="w-full text-xs font-mono border border-gray-300 rounded p-2 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Comparison Options
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Pixel Tolerance */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Pixel Tolerance (RGB): {pixelTolerance}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={pixelTolerance}
                  onChange={(e) => setPixelTolerance(parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  Allows minor anti-aliasing / rendering noise.
                </span>
              </div>

              {/* Pass Threshold % */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  PASS Threshold (%): {thresholdPercent}%
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={thresholdPercent}
                  onChange={(e) => setThresholdPercent(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded p-1.5 bg-white"
                />
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  Max changed pixel % to pass.
                </span>
              </div>

              {/* Diff Color */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Diff Highlight Color:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={diffColor}
                    onChange={(e) => setDiffColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={diffColor}
                    onChange={(e) => setDiffColor(e.target.value)}
                    className="w-24 text-xs font-mono border border-gray-300 rounded p-1 bg-white"
                  />
                </div>
              </div>

              {/* Overlay Opacity */}
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Overlay Blend Ratio: {Math.round(overlayOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Checkboxes & Format */}
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-gray-200 text-xs">
              <label className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateDiff}
                  onChange={(e) => setGenerateDiff(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Generate Diff Image
              </label>

              <label className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateOverlay}
                  onChange={(e) => setGenerateOverlay(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Generate Overlay Image
              </label>

              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Format:</span>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as 'png' | 'jpeg' | 'webp')}
                  className="border border-gray-300 rounded p-1 bg-white"
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button & Error display */}
          <div className="flex items-center justify-between">
            {errorMsg ? (
              <p data-testid="vqa-error-msg" className="text-xs text-red-600 font-medium">
                ⚠️ {errorMsg}
              </p>
            ) : (
              <span />
            )}

            <button
              type="submit"
              data-testid="vqa-submit-btn"
              disabled={comparing}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {comparing ? 'Comparing Images...' : 'Run Visual QA Comparison'}
            </button>
          </div>
        </form>
      </div>

      {/* Comparison Results Section */}
      {currentResult && (
        <div
          data-testid="vqa-result-card"
          className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6"
        >
          {/* Result Header Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-800 text-base">Outcome:</span>
              {currentResult.outcome === 'pass' && (
                <span
                  data-testid="vqa-outcome-badge"
                  className="bg-green-100 text-green-800 border border-green-300 font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1.5"
                >
                  ✓ PASS (Match)
                </span>
              )}
              {currentResult.outcome === 'fail' && (
                <span
                  data-testid="vqa-outcome-badge"
                  className="bg-red-100 text-red-800 border border-red-300 font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1.5"
                >
                  ✕ FAIL (Regression Detected)
                </span>
              )}
              {currentResult.outcome === 'error' && (
                <span
                  data-testid="vqa-outcome-badge"
                  className="bg-yellow-100 text-yellow-800 border border-yellow-300 font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1.5"
                >
                  ⚠️ ERROR ({currentResult.error || 'Comparison Failed'})
                </span>
              )}
            </div>

            <div className="text-xs text-gray-500 font-mono">
              ID: {currentResult.id} | Time: {currentResult.durationMs}ms
            </div>
          </div>

          {/* Metrics Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs">
            <div>
              <span className="text-gray-500 block">Changed Pixels</span>
              <strong className="text-gray-900 font-mono text-sm" data-testid="vqa-metric-changed-pixels">
                {currentResult.metrics.changedPixels.toLocaleString()} / {currentResult.metrics.totalPixels.toLocaleString()}
              </strong>
            </div>

            <div>
              <span className="text-gray-500 block">Changed Percentage</span>
              <strong className="text-gray-900 font-mono text-sm" data-testid="vqa-metric-changed-percent">
                {currentResult.metrics.changedPercentage.toFixed(4)}%
              </strong>
            </div>

            <div>
              <span className="text-gray-500 block">Baseline Dimensions</span>
              <strong className="text-gray-900 font-mono text-sm">
                {currentResult.baselineDimensions
                  ? `${currentResult.baselineDimensions.width} × ${currentResult.baselineDimensions.height}`
                  : 'N/A'}
              </strong>
            </div>

            <div>
              <span className="text-gray-500 block">Current Dimensions</span>
              <strong className="text-gray-900 font-mono text-sm">
                {currentResult.currentDimensions
                  ? `${currentResult.currentDimensions.width} × ${currentResult.currentDimensions.height}`
                  : 'N/A'}
              </strong>
            </div>
          </div>

          {/* Warnings */}
          {currentResult.warnings && currentResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-xs">
              <strong>Warnings:</strong>
              <ul className="list-disc list-inside mt-1">
                {currentResult.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Interactive Image Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActivePreviewTab('diff')}
                disabled={!currentResult.diffAsset}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activePreviewTab === 'diff'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40'
                }`}
              >
                Visual Diff Map
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('overlay')}
                disabled={!currentResult.overlayAsset}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activePreviewTab === 'overlay'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40'
                }`}
              >
                Blended Overlay
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('baseline')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activePreviewTab === 'baseline'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Baseline
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('current')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  activePreviewTab === 'current'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Current
              </button>
            </div>

            {/* Preview Box */}
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center min-h-[250px]">
              {activePreviewTab === 'diff' && currentResult.diffAsset && (
                <div className="space-y-2 text-center" data-testid="vqa-diff-preview">
                  <img
                    src={currentResult.diffAsset.webPath}
                    alt="Visual Diff"
                    className="max-h-[500px] object-contain border border-gray-300 rounded shadow-sm bg-white"
                  />
                  <div className="text-xs text-gray-500 font-mono">
                    Diff Image Path:{' '}
                    <a
                      href={currentResult.diffAsset.webPath}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      {currentResult.diffAsset.webPath}
                    </a>
                  </div>
                </div>
              )}

              {activePreviewTab === 'overlay' && currentResult.overlayAsset && (
                <div className="space-y-2 text-center" data-testid="vqa-overlay-preview">
                  <img
                    src={currentResult.overlayAsset.webPath}
                    alt="Overlay Blend"
                    className="max-h-[500px] object-contain border border-gray-300 rounded shadow-sm bg-white"
                  />
                  <div className="text-xs text-gray-500 font-mono">
                    Overlay Path:{' '}
                    <a
                      href={currentResult.overlayAsset.webPath}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      {currentResult.overlayAsset.webPath}
                    </a>
                  </div>
                </div>
              )}

              {activePreviewTab === 'baseline' && (
                <div className="space-y-2 text-center" data-testid="vqa-baseline-preview">
                  <img
                    src={currentResult.baselineAssetPath}
                    alt="Baseline"
                    className="max-h-[500px] object-contain border border-gray-300 rounded shadow-sm bg-white"
                  />
                  <div className="text-xs text-gray-500 font-mono">
                    Baseline Path: {currentResult.baselineAssetPath}
                  </div>
                </div>
              )}

              {activePreviewTab === 'current' && (
                <div className="space-y-2 text-center" data-testid="vqa-current-preview">
                  <img
                    src={currentResult.currentAssetPath}
                    alt="Current"
                    className="max-h-[500px] object-contain border border-gray-300 rounded shadow-sm bg-white"
                  />
                  <div className="text-xs text-gray-500 font-mono">
                    Current Path: {currentResult.currentAssetPath}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Past Comparisons Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800">Past Visual QA Comparisons</h3>

        {loadingComparisons ? (
          <p className="text-xs text-gray-500">Loading history...</p>
        ) : pastComparisons.length === 0 ? (
          <p className="text-xs text-gray-500">No previous comparisons recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-600 border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                  <th className="p-2">Date/Time</th>
                  <th className="p-2">Outcome</th>
                  <th className="p-2">Changed %</th>
                  <th className="p-2">Tolerance</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pastComparisons.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-2 font-mono">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2">
                      {item.outcome === 'pass' && (
                        <span className="text-green-700 font-bold">PASS</span>
                      )}
                      {item.outcome === 'fail' && (
                        <span className="text-red-700 font-bold">FAIL</span>
                      )}
                      {item.outcome === 'error' && (
                        <span className="text-yellow-700 font-bold">ERROR</span>
                      )}
                    </td>
                    <td className="p-2 font-mono">
                      {item.metrics.changedPercentage.toFixed(4)}%
                    </td>
                    <td className="p-2 font-mono">{item.config.pixelTolerance}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => setCurrentResult(item)}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
