'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CaptureHistoryRecord } from '@/history/types';
import { Project } from '@/projects/types';
import { Recipe } from '@/recipes/types';

interface HistoryManagerProps {
  initialProjectId?: string;
  initialRecipeId?: string;
}

export const HistoryManager: React.FC<HistoryManagerProps> = ({
  initialProjectId,
  initialRecipeId,
}) => {
  const [history, setHistory] = useState<CaptureHistoryRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId || 'all');

  // Selected history record detail view
  const [selectedRecord, setSelectedRecord] = useState<CaptureHistoryRecord | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (initialProjectId) params.append('projectId', initialProjectId);
      if (initialRecipeId) params.append('recipeId', initialRecipeId);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('captureType', typeFilter);
      if (projectFilter !== 'all' && !initialProjectId) params.append('projectId', projectFilter);

      const res = await fetch(`/api/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {
      setError('Failed to fetch capture history');
    } finally {
      setLoading(false);
    }
  }, [initialProjectId, initialRecipeId, statusFilter, typeFilter, projectFilter]);

  const fetchMetadata = useCallback(async () => {
    try {
      const [projRes, recipeRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/recipes'),
      ]);
      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData.projects || []);
      }
      if (recipeRes.ok) {
        const rData = await recipeRes.json();
        setRecipes(rData.recipes || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDeleteRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedRecord?.id === id) setSelectedRecord(null);
        await fetchHistory();
      }
    } catch {}
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'partial':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'failed':
      default:
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  return (
    <div data-testid="history-manager" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Capture History</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Local log of past capture jobs with asset references and metadata.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div>
            <select
              data-testid="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-800 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="partial">Partial</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              data-testid="filter-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-800 font-medium"
            >
              <option value="all">All Types</option>
              <option value="screenshot">Screenshot</option>
              <option value="recording">Recording</option>
              <option value="both">Both</option>
            </select>
          </div>

          {!initialProjectId && (
            <div>
              <select
                data-testid="filter-project"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-800 font-medium"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Selected History Record Detail View */}
      {selectedRecord && (
        <div
          data-testid="history-detail-modal"
          className="bg-white border border-gray-300 rounded-xl p-5 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              Capture Detail Record
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getStatusBadgeClass(
                  selectedRecord.status
                )}`}
              >
                {selectedRecord.status}
              </span>
            </h3>
            <button
              type="button"
              data-testid="close-detail-btn"
              onClick={() => setSelectedRecord(null)}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium"
            >
              Close ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-gray-500 block">URL:</span>
              <strong className="text-gray-900 break-all">{selectedRecord.url}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Timestamp:</span>
              <strong className="text-gray-900">{selectedRecord.timestamp}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Viewport & DPR:</span>
              <strong className="text-gray-900">
                {selectedRecord.viewport.width}x{selectedRecord.viewport.height} @ DPR {selectedRecord.dpr}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 block">Duration:</span>
              <strong className="text-gray-900">{selectedRecord.durationMs} ms</strong>
            </div>
          </div>

          {selectedRecord.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded">
              <strong>Error:</strong> {selectedRecord.error}
            </div>
          )}

          {/* Outputs Preview & Download Links */}
          <div className="space-y-4 pt-2">
            {selectedRecord.outputs?.screenshot && (
              <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-800">Screenshot Output</span>
                  <a
                    href={selectedRecord.outputs.screenshot.path}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700"
                  >
                    Download PNG
                  </a>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedRecord.outputs.screenshot.path}
                  alt="Screenshot Result"
                  className="max-h-64 rounded border border-gray-300 mx-auto object-contain bg-white"
                />
              </div>
            )}

            {selectedRecord.outputs?.recording && (
              <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-800">Recording Output (WebM)</span>
                  <a
                    href={selectedRecord.outputs.recording.path}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-semibold hover:bg-purple-700"
                  >
                    Download WebM
                  </a>
                </div>
                <video
                  src={selectedRecord.outputs.recording.path}
                  controls
                  className="max-h-64 rounded border border-gray-300 w-full bg-black"
                />
              </div>
            )}

            {selectedRecord.outputs?.mp4 && (
              <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-indigo-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-indigo-900">Converted Output (MP4)</span>
                  <a
                    href={selectedRecord.outputs.mp4.path}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700"
                  >
                    Download MP4
                  </a>
                </div>
                <video
                  src={selectedRecord.outputs.mp4.path}
                  controls
                  className="max-h-64 rounded border border-gray-300 w-full bg-black"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Records List */}
      {loading ? (
        <div className="text-center py-8 text-xs text-gray-400">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-white text-xs text-gray-500">
          No capture history found for the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const project = projects.find((p) => p.id === item.projectId);
            const recipe = recipes.find((r) => r.id === item.recipeId);

            return (
              <div
                key={item.id}
                data-testid={`history-record-${item.id}`}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-200 transition-colors"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadgeClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                      {item.captureType}
                    </span>
                    {project && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Project: {project.name}
                      </span>
                    )}
                    {recipe && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        Recipe: {recipe.name}
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-gray-900 text-xs truncate">{item.url}</div>

                  <div className="text-[11px] text-gray-500 flex items-center gap-3">
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                    <span>•</span>
                    <span>
                      {item.viewport.width}x{item.viewport.height} @ {item.dpr}x
                    </span>
                    <span>•</span>
                    <span>{item.durationMs}ms</span>
                  </div>

                  {item.error && (
                    <div className="text-[11px] text-red-600 truncate font-mono">
                      Error: {item.error}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    data-testid={`view-detail-btn-${item.id}`}
                    onClick={() => setSelectedRecord(item)}
                    className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-semibold"
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-history-btn-${item.id}`}
                    onClick={() => handleDeleteRecord(item.id)}
                    className="px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
