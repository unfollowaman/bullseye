'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from 'react';
import { CaptureHistoryRecord } from '@/history/types';
import { MockupBackground, MockupConfig, MockupOutputFormat, MockupResult, MockupType } from '@/mockup/types';

interface MockupGeneratorProps {
  initialSourcePath?: string;
  initialCaptureId?: string;
}

export const MockupGenerator: React.FC<MockupGeneratorProps> = ({
  initialSourcePath,
  initialCaptureId,
}) => {
  const [historyItems, setHistoryItems] = useState<CaptureHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [selectedSourcePath, setSelectedSourcePath] = useState<string>(initialSourcePath || '');
  const [selectedCaptureId, setSelectedCaptureId] = useState<string | undefined>(initialCaptureId);

  const [mockupType, setMockupType] = useState<MockupType>('browser');
  const [deviceColor, setDeviceColor] = useState<string>('dark');
  const [bgType, setBgType] = useState<'gradient' | 'solid' | 'transparent'>('gradient');
  const [startColor, setStartColor] = useState<string>('#4f46e5');
  const [stopColor, setStopColor] = useState<string>('#06b6d4');
  const [solidColor, setSolidColor] = useState<string>('#0f172a');
  const [browserTitle, setBrowserTitle] = useState<string>('Bullseye Mockup');
  const [browserUrl, setBrowserUrl] = useState<string>('https://example.com');
  const [outputFormat, setOutputFormat] = useState<MockupOutputFormat>('png');

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMockup, setResultMockup] = useState<MockupResult | null>(null);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/history?limit=30');
      if (res.ok) {
        const data = await res.json();
        const historyList: CaptureHistoryRecord[] = Array.isArray(data.history)
          ? data.history
          : Array.isArray(data)
          ? data
          : [];

        const withScreenshots = historyList.filter(
          (item) => item.outputs && item.outputs.screenshot?.path
        );
        setHistoryItems(withScreenshots);

        if (withScreenshots.length > 0 && !selectedSourcePath) {
          setSelectedSourcePath(withScreenshots[0].outputs.screenshot!.path);
          setSelectedCaptureId(withScreenshots[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load history items:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSelectHistoryItem = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const histId = e.target.value;
    const item = historyItems.find((h) => h.id === histId);
    if (item && item.outputs.screenshot?.path) {
      setSelectedSourcePath(item.outputs.screenshot.path);
      setSelectedCaptureId(item.id);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourcePath) {
      setError('Please select a valid screenshot source.');
      return;
    }

    setGenerating(true);
    setError(null);
    setResultMockup(null);

    let background: MockupBackground = { type: 'transparent' };
    if (bgType === 'solid') {
      background = { type: 'solid', color: solidColor };
    } else if (bgType === 'gradient') {
      background = { type: 'gradient', startColor, stopColor, angle: 135 };
    }

    const config: MockupConfig = {
      type: mockupType,
      sourceAssetPath: selectedSourcePath,
      sourceCaptureId: selectedCaptureId,
      outputFormat,
      background,
      visualOptions: {
        deviceColor,
        browserTitle,
        browserUrl,
        shadow: true,
      },
    };

    try {
      const res = await fetch('/api/mockups/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.details?.join(', ') || 'Failed to generate mockup');
      }

      const data: MockupResult = await res.json();
      setResultMockup(data);
    } catch (err: unknown) {
      setError((err as Error).message || 'An error occurred while generating mockup.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div data-testid="mockup-generator-container" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Mockup Studio</h2>
        <p className="text-xs text-gray-500 mt-1">
          Turn your captured website screenshots into polished presentation mockups locally.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            1. Select Source Screenshot
          </label>

          {historyItems.length > 0 && (
            <select
              data-testid="mockup-source-select"
              value={selectedCaptureId || ''}
              onChange={handleSelectHistoryItem}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 mb-2"
            >
              {historyItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.url} ({item.timestamp.split('T')[0]}) - {item.outputs.screenshot?.path}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            data-testid="mockup-source-input"
            value={selectedSourcePath}
            onChange={(e) => {
              setSelectedSourcePath(e.target.value);
              setSelectedCaptureId(undefined);
            }}
            placeholder="/captures/screenshot-xyz.png"
            className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-900 font-mono"
          />
          {loadingHistory && <p className="text-xs text-gray-400">Loading history captures...</p>}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            2. Choose Mockup Device Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'browser', label: '🌐 Browser Window' },
              { id: 'laptop', label: '💻 Laptop' },
              { id: 'phone', label: '📱 Mobile Phone' },
              { id: 'presentation', label: '🎴 Card Slide' },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                data-testid={`mockup-type-btn-${type.id}`}
                onClick={() => setMockupType(type.id as MockupType)}
                className={`p-3 rounded-lg border text-xs font-semibold transition-all text-center ${
                  mockupType === type.id
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Device Theme</label>
            <select
              value={deviceColor}
              onChange={(e) => setDeviceColor(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded p-2 bg-white text-gray-800"
            >
              <option value="dark">Dark / Midnight</option>
              <option value="light">Light / Silver</option>
              <option value="space-gray">Space Gray</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Background Fill</label>
            <select
              value={bgType}
              onChange={(e) => setBgType(e.target.value as 'gradient' | 'solid' | 'transparent')}
              className="w-full text-xs border border-gray-300 rounded p-2 bg-white text-gray-800"
            >
              <option value="gradient">Linear Gradient</option>
              <option value="solid">Solid Color</option>
              <option value="transparent">Transparent</option>
            </select>
          </div>

          {bgType === 'gradient' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Color</label>
                <input
                  type="text"
                  value={startColor}
                  onChange={(e) => setStartColor(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-2 bg-white text-gray-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Stop Color</label>
                <input
                  type="text"
                  value={stopColor}
                  onChange={(e) => setStopColor(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-2 bg-white text-gray-800 font-mono"
                />
              </div>
            </>
          )}

          {bgType === 'solid' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Solid Color</label>
              <input
                type="text"
                value={solidColor}
                onChange={(e) => setSolidColor(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded p-2 bg-white text-gray-800 font-mono"
              />
            </div>
          )}

          {mockupType === 'browser' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Window Title</label>
                <input
                  type="text"
                  value={browserTitle}
                  onChange={(e) => setBrowserTitle(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-2 bg-white text-gray-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address Bar URL</label>
                <input
                  type="text"
                  value={browserUrl}
                  onChange={(e) => setBrowserUrl(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-2 bg-white text-gray-800"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Export Format</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as MockupOutputFormat)}
              className="w-full text-xs border border-gray-300 rounded p-2 bg-white text-gray-800"
            >
              <option value="png">PNG (High Quality)</option>
              <option value="jpeg">JPEG (Compressed)</option>
              <option value="webp">WebP (Modern)</option>
            </select>
          </div>
        </div>

        {error && (
          <div data-testid="mockup-error-banner" className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          data-testid="generate-mockup-btn"
          disabled={generating || !selectedSourcePath}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <span className="animate-spin text-sm">🌀</span> Rendering Mockup...
            </>
          ) : (
            '✨ Generate Mockup'
          )}
        </button>
      </form>

      {resultMockup && (
        <div data-testid="mockup-result-container" className="pt-6 border-t border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900">Generated Mockup Asset</h3>
            <span className="text-xs text-gray-500 font-mono">
              {resultMockup.dimensions.width}x{resultMockup.dimensions.height}px • {(resultMockup.generatedAsset.sizeBytes / 1024).toFixed(1)} KB
            </span>
          </div>

          <div className="border border-gray-200 rounded-lg p-2 bg-gray-900 flex justify-center items-center overflow-hidden max-h-[500px]">
            <img
              data-testid="mockup-preview-image"
              src={resultMockup.generatedAsset.webPath}
              alt="Generated Mockup"
              className="max-h-[480px] w-auto object-contain rounded"
            />
          </div>

          <div className="flex items-center gap-3">
            <a
              data-testid="download-mockup-btn"
              href={resultMockup.generatedAsset.webPath}
              download={resultMockup.generatedAsset.filename}
              className="py-2 px-4 bg-gray-900 hover:bg-black text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
            >
              ⬇️ Download Asset
            </a>

            <a
              href={resultMockup.generatedAsset.webPath}
              target="_blank"
              rel="noreferrer"
              className="py-2 px-4 border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold text-xs rounded-lg transition-colors"
            >
              🔗 Open Full Image
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
