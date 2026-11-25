import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { MethodologyStep } from '../../../types';

interface MethodologyTabProps {
  steps: MethodologyStep[];
  onUpdateAll: (steps: MethodologyStep[]) => void;
}

export const MethodologyTab: React.FC<MethodologyTabProps> = ({
  steps,
  onUpdateAll
}) => {
  const [editingStep, setEditingStep] = useState<Partial<MethodologyStep> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const sorted = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const startCreate = () => {
    setIsNew(true);
    setEditingStep({
      id: `method-${Date.now()}`,
      step_number: String(sorted.length + 1).padStart(2, '0'),
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
      if (!editingStep?.title) return;

      let updatedList: MethodologyStep[];
      if (isNew) {
        updatedList = [...sorted, editingStep as MethodologyStep];
      } else {
        updatedList = sorted.map((s) => (s.id === editingStep.id ? (editingStep as MethodologyStep) : s));
      }
      await onUpdateAll(updatedList);
      setEditingStep(null);
      setIsNew(false);
    } catch {
      // Save failed: keep the form open with the user's input (the dashboard shows the error).
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this methodology step?')) {
      onUpdateAll(sorted.filter((s) => s.id !== id));
    }
  };

  const handleToggleEnabled = (id: string) => {
    onUpdateAll(sorted.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const copy = [...sorted];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    const reordered = copy.map((s, idx) => ({ ...s, order: idx + 1 }));
    onUpdateAll(reordered);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            Homepage Engineering Methodology CMS
          </h2>
          <p className="text-xs text-zinc-500">
            Define the step-by-step process (Discovery, Architecture, Implementation, Deployment, etc.) displayed on the homepage.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Step</span>
        </button>
      </div>

      {/* Editor Modal */}
      {editingStep && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {isNew ? 'Add Methodology Step' : `Edit Step ${editingStep.step_number}`}
              </h3>
              <button
                onClick={() => setEditingStep(null)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Step Number</label>
                  <input
                    type="text"
                    required
                    value={editingStep.step_number || ''}
                    onChange={(e) => setEditingStep({ ...editingStep, step_number: e.target.value })}
                    placeholder="e.g. 01"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Step Title (EN)</label>
                  <input
                    type="text"
                    required
                    value={editingStep.title || ''}
                    onChange={(e) => setEditingStep({ ...editingStep, title: e.target.value })}
                    placeholder="e.g. Discovery & Feasibility"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Step Title (AR - Optional)</label>
                <input
                  type="text"
                  value={editingStep.title_ar || ''}
                  onChange={(e) => setEditingStep({ ...editingStep, title_ar: e.target.value })}
                  placeholder="e.g. الاكتشاف ودراسة الجدوى"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Description (EN)</label>
                <textarea
                  rows={2}
                  required
                  value={editingStep.description || ''}
                  onChange={(e) => setEditingStep({ ...editingStep, description: e.target.value })}
                  placeholder="Detailed breakdown of step..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Description (AR - Optional)</label>
                <textarea
                  rows={2}
                  value={editingStep.description_ar || ''}
                  onChange={(e) => setEditingStep({ ...editingStep, description_ar: e.target.value })}
                  placeholder="الشرح باللغة العربية..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editingStep.enabled !== false}
                    onChange={(e) => setEditingStep({ ...editingStep, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Enabled (Visible on Public Homepage)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingStep(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                >
                  Save Step
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Steps List */}
      <div className="space-y-3">
        {sorted.map((step, idx) => (
          <div
            key={step.id}
            className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              step.enabled ? 'border-zinc-200 dark:border-zinc-800' : 'border-zinc-200 dark:border-zinc-800 opacity-60 bg-zinc-50 dark:bg-zinc-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-sm font-bold font-mono px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                {step.step_number}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {step.title}
                  </h3>
                  {!step.enabled && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                  {step.description}
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
                onClick={() => handleToggleEnabled(step.id)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  step.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}
                title={step.enabled ? 'Disable' : 'Enable'}
              >
                {step.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  setIsNew(false);
                  setEditingStep(step);
                }}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(step.id)}
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
