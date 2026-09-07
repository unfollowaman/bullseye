'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Recipe, CreateRecipeInput } from '@/recipes/types';
import { Project } from '@/projects/types';
import { UnifiedCaptureResult } from '@/capture/types';
import { RecipeEditor } from './RecipeEditor';
import { ResultContainer } from '../ResultContainer';

interface RecipeManagerProps {
  initialProjectId?: string;
}

export const RecipeManager: React.FC<RecipeManagerProps> = ({ initialProjectId }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor modal state
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null | 'new'>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<UnifiedCaptureResult | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const url = initialProjectId
        ? `/api/projects/${initialProjectId}/recipes`
        : '/api/recipes';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes || []);
      }
    } catch {
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [initialProjectId]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchRecipes();
    fetchProjects();
  }, [fetchRecipes, fetchProjects]);

  const handleSaveRecipe = async (input: CreateRecipeInput) => {
    try {
      if (initialProjectId && !input.projectId) {
        input.projectId = initialProjectId;
      }

      if (editingRecipe && editingRecipe !== 'new') {
        const res = await fetch(`/api/recipes/${editingRecipe.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update recipe');
        }
      } else {
        const res = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create recipe');
        }
      }

      setEditingRecipe(null);
      await fetchRecipes();
    } catch (err: unknown) {
      throw err;
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/recipes/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        await fetchRecipes();
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConfirmDeleteId(null);
        await fetchRecipes();
      }
    } catch {}
  };

  const handleAssignProject = async (recipeId: string, projectId: string) => {
    try {
      const targetProjectId = projectId === 'none' ? null : projectId;
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: targetProjectId }),
      });
      if (res.ok) {
        await fetchRecipes();
      }
    } catch {}
  };

  const handleExecute = async (id: string) => {
    try {
      setExecutingId(id);
      setExecutionResult(null);
      setExecutionError(null);

      const res = await fetch(`/api/recipes/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        const errs = Array.isArray(data.errors) ? data.errors.join('; ') : 'Recipe execution failed';
        setExecutionError(errs);
      } else {
        setExecutionResult(data as UnifiedCaptureResult);
      }
    } catch (err: unknown) {
      setExecutionError(err instanceof Error ? err.message : 'Execution error');
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div data-testid="recipe-manager" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Capture Recipes</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Pre-configured capture configurations with automated action steps.
          </p>
        </div>
        {!editingRecipe && (
          <button
            type="button"
            data-testid="create-recipe-btn"
            onClick={() => setEditingRecipe('new')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
          >
            + New Recipe
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Recipe Editor Form */}
      {editingRecipe && (
        <RecipeEditor
          recipe={editingRecipe === 'new' ? null : editingRecipe}
          onSave={handleSaveRecipe}
          onCancel={() => setEditingRecipe(null)}
        />
      )}

      {/* Execution Results Container */}
      {(executionResult || executionError) && (
        <div data-testid="recipe-execution-result-container" className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800">Recipe Execution Output</h3>
          <ResultContainer jobResult={executionResult} error={executionError} />
        </div>
      )}

      {/* Recipe Cards List */}
      {loading ? (
        <div className="text-center py-8 text-xs text-gray-400">Loading recipes...</div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-white text-xs text-gray-500">
          No recipes found. Create one above to get started!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recipes.map((r) => {
            return (
              <div
                key={r.id}
                data-testid={`recipe-card-${r.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-gray-900 text-sm">{r.name}</h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 uppercase">
                      {r.config.captureType || 'screenshot'}
                    </span>
                  </div>

                  {r.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">{r.description}</p>
                  )}

                  <div className="text-xs text-gray-500 space-y-1 font-mono bg-gray-50 p-2.5 rounded border border-gray-100">
                    <div>
                      <strong className="text-gray-700 font-sans">URL:</strong> {r.config.url}
                    </div>
                    <div>
                      <strong className="text-gray-700 font-sans">Actions:</strong>{' '}
                      {r.actions?.length || 0} step(s)
                    </div>
                  </div>

                  {/* Project Selector / Badge */}
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <label className="text-gray-500 font-medium">Project:</label>
                    <select
                      data-testid={`assign-project-select-${r.id}`}
                      value={r.projectId || 'none'}
                      onChange={(e) => handleAssignProject(r.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-800"
                    >
                      <option value="none">Standalone (No Project)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid={`edit-recipe-btn-${r.id}`}
                      onClick={() => setEditingRecipe(r)}
                      className="px-2.5 py-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      data-testid={`duplicate-recipe-btn-${r.id}`}
                      onClick={() => handleDuplicate(r.id)}
                      className="px-2.5 py-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded font-medium"
                    >
                      Duplicate
                    </button>
                    {confirmDeleteId === r.id ? (
                      <button
                        type="button"
                        data-testid={`confirm-delete-btn-${r.id}`}
                        onClick={() => handleDelete(r.id)}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold"
                      >
                        Confirm Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid={`delete-recipe-btn-${r.id}`}
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="px-2.5 py-1 border border-red-200 text-red-600 hover:bg-red-50 rounded font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    data-testid={`execute-recipe-btn-${r.id}`}
                    disabled={executingId === r.id}
                    onClick={() => handleExecute(r.id)}
                    className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded shadow-sm flex items-center gap-1.5"
                  >
                    {executingId === r.id ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Executing...
                      </>
                    ) : (
                      '▶ Run Recipe'
                    )}
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
