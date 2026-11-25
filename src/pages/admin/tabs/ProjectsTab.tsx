import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Github,
  Star
} from 'lucide-react';
import { Project } from '../../../types';
import { slugify } from '../../../lib/content';

interface ProjectsTabProps {
  projects: Project[];
  onCreateProject: (project: Partial<Project>) => void;
  onUpdateProject: (id: string, project: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  projects,
  onCreateProject,
  onUpdateProject,
  onDeleteProject
}) => {
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);

  const startCreate = () => {
    setIsNew(true);
    setEditingProject({
      title: '',
      slug: '',
      category: 'Web Application',
      short_description: '',
      full_description: '',
      problem: '',
      solution: '',
      technologies: [],
      features: [],
      results: [],
      featured: false,
      published: true,
      order: 99,
      image_url: ''
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingProject?.title) return;

      const payload = {
        ...editingProject,
        slug: editingProject.slug || slugify(editingProject.title || '', 'project'),
        // Keep the seed field in sync so every page shows the image the admin chose.
        ...(editingProject.image_url ? { cover_image: editingProject.image_url } : {})
      };

      if (isNew) {
        await onCreateProject(payload);
      } else if (editingProject.id) {
        await onUpdateProject(editingProject.id, payload);
      }

      setEditingProject(null);
      setIsNew(false);
    } catch {
      // Save failed: keep the form open with the user's input (the dashboard shows the error).
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            Projects & Case Studies CMS
          </h2>
          <p className="text-xs text-zinc-500">
            Manage portfolio case studies, architecture notes, benchmarks, and live deployment links.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Editor Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {isNew ? 'Create New Case Study' : `Edit "${editingProject.title}"`}
              </h3>
              <button
                onClick={() => setEditingProject(null)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Project Title</label>
                  <input
                    type="text"
                    required
                    value={editingProject.title || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                    placeholder="e.g. HealthPulse SaaS"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Slug (URL)</label>
                  <input
                    type="text"
                    value={editingProject.slug || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, slug: e.target.value })}
                    placeholder="auto-generated-if-blank"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Category</label>
                  <input
                    type="text"
                    value={editingProject.category || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}
                    placeholder="AI / Full Stack / Mobile / Enterprise"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Cover Image URL</label>
                  <input
                    type="url"
                    value={editingProject.image_url || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Short Summary</label>
                <input
                  type="text"
                  required
                  value={editingProject.short_description || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, short_description: e.target.value })}
                  placeholder="One sentence overview..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">The Problem</label>
                  <textarea
                    rows={3}
                    value={editingProject.problem || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, problem: e.target.value })}
                    placeholder="What challenge did this solve?"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">The Solution</label>
                  <textarea
                    rows={3}
                    value={editingProject.solution || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, solution: e.target.value })}
                    placeholder="Architecture and execution..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Technologies (comma separated)</label>
                <input
                  type="text"
                  value={(editingProject.technologies || []).join(', ')}
                  onChange={(e) => setEditingProject({
                    ...editingProject,
                    technologies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="React, TypeScript, Node.js, Gemini API, PostgreSQL"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Live URL</label>
                  <input
                    type="url"
                    value={editingProject.live_url || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, live_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">GitHub Repository URL</label>
                  <input
                    type="url"
                    value={editingProject.github_url || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, github_url: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editingProject.featured || false}
                    onChange={(e) => setEditingProject({ ...editingProject, featured: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Featured Case Study (Shown on Homepage)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editingProject.published !== false}
                    onChange={(e) => setEditingProject({ ...editingProject, published: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Published</span>
                </label>
                <label className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300">
                  <span>Order</span>
                  <input
                    type="number"
                    min={0}
                    max={999999}
                    value={editingProject.order ?? 99}
                    onChange={(e) => setEditingProject({ ...editingProject, order: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })}
                    className="w-20 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </label>
              </div>

              {/* SEO & Gallery Section */}
              <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">SEO & Gallery</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300">SEO Title <span className="font-normal text-zinc-400">(max 70)</span></label>
                    <input type="text" maxLength={70}
                      value={editingProject.seo_title || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, seo_title: e.target.value })}
                      placeholder="Custom page title for search engines..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300">OG Image URL</label>
                    <input type="url"
                      value={editingProject.og_image || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, og_image: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">SEO Description <span className="font-normal text-zinc-400">(max 160)</span></label>
                  <textarea rows={2} maxLength={160}
                    value={editingProject.seo_description || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, seo_description: e.target.value })}
                    placeholder="Description for search engines and social sharing..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                {/* Gallery */}
                <div className="space-y-2">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Gallery Images <span className="font-normal text-zinc-400">(max 20 URLs, use ↑↓ to reorder)</span></label>
                  {(editingProject.gallery || []).map((url, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input type="text"
                        value={url}
                        onChange={(e) => {
                          const g = [...(editingProject.gallery || [])];
                          g[idx] = e.target.value;
                          setEditingProject({ ...editingProject, gallery: g });
                        }}
                        placeholder="https://... or /path/to/image.jpg"
                        className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-xs"
                      />
                      <button type="button" onClick={() => {
                        const g = (editingProject.gallery || []).filter((_, i) => i !== idx);
                        setEditingProject({ ...editingProject, gallery: g });
                      }} className="px-2 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-xs transition-colors">✕</button>
                      <button type="button" disabled={idx === 0} onClick={() => {
                        const g = [...(editingProject.gallery || [])];
                        [g[idx-1], g[idx]] = [g[idx], g[idx-1]];
                        setEditingProject({ ...editingProject, gallery: g });
                      }} className="px-2 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs disabled:opacity-30">↑</button>
                      <button type="button" disabled={idx === (editingProject.gallery || []).length - 1} onClick={() => {
                        const g = [...(editingProject.gallery || [])];
                        [g[idx], g[idx+1]] = [g[idx+1], g[idx]];
                        setEditingProject({ ...editingProject, gallery: g });
                      }} className="px-2 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs disabled:opacity-30">↓</button>
                    </div>
                  ))}
                  {(editingProject.gallery || []).length < 20 && (
                    <button type="button" onClick={() => setEditingProject({ ...editingProject, gallery: [...(editingProject.gallery || []), ''] })}
                      className="px-3 py-1.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 text-xs hover:border-amber-500 hover:text-amber-500 transition-colors">
                      + Add Gallery Image
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {project.category}
                </span>
                {project.featured && (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                    <Star className="w-3 h-3 fill-amber-500" /> Featured
                  </span>
                )}
                {project.published === false && (
                  <span className="text-[10px] font-mono font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">Hidden</span>
                )}
              </div>

              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {project.title}
              </h3>

              <p className="text-xs text-zinc-500 line-clamp-2">
                {project.short_description}
              </p>

              <div className="flex flex-wrap gap-1 pt-1">
                {(project.technologies || []).slice(0, 4).map((tech, i) => (
                  <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                {project.live_url && (
                  <a href={project.live_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                    <Github className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsNew(false);
                    setEditingProject(project);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete project "${project.title}"?`)) {
                      onDeleteProject(project.id);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
