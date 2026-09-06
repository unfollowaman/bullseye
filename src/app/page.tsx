'use client';

import { useState } from 'react';
import { CaptureResult } from '@/capture/types';

export default function HomePage() {
  const [url, setUrl] = useState('http://localhost:3000');
  const [captureType, setCaptureType] = useState<'screenshot' | 'recording'>('screenshot');
  const [mode, setMode] = useState<'viewport' | 'fullPage'>('viewport');
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [dpr, setDpr] = useState(1);
  const [recordingDurationMs, setRecordingDurationMs] = useState(3000);
  const [disableAnimations, setDisableAnimations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        type: captureType,
        url,
        viewport: { width: Number(width), height: Number(height) },
        deviceScaleFactor: Number(dpr),
        ...(captureType === 'screenshot'
          ? { mode, disableAnimations }
          : { recordingDurationMs: Number(recordingDurationMs) }),
      };

      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to capture ${captureType}`);
      } else {
        setResult(data);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error communicating with capture API';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeWebUrl = (fullPath?: string) => {
    if (!fullPath) return null;
    const publicIndex = fullPath.indexOf('/public/');
    if (publicIndex !== -1) {
      return fullPath.substring(publicIndex + 7);
    }
    return null;
  };

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', fontFamily: 'system-ui, sans-serif', padding: '0 1rem' }}>
      <h1>Bullseye Screen Recording & Screenshot Engine</h1>
      <p style={{ color: '#666' }}>Phase 3: High-quality website screenshots and WebM screen recordings.</p>

      <section style={{ marginTop: '1.5rem', border: '1px solid #e5e7eb', padding: '1.5rem', borderRadius: '8px', background: '#f9fafb' }}>
        <h2>Capture Options</h2>
        <form onSubmit={handleCapture} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Capture Type:</label>
            <select
              value={captureType}
              onChange={(e) => setCaptureType(e.target.value as 'screenshot' | 'recording')}
              style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="screenshot">Screenshot (PNG)</option>
              <option value="recording">Screen Recording (WebM)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Target URL:</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {captureType === 'screenshot' && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Mode:</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'viewport' | 'fullPage')}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="viewport">Viewport</option>
                  <option value="fullPage">Full Page</option>
                </select>
              </div>
            )}

            {captureType === 'recording' && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Duration (ms):</label>
                <input
                  type="number"
                  value={recordingDurationMs}
                  onChange={(e) => setRecordingDurationMs(Number(e.target.value))}
                  style={{ width: '120px', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Width (px):</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                style={{ width: '100px', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Height (px):</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                style={{ width: '100px', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>DPR:</label>
              <select
                value={dpr}
                onChange={(e) => setDpr(Number(e.target.value))}
                style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
              </select>
            </div>
          </div>

          {captureType === 'screenshot' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={disableAnimations}
                  onChange={(e) => setDisableAnimations(e.target.checked)}
                />
                <span>Disable Animations for deterministic capture</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: loading ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {loading
              ? captureType === 'screenshot'
                ? 'Capturing Screenshot...'
                : 'Recording Screen...'
              : captureType === 'screenshot'
              ? 'Capture Screenshot'
              : 'Start Recording'}
          </button>
        </form>
      </section>

      {error && (
        <section style={{ marginTop: '1.5rem', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '8px', background: '#fef2f2', color: '#991b1b' }}>
          <h3>Capture Error</h3>
          <p>{error}</p>
        </section>
      )}

      {result && result.metadata && (
        <section style={{ marginTop: '1.5rem', border: '1px solid #e5e7eb', padding: '1.5rem', borderRadius: '8px' }}>
          <h2>Capture Result ({result.type})</h2>
          <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '4px', fontSize: '0.875rem' }}>
            <p><strong>ID:</strong> {result.metadata.id}</p>
            <p><strong>URL:</strong> {result.metadata.url}</p>
            <p><strong>Viewport:</strong> {result.metadata.viewport.width}x{result.metadata.viewport.height}</p>
            <p><strong>DPR:</strong> {result.metadata.deviceScaleFactor}x</p>
            {'recordingDurationMs' in result.metadata && (
              <p><strong>Configured Duration:</strong> {result.metadata.recordingDurationMs}ms</p>
            )}
            <p><strong>Total Duration:</strong> {result.metadata.durationMs}ms</p>
            <p><strong>File Size:</strong> {result.metadata.fileSizeBytes} bytes</p>
            <p><strong>Output Path:</strong> {result.metadata.outputPath}</p>
          </div>

          {getRelativeWebUrl(result.metadata.outputPath) && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Media Preview</h3>
              {result.type === 'recording' ? (
                <video
                  controls
                  src={getRelativeWebUrl(result.metadata.outputPath)!}
                  style={{ maxWidth: '100%', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getRelativeWebUrl(result.metadata.outputPath)!}
                  alt="Screenshot capture preview"
                  style={{ maxWidth: '100%', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
