'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Project, CreateProjectInput } from '@/projects/types';
import { RecipeManager } from '../recipes/RecipeManager';
import { HistoryManager } from '../history/HistoryManager';

export const ProjectManager: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected project detail view
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Create/Edit Project form modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultUrl, setDefaultUrl] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        if (selectedProject) {
          const updated = (data.projects || []).find((p: Project) => p.id === selectedProject.id);
          setSelectedProject(updated || null);
        }
      }
    } catch {
      setError('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openCreateForm = () => {
    setEditingProject(null);
    setName('');
    setDescription('');
    setDefaultUrl('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (proj: Project) => {
    setEditingProject(proj);
    setName(proj.name);
    setDescription(proj.description || '');
    setDefaultUrl(proj.defaultUrl || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Project name is required');
      return;
    }

    try {
      setFormSaving(true);
      setFormError(null);

      const payload: CreateProjectInput = {
        name,
        description,
        defaultUrl,
      };

      if (editingProject) {
        const res = await fetch(`/api/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update project');
        }
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create project');
        }
      }

      setIsFormOpen(false);
      await fetchProjects();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConfirmDeleteId(null);
        if (selectedProject?.id === id) {
          setSelectedProject(null);
        }
        await fetchProjects();
      }
    } catch {}
  };

  return (
    <div data-testid="project-manager" className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Projects</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Organize recipes and capture history by project.
          </p>
        </div>
        {!selectedProject && (
          <button
            type="button"
            data-testid="create-project-btn"
            onClick={openCreateForm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
          >
            + New Project
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Project Form Modal / Drawer */}
      {isFormOpen && (
        <form
          onSubmit={handleSaveProject}
          data-testid="project-form"
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900">
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Project Name *</label>
              <input
                type="text"
                data-testid="project-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Horizon Redesign"
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Default Target URL (Optional)
              </label>
              <input
                type="text"
                data-testid="project-url-input"
                value={defaultUrl}
                onChange={(e) => setDefaultUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                data-testid="project-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief project description..."
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="save-project-btn"
              disabled={formSaving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
            >
              {formSaving ? 'Saving...' : editingProject ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      )}

      {/* Selected Project Detail View */}
      {selectedProject ? (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <button
                type="button"
                data-testid="back-to-projects-btn"
                onClick={() => setSelectedProject(null)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                ← Back to All Projects
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="edit-project-btn"
                  onClick={() => openEditForm(selectedProject)}
                  className="px-2.5 py-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-medium"
                >
                  Edit Project
                </button>
                {confirmDeleteId === selectedProject.id ? (
                  <button
                    type="button"
                    data-testid={`confirm-delete-project-btn-${selectedProject.id}`}
                    onClick={() => handleDeleteProject(selectedProject.id)}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold"
                  >
                    Confirm Delete
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid={`delete-project-btn-${selectedProject.id}`}
                    onClick={() => setConfirmDeleteId(selectedProject.id)}
                    className="px-2.5 py-1 border border-red-200 text-red-600 hover:bg-red-50 rounded text-xs font-medium"
                  >
                    Delete Project
                  </button>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">{selectedProject.name}</h3>
              {selectedProject.description && (
                <p className="text-xs text-gray-600 mt-1">{selectedProject.description}</p>
              )}
              {selectedProject.defaultUrl && (
                <div className="text-xs text-gray-500 mt-2 font-mono">
                  Default URL: <strong>{selectedProject.defaultUrl}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Project Recipes Section */}
          <section data-testid="project-recipes-section" className="space-y-3">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              Project Recipes
            </h3>
            <RecipeManager initialProjectId={selectedProject.id} />
          </section>

          {/* Project History Section */}
          <section data-testid="project-history-section" className="space-y-3 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              Project Capture History
            </h3>
            <HistoryManager initialProjectId={selectedProject.id} />
          </section>
        </div>
      ) : (
        /* Project Cards List */
        <div>
          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-white text-xs text-gray-500">
              No projects created yet. Click &quot;+ New Project&quot; above to create one!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  data-testid={`project-card-${p.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 transition-colors"
                >
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-900 text-base">{p.name}</h4>
                    {p.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{p.description}</p>
                    )}
                    {p.defaultUrl && (
                      <div className="text-xs text-gray-500 font-mono truncate bg-gray-50 p-2 rounded border border-gray-100">
                        {p.defaultUrl}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`edit-project-btn-${p.id}`}
                        onClick={() => openEditForm(p)}
                        className="px-2.5 py-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded font-medium"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === p.id ? (
                        <button
                          type="button"
                          data-testid={`confirm-delete-project-btn-${p.id}`}
                          onClick={() => handleDeleteProject(p.id)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`delete-project-btn-${p.id}`}
                          onClick={() => setConfirmDeleteId(p.id)}
                          className="px-2.5 py-1 border border-red-200 text-red-600 hover:bg-red-50 rounded font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      data-testid={`view-project-btn-${p.id}`}
                      onClick={() => setSelectedProject(p)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
