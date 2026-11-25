import React, { useState } from 'react';
import { Quote, Plus, Edit2, Trash2, Star } from 'lucide-react';
import { Testimonial } from '../../../types';

interface TestimonialsTabProps {
  testimonials: Testimonial[];
  onCreateTestimonial: (t: Partial<Testimonial>) => void;
  onUpdateTestimonial: (id: string, t: Partial<Testimonial>) => void;
  onDeleteTestimonial: (id: string) => void;
}

export const TestimonialsTab: React.FC<TestimonialsTabProps> = ({
  testimonials,
  onCreateTestimonial,
  onUpdateTestimonial,
  onDeleteTestimonial
}) => {
  const [editingItem, setEditingItem] = useState<Partial<Testimonial> | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);

  const startCreate = () => {
    setIsNew(true);
    setEditingItem({
      name: '',
      role: 'Founder & CEO',
      company: '',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      rating: 5,
      content: '',
      published: true
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingItem?.name || !editingItem?.content) return;

      if (isNew) {
        await onCreateTestimonial(editingItem);
      } else if (editingItem.id) {
        await onUpdateTestimonial(editingItem.id, editingItem);
      }

      setEditingItem(null);
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
            <Quote className="w-5 h-5 text-amber-500" />
            Client Reviews & Testimonials CMS
          </h2>
          <p className="text-xs text-zinc-500">
            Publish client feedback, executive recommendations, ratings, and avatars.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Testimonial</span>
        </button>
      </div>

      {/* Editor Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {isNew ? 'Add Client Testimonial' : `Edit "${editingItem.name}"`}
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-xs font-mono text-zinc-400">
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Client Name</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Company</label>
                  <input
                    type="text"
                    value={editingItem.company || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, company: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Role / Title</label>
                  <input
                    type="text"
                    value={editingItem.position || editingItem.role || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, position: e.target.value, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Avatar URL</label>
                  <input
                    type="url"
                    value={editingItem.avatar_url || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, avatar_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Review / Testimonial Text</label>
                <textarea
                  rows={4}
                  required
                  value={editingItem.content || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={editingItem.published !== false}
                  onChange={(e) => setEditingItem({ ...editingItem, published: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span className="font-bold text-zinc-700 dark:text-zinc-300">Published on Site</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testimonials.map((t) => (
          <div
            key={t.id}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: t.rating || 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                ))}
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 italic line-clamp-3">
                "{t.content}"
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{t.name}</span>
                <span className="text-[11px] text-zinc-400">{t.position || t.role} • {t.company}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsNew(false);
                    setEditingItem(t);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete testimonial from ${t.name}?`)) {
                      onDeleteTestimonial(t.id);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white"
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
