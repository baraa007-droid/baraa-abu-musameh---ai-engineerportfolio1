import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { Skill } from '../../../types';

interface SkillsTabProps {
  skills: Skill[];
  onCreateSkill: (skill: Partial<Skill>) => void;
  onUpdateSkill: (id: string, skill: Partial<Skill>) => void;
  onDeleteSkill: (id: string) => void;
}

export const SkillsTab: React.FC<SkillsTabProps> = ({
  skills,
  onCreateSkill,
  onUpdateSkill,
  onDeleteSkill
}) => {
  const [editingSkill, setEditingSkill] = useState<Partial<Skill> | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);

  const startCreate = () => {
    setIsNew(true);
    setEditingSkill({
      name: '',
      category: 'Frontend & UI Engineering',
      proficiency: 0,
      years_experience: 0,
      icon: 'code',
      featured: false,
      order: 99
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingSkill?.name) return;

      if (isNew) {
        await onCreateSkill(editingSkill);
      } else if (editingSkill.id) {
        await onUpdateSkill(editingSkill.id, editingSkill);
      }

      setEditingSkill(null);
      setIsNew(false);
    } catch {
      // Save failed: keep the form open with the user's input (the dashboard shows the error).
    }
  };

  // Group by category
  const categories = Array.from(new Set(skills.map(s => s.category)));

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Skills, Frameworks & Tech Stack CMS
          </h2>
          <p className="text-xs text-zinc-500">
            Maintain proficiency scores, years of experience, categorization, and featured badges.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Skill</span>
        </button>
      </div>

      {/* Editor Modal */}
      {editingSkill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {isNew ? 'Add Technical Skill' : `Edit "${editingSkill.name}"`}
              </h3>
              <button
                onClick={() => setEditingSkill(null)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Skill / Framework Name</label>
                <input
                  type="text"
                  required
                  value={editingSkill.name || ''}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                  placeholder="e.g. React 19 / Next.js / Gemini API"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Category</label>
                <input
                  type="text"
                  required
                  value={editingSkill.category || ''}
                  onChange={(e) => setEditingSkill({ ...editingSkill, category: e.target.value })}
                  placeholder="Frontend & UI Engineering / Backend & API / AI & GenAI / DevOps"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">
                    Proficiency: {editingSkill.proficiency ?? 0}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editingSkill.proficiency ?? 0}
                    onChange={(e) => setEditingSkill({ ...editingSkill, proficiency: parseInt(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Years Experience</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                  value={editingSkill.years_experience ?? 0}
                    onChange={(e) => setEditingSkill({ ...editingSkill, years_experience: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Display Order</label>
                  <input
                    type="number"
                    min={0}
                    max={999999}
                    value={editingSkill.order ?? 99}
                    onChange={(e) => setEditingSkill({ ...editingSkill, order: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editingSkill.featured === true}
                    onChange={(e) => setEditingSkill({ ...editingSkill, featured: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Featured Core Competency</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingSkill(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                >
                  Save Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Skills Grouped by Category */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const catSkills = skills.filter(s => s.category === cat);
          return (
            <div key={cat} className="space-y-3">
              <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-zinc-400">
                {cat} ({catSkills.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {catSkills.map((sk) => (
                  <div
                    key={sk.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{sk.name}</span>
                      <span className="text-[10px] font-mono text-amber-500 font-semibold">{sk.proficiency}%</span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${sk.proficiency}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400 font-mono">
                      <span>{sk.years_experience ?? '—'}{sk.years_experience !== undefined ? ' yrs exp' : ''}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setIsNew(false);
                            setEditingSkill(sk);
                          }}
                          className="p-1 hover:text-zinc-100"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete skill "${sk.name}"?`)) {
                              onDeleteSkill(sk.id);
                            }
                          }}
                          className="p-1 hover:text-rose-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
