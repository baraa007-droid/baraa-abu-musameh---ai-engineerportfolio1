import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Edit2,
  Trash2,
  Clock
} from 'lucide-react';
import { Service } from '../../../types';
import { slugify } from '../../../lib/content';

interface ServicesTabProps {
  services: Service[];
  onCreateService: (service: Partial<Service>) => void;
  onUpdateService: (id: string, service: Partial<Service>) => void;
  onDeleteService: (id: string) => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({
  services,
  onCreateService,
  onUpdateService,
  onDeleteService
}) => {
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);

  const startCreate = () => {
    setIsNew(true);
    setEditingService({
      title: '',
      slug: '',
      category: 'Development',
      short_description: '',
      full_description: '',
      starting_price: '',
      currency: '',
      timeline: '',
      features: [],
      technologies: [],
      deliverables: [],
      process: [],
      faq: [],
      active: false,
      order: 99
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingService?.title) return;

      const payload = {
        ...editingService,
        slug: editingService.slug || slugify(editingService.title || '', 'service')
      };

      if (isNew) {
        await onCreateService(payload);
      } else if (editingService.id) {
        await onUpdateService(editingService.id, payload);
      }

      setEditingService(null);
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
            <Cpu className="w-5 h-5 text-amber-500" />
            Services & Engineering Offerings CMS
          </h2>
          <p className="text-xs text-zinc-500">
            Define pricing packages, deliverables, engineering methodologies, and FAQ answers.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Service</span>
        </button>
      </div>

      {/* Editor Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {isNew ? 'Create Service Offering' : `Edit "${editingService.title}"`}
              </h3>
              <button
                onClick={() => setEditingService(null)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Service Title</label>
                  <input
                    type="text"
                    required
                    value={editingService.title || ''}
                    onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                    placeholder="e.g. AI-Powered Full-Stack Web Development"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Slug</label>
                  <input
                    type="text"
                    value={editingService.slug || ''}
                    onChange={(e) => setEditingService({ ...editingService, slug: e.target.value })}
                    placeholder="auto-generated"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Category</label>
                  <input
                    type="text"
                    value={editingService.category || ''}
                    onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                    placeholder="AI / Full Stack / Mobile"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Starting Price</label>
                  <input
                    type="text"
                    value={editingService.starting_price || ''}
                    onChange={(e) => setEditingService({ ...editingService, starting_price: e.target.value })}
                    placeholder="$3,000"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Currency</label>
                  <input type="text" maxLength={8} value={editingService.currency || ''} onChange={(e) => setEditingService({ ...editingService, currency: e.target.value.toUpperCase() })} placeholder="USD, EUR, JOD" className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Timeline</label>
                  <input
                    type="text"
                    value={editingService.timeline || ''}
                    onChange={(e) => setEditingService({ ...editingService, timeline: e.target.value })}
                    placeholder="2-4 Weeks"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Display Order</label>
                  <input
                    type="number"
                    min={0}
                    max={999999}
                    value={editingService.order ?? 99}
                    onChange={(e) => setEditingService({ ...editingService, order: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Warranty Terms</label>
                  <input
                    type="text"
                    value={editingService.warranty_terms || ''}
                    onChange={(e) => setEditingService({ ...editingService, warranty_terms: e.target.value })}
                    placeholder="Included (30 Days)"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Short Summary</label>
                <input
                  type="text"
                  value={editingService.short_description || ''}
                  onChange={(e) => setEditingService({ ...editingService, short_description: e.target.value })}
                  placeholder="Concise value proposition..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Full Description</label>
                <textarea
                  rows={3}
                  value={editingService.full_description || ''}
                  onChange={(e) => setEditingService({ ...editingService, full_description: e.target.value })}
                  placeholder="Detailed breakdown of the offering..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Key Features (comma separated)</label>
                  <input
                    type="text"
                    value={(editingService.features || []).join(', ')}
                    onChange={(e) => setEditingService({
                      ...editingService,
                      features: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Full Source Code, Staging URL, API Docs"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Deliverables (comma separated)</label>
                  <input
                    type="text"
                    value={(editingService.deliverables || []).join(', ')}
                    onChange={(e) => setEditingService({
                      ...editingService,
                      deliverables: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Production Build, DB Migrations, Tests"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editingService.active !== false}
                    onChange={(e) => setEditingService({ ...editingService, active: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Active Offering (Visible to Public)</span>
                </label>
              </div>

              {/* SEO Section */}
              <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">SEO Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300">SEO Title <span className="font-normal text-zinc-400">(max 70)</span></label>
                    <input type="text" maxLength={70}
                      value={editingService.seo_title || ''}
                      onChange={(e) => setEditingService({ ...editingService, seo_title: e.target.value })}
                      placeholder="Custom title for search engines..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300">OG Image URL</label>
                    <input type="url"
                      value={editingService.og_image || ''}
                      onChange={(e) => setEditingService({ ...editingService, og_image: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">SEO Description <span className="font-normal text-zinc-400">(max 160)</span></label>
                  <textarea rows={2} maxLength={160}
                    value={editingService.seo_description || ''}
                    onChange={(e) => setEditingService({ ...editingService, seo_description: e.target.value })}
                    placeholder="Description for search engines and social sharing..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((srv) => (
          <div
            key={srv.id}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {srv.category}
                </span>
                <span className="text-xs font-bold font-mono text-emerald-500">
                  From {srv.starting_price}
                </span>
              </div>

              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {srv.title}
              </h3>

              <p className="text-xs text-zinc-500 line-clamp-2">
                {srv.short_description}
              </p>

              <div className="text-[11px] font-mono text-zinc-400 pt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Timeline: {srv.timeline}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${srv.active ? 'bg-emerald-500/10 text-emerald-500 font-semibold' : 'bg-zinc-100 text-zinc-400'}`}>
                {srv.active ? 'Active' : 'Inactive'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsNew(false);
                    setEditingService(srv);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete service "${srv.title}"?`)) {
                      onDeleteService(srv.id);
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
