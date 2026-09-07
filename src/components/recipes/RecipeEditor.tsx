'use client';

import React, { useState } from 'react';
import { Recipe, CreateRecipeInput } from '@/recipes/types';
import { UnifiedCaptureType, ScreenshotMode, CaptureAction } from '@/capture/types';
import { ActionEditor } from './ActionEditor';

interface RecipeEditorProps {
  recipe?: Recipe | null;
  onSave: (data: CreateRecipeInput) => Promise<void>;
  onCancel: () => void;
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({
  recipe,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(recipe?.name ?? '');
  const [description, setDescription] = useState(recipe?.description ?? '');
  const [url, setUrl] = useState(recipe?.config.url ?? 'http://localhost:3000');
  const [captureType, setCaptureType] = useState<UnifiedCaptureType>(
    recipe?.config.captureType ?? recipe?.config.type ?? 'screenshot'
  );

  // Viewport & DPR
  const [width, setWidth] = useState(recipe?.config.viewport?.width ?? 1280);
  const [height, setHeight] = useState(recipe?.config.viewport?.height ?? 720);
  const [dpr, setDpr] = useState(recipe?.config.deviceScaleFactor ?? 1);

  // Options
  const [screenshotMode, setScreenshotMode] = useState<ScreenshotMode>(
    recipe?.config.screenshotOptions?.mode ?? recipe?.config.mode ?? 'viewport'
  );
  const [recordingDurationMs, setRecordingDurationMs] = useState(
    recipe?.config.recordingOptions?.durationMs ?? recipe?.config.recordingDurationMs ?? 5000
  );
  const [disableAnimations, setDisableAnimations] = useState(
    recipe?.config.stabilizationOptions?.disableAnimations ?? recipe?.config.disableAnimations ?? false
  );
  const [additionalWaitMs, setAdditionalWaitMs] = useState(
    recipe?.config.stabilizationOptions?.additionalWaitMs ?? recipe?.config.additionalWaitMs ?? 0
  );

  // Actions
  const [actions, setActions] = useState<CaptureAction[]>(
    recipe?.actions ?? recipe?.config.actions ?? []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Recipe name is required');
      return;
    }
    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: CreateRecipeInput = {
        name,
        description,
        config: {
          url,
          captureType,
          viewport: { width: Number(width), height: Number(height) },
          deviceScaleFactor: Number(dpr),
          screenshotOptions: { mode: screenshotMode },
          recordingOptions: { durationMs: Number(recordingDurationMs) },
          stabilizationOptions: {
            disableAnimations,
            additionalWaitMs: Number(additionalWaitMs),
          },
          actions,
        },
        actions,
      };

      await onSave(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      data-testid="recipe-editor-form"
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-lg p-6 space-y-6 shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {recipe ? 'Edit Recipe' : 'Create New Recipe'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div data-testid="recipe-editor-error" className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded">
          {error}
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Recipe Name *
          </label>
          <input
            type="text"
            data-testid="recipe-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Horizon Homepage Demo"
            className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Target URL *
          </label>
          <input
            type="text"
            data-testid="recipe-url-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Description (Optional)
          </label>
          <input
            type="text"
            data-testid="recipe-description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Workflow description..."
            className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Capture Configurations */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-4">
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
          Capture Configuration
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-medium text-gray-700 mb-1">Capture Type</label>
            <select
              data-testid="recipe-type-select"
              value={captureType}
              onChange={(e) => setCaptureType(e.target.value as UnifiedCaptureType)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white"
            >
              <option value="screenshot">Screenshot</option>
              <option value="recording">Recording</option>
              <option value="both">Both (Combined)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Viewport Dimensions</label>
            <div className="flex gap-2">
              <input
                type="number"
                data-testid="recipe-viewport-width"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value, 10) || 1280)}
                placeholder="1280"
                className="w-1/2 border border-gray-300 rounded px-2 py-1.5 bg-white"
              />
              <input
                type="number"
                data-testid="recipe-viewport-height"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value, 10) || 720)}
                placeholder="720"
                className="w-1/2 border border-gray-300 rounded px-2 py-1.5 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Device Scale Factor (DPR)</label>
            <input
              type="number"
              step="0.5"
              data-testid="recipe-dpr-input"
              value={dpr}
              onChange={(e) => setDpr(parseFloat(e.target.value) || 1)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white"
            />
          </div>

          {(captureType === 'screenshot' || captureType === 'both') && (
            <div>
              <label className="block font-medium text-gray-700 mb-1">Screenshot Mode</label>
              <select
                data-testid="recipe-screenshot-mode"
                value={screenshotMode}
                onChange={(e) => setScreenshotMode(e.target.value as ScreenshotMode)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white"
              >
                <option value="viewport">Viewport</option>
                <option value="fullPage">Full Page</option>
              </select>
            </div>
          )}

          {(captureType === 'recording' || captureType === 'both') && (
            <div>
              <label className="block font-medium text-gray-700 mb-1">Recording Duration (ms)</label>
              <input
                type="number"
                data-testid="recipe-recording-duration"
                value={recordingDurationMs}
                onChange={(e) => setRecordingDurationMs(parseInt(e.target.value, 10) || 5000)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white"
              />
            </div>
          )}

          <div>
            <label className="block font-medium text-gray-700 mb-1">Additional Wait (ms)</label>
            <input
              type="number"
              data-testid="recipe-additional-wait"
              value={additionalWaitMs}
              onChange={(e) => setAdditionalWaitMs(parseInt(e.target.value, 10) || 0)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 text-xs">
          <input
            type="checkbox"
            id="recipe-disable-animations"
            data-testid="recipe-disable-animations"
            checked={disableAnimations}
            onChange={(e) => setDisableAnimations(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="recipe-disable-animations" className="text-gray-700 select-none">
            Disable CSS animations and transitions during capture
          </label>
        </div>
      </div>

      {/* Action Editor */}
      <ActionEditor actions={actions} onChange={setActions} disabled={saving} />

      {/* Actions / Submit */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="save-recipe-submit-btn"
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : recipe ? 'Save Changes' : 'Create Recipe'}
        </button>
      </div>
    </form>
  );
};
