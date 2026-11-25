import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { Experience } from '../../../types';

interface ExperienceTabProps {
  experience: Experience[];
  onUpdateAllExperience: (exp: Experience[]) => void;
}

export const ExperienceTab: React.FC<ExperienceTabProps> = ({
  experience,
  onUpdateAllExperience
}) => {
  const [items, setItems] = useState<Experience[]>(experience);
  const [editingItem, setEditingItem] = useState<Experience | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);

  const startCreate = () => {
    setIsNew(true);
    setEditingItem({
      id: `exp-${Date.now()}`,
      role: '',
      company: '',
      location: 'Remote',
      type: 'Full-time',
      start_date: '',
      end_date: '',
      current: false,
      description: '',
      achievements: [],
      technologies: [],
      published: true,
      order: 99
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingItem?.role || !editingItem?.company) return;

      let updated: Experience[];
      if (isNew) {
        updated = [editingItem, ...items];
      } else {
        updated = items.map(i => (i.id === editingItem.id ? editingItem : i));
      }

      setItems(updated);
      await onUpdateAllExperience(updated);
      setEditingItem(null);
      setIsNew(false);
    } catch {
      // Save failed: keep the form open with the user's input (the dashboard shows the error).
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this career experience entry?')) {
      const updated = items.filter(i => i.id !== id);
      setItems(updated);
      onUpdateAllExperience(updated);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-500" />
            Work Experience & Career Milestones CMS
          </h2>
          <p className="text-xs text-zinc-500">
            Maintain roles, corporate achievements, technologies used, and tenure timeline.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Experience</span>
        </button>
      </div>

      {/* Editor Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-xl w-full space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {isNew ? 'Add Experience Entry' : `Edit "${editingItem.role}"`}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Job Title / Role</label>
                  <input
                    type="text"
                    required
                    value={editingItem.role}
                    onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}
                    placeholder="Senior Full Stack Engineer"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editingItem.company}
                    onChange={(e) => setEditingItem({ ...editingItem, company: e.target.value })}
                    placeholder="e.g. Nexus Tech"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Location</label>
                  <input
                    type="text"
                    value={editingItem.location}
                    onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                    placeholder="Remote / Amman, Jordan"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Start Date</label>
                  <input
                    type="text"
                    value={editingItem.start_date}
                    onChange={(e) => setEditingItem({ ...editingItem, start_date: e.target.value })}
                    placeholder="2023"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">End Date</label>
                  <input
                    type="text"
                    value={editingItem.end_date}
                    onChange={(e) => setEditingItem({ ...editingItem, end_date: e.target.value })}
                    placeholder="Present"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Role Description</label>
                <textarea
                  rows={3}
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Overview of core duties..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editingItem.published !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, published: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Published</span>
                </label>
                <label className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300">
                  <span>Display Order</span>
                  <input
                    type="number"
                    min={0}
                    max={999999}
                    value={editingItem.order ?? 99}
                    onChange={(e) => setEditingItem({ ...editingItem, order: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })}
                    className="w-20 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Key Achievements (comma separated)</label>
                <input
                  type="text"
                  value={(editingItem.achievements || []).join(', ')}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    achievements: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="Architected RAG system, Reduced latency by 45%"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Technologies Used (comma separated)</label>
                <input
                  type="text"
                  value={(editingItem.technologies || []).join(', ')}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    technologies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="React, TypeScript, Express, PostgreSQL"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                >
                  Save Experience
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Experience List */}
      <div className="space-y-3">
        {items.map((exp) => (
          <div
            key={exp.id}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{exp.role}</span>
                <span className="text-amber-500 font-semibold">@{exp.company}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  {exp.start_date} – {exp.current ? 'Present' : exp.end_date}
                </span>
              </div>

              <p className="text-xs text-zinc-500 line-clamp-1">{exp.description}</p>

              <div className="flex flex-wrap gap-1 pt-1">
                {(exp.technologies || []).map((t, i) => (
                  <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  setIsNew(false);
                  setEditingItem(exp);
                }}
                className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(exp.id)}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
