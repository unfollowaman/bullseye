'use client';

import React, { useState, useEffect } from 'react';
import { CapturePreset } from '@/presets/types';

interface PresetManagerProps {
  onSelectPreset?: (preset: CapturePreset) => void;
  onClose?: () => void;
}

export const PresetManager: React.FC<PresetManagerProps> = ({ onSelectPreset, onClose }) => {
  const [presets, setPresets] = useState<CapturePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit / Duplicate Modal State
  const [editingPreset, setEditingPreset] = useState<CapturePreset | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const fetchPresets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/presets/capture');
      if (!res.ok) throw new Error('Failed to load presets');
      const data: CapturePreset[] = await res.json();
      setPresets(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching presets';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const handleDuplicate = async (preset: CapturePreset) => {
    try {
      setError(null);
      const res = await fetch(`/api/presets/capture/${preset.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${preset.name} (Copy)` }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to duplicate preset');
      }
      setSuccessMsg(`Duplicated preset '${preset.name}'`);
      await fetchPresets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Duplication failed';
      setError(msg);
    }
  };

  const handleDelete = async (preset: CapturePreset) => {
    if (!confirm(`Are you sure you want to delete preset '${preset.name}'?`)) return;
    try {
      setError(null);
      const res = await fetch(`/api/presets/capture/${preset.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete preset');
      }
      setSuccessMsg(`Deleted preset '${preset.name}'`);
      await fetchPresets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setError(msg);
    }
  };

  const startEditing = (preset: CapturePreset) => {
    setEditingPreset(preset);
    setEditName(preset.name);
    setEditDescription(preset.description || '');
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreset) return;
    try {
      setError(null);
      const res = await fetch(`/api/presets/capture/${editingPreset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update preset');
      }

      setEditingPreset(null);
      setSuccessMsg(`Updated preset '${editName}'`);
      await fetchPresets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      setError(msg);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 text-sm text-gray-800">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Capture Preset Manager</h3>
          <p className="text-xs text-gray-500">Manage custom & built-in capture configurations</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1"
          >
            ✕
          </button>
        )}
      </div>

      {error && <div className="p-2.5 bg-red-50 text-red-700 rounded text-xs border border-red-200">{error}</div>}
      {successMsg && <div className="p-2.5 bg-green-50 text-green-700 rounded text-xs border border-green-200">{successMsg}</div>}

      {/* Editing Drawer / Modal */}
      {editingPreset && (
        <form onSubmit={saveEdit} className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-3">
          <h4 className="font-semibold text-blue-900 text-xs uppercase tracking-wide">Edit Custom Preset</h4>
          <div>
            <label className="block text-xs font-semibold mb-1">Preset Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-xs bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Description</label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-xs bg-white"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded text-xs hover:bg-blue-700"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditingPreset(null)}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 font-semibold rounded text-xs hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-6 text-gray-500 text-xs">Loading presets...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {presets.map((p) => {
            const vp = p.config.viewport || { width: 1280, height: 720 };
            const dpr = p.config.deviceScaleFactor || 1;
            const type = p.config.captureType || 'screenshot';
            const duration = p.config.recordingOptions?.durationMs || p.config.recordingDurationMs;

            return (
              <div
                key={p.id}
                data-testid={`preset-card-${p.id}`}
                className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors bg-gray-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 text-xs">{p.name}</span>
                    {p.isBuiltIn ? (
                      <span className="text-[10px] bg-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded">
                        Built-in
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  {p.description && <p className="text-[11px] text-gray-600 mb-2">{p.description}</p>}

                  <div className="text-[11px] text-gray-500 space-y-0.5 mb-3 bg-white p-2 rounded border border-gray-100">
                    <div>
                      <span className="font-medium text-gray-700">Type:</span> {type}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Viewport:</span> {vp.width}×{vp.height} (@{dpr}x DPR)
                    </div>
                    {type !== 'screenshot' && duration && (
                      <div>
                        <span className="font-medium text-gray-700">Duration:</span> {(duration / 1000).toFixed(1)}s
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 text-xs">
                  {onSelectPreset && (
                    <button
                      type="button"
                      onClick={() => onSelectPreset(p)}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 text-[11px]"
                    >
                      Apply
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDuplicate(p)}
                    className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-medium text-[11px]"
                  >
                    Duplicate
                  </button>
                  {!p.isBuiltIn && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditing(p)}
                        className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-medium text-[11px]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded font-medium text-[11px]"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
