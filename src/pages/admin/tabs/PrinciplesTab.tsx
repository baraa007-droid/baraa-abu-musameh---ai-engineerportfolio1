import React, { useState } from 'react';
import { ShieldCheck, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { EngineeringPrinciple } from '../../../types';

interface PrinciplesTabProps {
  principles: EngineeringPrinciple[];
  onUpdateAll: (principles: EngineeringPrinciple[]) => void;
}

export const PrinciplesTab: React.FC<PrinciplesTabProps> = ({
  principles,
  onUpdateAll
}) => {
  const [editingPrinciple, setEditingPrinciple] = useState<Partial<EngineeringPrinciple> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const sorted = [...principles].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const startCreate = () => {
    setIsNew(true);
    setEditingPrinciple({
      id: `principle-${Date.now()}`,
      title: '',
      title_ar: '',
      description: '',
      description_ar: '',
      enabled: true,
      order: sorted.length + 1
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingPrinciple?.title) return;

      let updatedList: EngineeringPrinciple[];
      if (isNew) {
        updatedList = [...sorted, editingPrinciple as EngineeringPrinciple];
      } else {
        updatedList = sorted.map((p) => (p.id === editingPrinciple.id ? (editingPrinciple as EngineeringPrinciple) : p));
      }
      await onUpdateAll(updatedList);
      setEditingPrinciple(null);
      setIsNew(false);
    } catch {
      // Save failed: keep the form open with the user's input (the dashboard shows the error).
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this principle?')) {
      onUpdateAll(sorted.filter((p) => p.id !== id));
    }
  };

  const handleToggleEnabled = (id: string) => {
    onUpdateAll(sorted.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const copy = [...sorted];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    const reordered = copy.map((p, idx) => ({ ...p, order: idx + 1 }));
    onUpdateAll(reordered);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            About Page Engineering Principles CMS
          </h2>
          <p className="text-xs text-zinc-500">
            Define key engineering principles (Deterministic Engineering, Low Latency, Type Safety, etc.) displayed on the About page.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Principle</span>
        </button>
      </div>

      {/* Editor Modal */}
      {editingPrinciple && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {isNew ? 'Add Engineering Principle' : `Edit "${editingPrinciple.title}"`}
              </h3>
              <button
                onClick={() => setEditingPrinciple(null)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Principle Title (EN)</label>
                <input
                  type="text"
                  required
                  value={editingPrinciple.title || ''}
                  onChange={(e) => setEditingPrinciple({ ...editingPrinciple, title: e.target.value })}
                  placeholder="e.g. Deterministic Engineering"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Principle Title (AR - Optional)</label>
                <input
                  type="text"
                  value={editingPrinciple.title_ar || ''}
                  onChange={(e) => setEditingPrinciple({ ...editingPrinciple, title_ar: e.target.value })}
                  placeholder="e.g. الهندسة الحتمية والموثوقية"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Description (EN)</label>
                <textarea
                  rows={2}
                  required
                  value={editingPrinciple.description || ''}
                  onChange={(e) => setEditingPrinciple({ ...editingPrinciple, description: e.target.value })}
                  placeholder="Resilient systems with strict output schemas..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Description (AR - Optional)</label>
                <textarea
                  rows={2}
                  value={editingPrinciple.description_ar || ''}
                  onChange={(e) => setEditingPrinciple({ ...editingPrinciple, description_ar: e.target.value })}
                  placeholder="الشرح باللغة العربية..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editingPrinciple.enabled !== false}
                    onChange={(e) => setEditingPrinciple({ ...editingPrinciple, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Enabled (Visible on About Page)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingPrinciple(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                >
                  Save Principle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Principles List */}
      <div className="space-y-3">
        {sorted.map((principle, idx) => (
          <div
            key={principle.id}
            className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              principle.enabled ? 'border-zinc-200 dark:border-zinc-800' : 'border-zinc-200 dark:border-zinc-800 opacity-60 bg-zinc-50 dark:bg-zinc-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-sm font-bold font-mono px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                0{idx + 1}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {principle.title}
                  </h3>
                  {!principle.enabled && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                  {principle.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => handleMove(idx, 'up')}
                disabled={idx === 0}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-30 cursor-pointer"
                title="Move Up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleMove(idx, 'down')}
                disabled={idx === sorted.length - 1}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-30 cursor-pointer"
                title="Move Down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleToggleEnabled(principle.id)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  principle.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}
                title={principle.enabled ? 'Disable' : 'Enable'}
              >
                {principle.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  setIsNew(false);
                  setEditingPrinciple(principle);
                }}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(principle.id)}
                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-colors cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
