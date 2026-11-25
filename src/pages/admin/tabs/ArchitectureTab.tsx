import React, { useState } from 'react';
import { Cpu, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { ArchitectureNode } from '../../../types';

interface ArchitectureTabProps {
  nodes: ArchitectureNode[];
  onUpdateAll: (nodes: ArchitectureNode[]) => void;
}

export const ArchitectureTab: React.FC<ArchitectureTabProps> = ({
  nodes,
  onUpdateAll
}) => {
  const [editingNode, setEditingNode] = useState<Partial<ArchitectureNode> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [idError, setIdError] = useState('');

  const sorted = [...nodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const startCreate = () => {
    setIsNew(true);
    setEditingNode({
      id: `node-${Date.now()}`,
      title_en: '',
      title_ar: '',
      category_en: 'INGRESS LAYER',
      category_ar: 'طبقة الدخول',
      tech: ['TypeScript', 'Next.js'],
      latency: '< 20ms',
      description_en: '',
      description_ar: '',
      details_en: ['Detail 1'],
      details_ar: ['تفصيل 1'],
      enabled: true,
      order: sorted.length + 1
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingNode?.title_en) return;

      let updatedList: ArchitectureNode[];
      if (isNew) {
        // ids identify nodes in the hero visual; a duplicate would make two nodes edit/delete together
        if (sorted.some((n) => n.id === editingNode.id)) {
          setIdError('This identifier is already used by another node.');
          return;
        }
        updatedList = [...sorted, editingNode as ArchitectureNode];
      } else {
        // The id is read-only while editing, so it always matches the stored node.
        updatedList = sorted.map((n) => (n.id === editingNode.id ? (editingNode as ArchitectureNode) : n));
      }
      setIdError('');
      await onUpdateAll(updatedList);
      setEditingNode(null);
      setIsNew(false);
    } catch {
      // Save failed: keep the form open with the user's input (the dashboard shows the error).
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this architecture node?')) {
      onUpdateAll(sorted.filter((n) => n.id !== id));
    }
  };

  const handleToggleEnabled = (id: string) => {
    onUpdateAll(sorted.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n)));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const copy = [...sorted];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    const reordered = copy.map((n, idx) => ({ ...n, order: idx + 1 }));
    onUpdateAll(reordered);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-500" />
            Interactive Hero Architecture Visual CMS
          </h2>
          <p className="text-xs text-zinc-500">
            Control system architecture nodes, tech stack badges, target latencies, and specifications in the Hero section diagram.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Architecture Node</span>
        </button>
      </div>

      {/* Editor Modal */}
      {editingNode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {isNew ? 'Add Architecture Node' : `Edit "${editingNode.title_en}"`}
              </h3>
              <button
                onClick={() => setEditingNode(null)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Node Identifier / Slug</label>
                  <input
                    type="text"
                    required
                    value={editingNode.id || ''}
                    readOnly={!isNew}
                    aria-readonly={!isNew}
                    title={isNew ? undefined : 'The identifier of an existing node cannot be changed'}
                    onChange={(e) => { setIdError(''); setEditingNode({ ...editingNode, id: e.target.value }); }}
                    placeholder="e.g. input / rag / agent / edge"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono read-only:opacity-60"
                  />
                  {idError && <p role="alert" className="text-[11px] text-rose-600">{idError}</p>}
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Target Latency</label>
                  <input
                    type="text"
                    required
                    value={editingNode.latency || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, latency: e.target.value })}
                    placeholder="e.g. < 45ms"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Title (EN)</label>
                  <input
                    type="text"
                    required
                    value={editingNode.title_en || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, title_en: e.target.value })}
                    placeholder="e.g. Client Request & Context"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Title (AR)</label>
                  <input
                    type="text"
                    value={editingNode.title_ar || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, title_ar: e.target.value })}
                    placeholder="e.g. طلب العميل والسياق"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Category (EN)</label>
                  <input
                    type="text"
                    value={editingNode.category_en || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, category_en: e.target.value })}
                    placeholder="INGRESS LAYER"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Category (AR)</label>
                  <input
                    type="text"
                    value={editingNode.category_ar || ''}
                    onChange={(e) => setEditingNode({ ...editingNode, category_ar: e.target.value })}
                    placeholder="طبقة الدخول"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Tech Stack Badges (comma separated)</label>
                <input
                  type="text"
                  value={(editingNode.tech || []).join(', ')}
                  onChange={(e) => setEditingNode({
                    ...editingNode,
                    tech: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="Next.js 14, TypeScript, HTTP/3"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Description (EN)</label>
                <textarea
                  rows={2}
                  value={editingNode.description_en || ''}
                  onChange={(e) => setEditingNode({ ...editingNode, description_en: e.target.value })}
                  placeholder="Node pipeline description..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Description (AR)</label>
                <textarea
                  rows={2}
                  value={editingNode.description_ar || ''}
                  onChange={(e) => setEditingNode({ ...editingNode, description_ar: e.target.value })}
                  placeholder="الوصف باللغة العربية..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Details Checklist EN (comma separated)</label>
                  <input
                    type="text"
                    value={(editingNode.details_en || []).join(', ')}
                    onChange={(e) => setEditingNode({
                      ...editingNode,
                      details_en: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Token verification, Payloads, Preprocessing"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Details Checklist AR (comma separated)</label>
                  <input
                    type="text"
                    value={(editingNode.details_ar || []).join(', ')}
                    onChange={(e) => setEditingNode({
                      ...editingNode,
                      details_ar: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="تحقق آمن, تقطيع البيانات, معالجة النصوص"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editingNode.enabled !== false}
                    onChange={(e) => setEditingNode({ ...editingNode, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Enabled (Visible in Hero Visual)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingNode(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                >
                  Save Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Nodes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((node, idx) => (
          <div
            key={node.id}
            className={`p-5 rounded-2xl bg-white dark:bg-zinc-900 border transition-all flex flex-col justify-between space-y-3 ${
              node.enabled ? 'border-zinc-200 dark:border-zinc-800' : 'border-zinc-200 dark:border-zinc-800 opacity-60 bg-zinc-50 dark:bg-zinc-950'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">
                  0{idx + 1} // {node.category_en}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {node.latency}
                </span>
              </div>

              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {node.title_en}
              </h3>

              <p className="text-xs text-zinc-500 line-clamp-2">
                {node.description_en}
              </p>

              <div className="flex flex-wrap gap-1 pt-1">
                {(node.tech || []).map((t, ti) => (
                  <span key={ti} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${node.enabled ? 'bg-emerald-500/10 text-emerald-500 font-semibold' : 'bg-zinc-100 text-zinc-400'}`}>
                {node.enabled ? 'Enabled' : 'Disabled'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-30 cursor-pointer"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === sorted.length - 1}
                  className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-30 cursor-pointer"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleToggleEnabled(node.id)}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    node.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}
                  title={node.enabled ? 'Disable' : 'Enable'}
                >
                  {node.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setIsNew(false);
                    setEditingNode(node);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(node.id)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-colors cursor-pointer"
                  title="Delete"
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
