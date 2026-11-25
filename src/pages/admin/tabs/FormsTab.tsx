import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  Settings, ChevronUp, ChevronDown, X, Save, Shield,
  AlertTriangle, Eye, EyeOff, Loader2, RefreshCw
} from 'lucide-react';
import { FormConfig, FormField } from '../../../types';
import { api } from '../../../lib/api';
import { errorText } from '../../../lib/content';

// ─── Supported field types ───────────────────────────────────────────────────
const FIELD_TYPES = [
  'text', 'email', 'phone', 'number', 'textarea',
  'select', 'radio', 'checkbox', 'url', 'date'
] as const;
type FieldType = typeof FIELD_TYPES[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Field keys must match the server rule /^[a-z0-9_]+$/; labels in Arabic produce no ASCII,
// so a unique generated key is used instead of an empty (invalid) one.
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `field_${Date.now().toString(36)}`;

const needsOptions = (type: string) =>
  ['select', 'radio', 'checkbox'].includes(type);

// ─── FieldEditorModal ────────────────────────────────────────────────────────
interface FieldEditorModalProps {
  field: Partial<FormField> | null;
  isNew: boolean;
  existingKeys: string[];
  onSave: (field: FormField) => void;
  onClose: () => void;
}

const FieldEditorModal: React.FC<FieldEditorModalProps> = ({
  field,
  isNew,
  existingKeys,
  onSave,
  onClose
}) => {
  const [draft, setDraft] = useState<Partial<FormField>>(field ?? {});
  const [optionsText, setOptionsText] = useState(
    (field?.options ?? []).join('\n')
  );
  const [error, setError] = useState('');

  if (!field && !isNew) return null;

  const isSystemField = draft.system === true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!draft.label?.trim()) {
      setError('Label is required.');
      return;
    }
    if (!draft.key?.trim()) {
      setError('Key is required.');
      return;
    }
    if (isNew && existingKeys.includes(draft.key)) {
      setError(`Key "${draft.key}" is already used by another field.`);
      return;
    }
    if (!draft.type) {
      setError('Type is required.');
      return;
    }
    const options = needsOptions(draft.type)
      ? optionsText
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;

    if (needsOptions(draft.type) && (!options || options.length < 2)) {
      setError('Select/Radio/Checkbox fields need at least 2 options (one per line).');
      return;
    }

    onSave({
      key: draft.key!,
      label: draft.label!,
      type: draft.type!,
      placeholder: draft.placeholder ?? '',
      required: draft.required ?? false,
      enabled: draft.enabled ?? true,
      order: draft.order ?? 0,
      system: draft.system ?? false,
      options
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            {isSystemField && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Shield className="w-3 h-3" /> SYSTEM
              </span>
            )}
            {isNew ? 'Add Field' : `Edit "${draft.label}"`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSystemField && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              This is a system field. Its <strong>key</strong> and <strong>type</strong> are protected and cannot be changed. You may edit the label, placeholder, and required status.
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Label */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">
              Label <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={draft.label ?? ''}
              onChange={(e) => {
                const label = e.target.value;
                setDraft((d) => ({
                  ...d,
                  label,
                  ...(isNew && !d.key ? { key: slugify(label) } : {})
                }));
              }}
              placeholder="e.g. Your Name"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Key */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">
              Field Key <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSystemField && !isNew}
              value={draft.key ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, key: slugify(e.target.value) }))
              }
              placeholder="e.g. full_name"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-zinc-400">
              Unique identifier used in form submissions. Auto-generated from label.
            </p>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">
              Type <span className="text-rose-500">*</span>
            </label>
            <select
              required
              disabled={isSystemField && !isNew}
              value={draft.type ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, type: e.target.value as FieldType }))
              }
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select type --</option>
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Placeholder */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">
              Placeholder
            </label>
            <input
              type="text"
              value={draft.placeholder ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, placeholder: e.target.value }))
              }
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Options (for select/radio/checkbox) */}
          {draft.type && needsOptions(draft.type) && (
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">
                Options <span className="text-rose-500">*</span>
                <span className="font-normal text-zinc-400 ml-1">(one per line)</span>
              </label>
              <textarea
                rows={4}
                required
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder={'Option A\nOption B\nOption C'}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Required / Enabled toggles */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.required ?? false}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, required: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">
                Required
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.enabled ?? true}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, enabled: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">
                Enabled
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Field
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── FormEditorModal ─────────────────────────────────────────────────────────
interface FormEditorModalProps {
  form: Partial<FormConfig> | null;
  isNew: boolean;
  onSave: (data: Partial<FormConfig>) => void;
  onClose: () => void;
}

const FormEditorModal: React.FC<FormEditorModalProps> = ({
  form,
  isNew,
  onSave,
  onClose
}) => {
  const [draft, setDraft] = useState<Partial<FormConfig>>(form ?? { active: true });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!draft.name?.trim()) {
      setError('Name is required.');
      return;
    }
    if (!draft.slug?.trim()) {
      setError('Slug is required.');
      return;
    }
    onSave(draft);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            {isNew ? 'Create Form' : `Edit "${form?.name}"`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={draft.name ?? ''}
              onChange={(e) => {
                const name = e.target.value;
                setDraft((d) => ({
                  ...d,
                  name,
                  ...(isNew && !d.slug ? { slug: slugify(name) } : {})
                }));
              }}
              placeholder="e.g. Contact Me"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">
              Slug <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!isNew}
              value={draft.slug ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, slug: slugify(e.target.value) }))
              }
              placeholder="e.g. contact"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {!isNew && (
              <p className="text-zinc-400">Slug cannot be changed after creation.</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <textarea
              rows={2}
              value={draft.description ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, description: e.target.value }))
              }
              placeholder="Optional description for this form"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.active ?? true}
              onChange={(e) =>
                setDraft((d) => ({ ...d, active: e.target.checked }))
              }
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">
              Active
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {isNew ? 'Create Form' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── FieldManagerPanel ───────────────────────────────────────────────────────
interface FieldManagerPanelProps {
  form: FormConfig;
  onUpdate: (updatedForm: FormConfig) => void;
  onClose: () => void;
  notify: (msg: string) => void;
}

const FieldManagerPanel: React.FC<FieldManagerPanelProps> = ({
  form,
  onUpdate,
  onClose,
  notify
}) => {
  const [fields, setFields] = useState<FormField[]>(
    [...form.fields].sort((a, b) => a.order - b.order)
  );
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<{ field: Partial<FormField> | null; isNew: boolean }>({
    field: null,
    isNew: false
  });

  const persistFields = useCallback(
    async (updated: FormField[]) => {
      setSaving(true);
      try {
        const result = await api.updateForm(form.slug, { fields: updated });
        onUpdate(result);
        notify('Fields saved successfully.');
      } catch (err) {
        notify(`Error: ${errorText(err)}`);
      } finally {
        setSaving(false);
      }
    },
    [form.slug, onUpdate, notify]
  );

  const handleFieldSave = async (saved: FormField) => {
    let updated: FormField[];
    if (editingField.isNew) {
      const order =
        fields.length > 0 ? Math.max(...fields.map((f) => f.order)) + 1 : 0;
      updated = [...fields, { ...saved, order }];
    } else {
      updated = fields.map((f) => (f.key === saved.key ? { ...saved, order: f.order } : f));
    }
    setFields(updated);
    setEditingField({ field: null, isNew: false });
    await persistFields(updated);
  };

  const handleToggleEnabled = async (key: string) => {
    const updated = fields.map((f) =>
      f.key === key ? { ...f, enabled: !f.enabled } : f
    );
    setFields(updated);
    await persistFields(updated);
  };

  const handleToggleRequired = async (key: string) => {
    const updated = fields.map((f) =>
      f.key === key ? { ...f, required: !f.required } : f
    );
    setFields(updated);
    await persistFields(updated);
  };

  const handleDelete = async (key: string) => {
    const field = fields.find((f) => f.key === key);
    if (field?.system) {
      notify('System fields cannot be deleted.');
      return;
    }
    if (!confirm(`Delete field "${field?.label ?? key}"? This action cannot be undone.`)) {
      return;
    }
    const updated = fields.filter((f) => f.key !== key);
    // Re-assign orders sequentially
    const reordered = updated.map((f, i) => ({ ...f, order: i }));
    setFields(reordered);
    await persistFields(reordered);
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    [newFields[index], newFields[targetIndex]] = [
      newFields[targetIndex],
      newFields[index]
    ];
    // Re-assign order values
    const reordered = newFields.map((f, i) => ({ ...f, order: i }));
    setFields(reordered);
    await persistFields(reordered);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-3xl w-full space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 shrink-0">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-500" />
              Manage Fields — {form.name}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {fields.length} field{fields.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
            <button
              type="button"
              onClick={() =>
                setEditingField({
                  field: {
                    key: '',
                    label: '',
                    type: 'text',
                    required: false,
                    enabled: true,
                    order: fields.length,
                    system: false,
                    placeholder: '',
                    options: undefined
                  },
                  isNew: true
                })
              }
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Field editor modal (nested) */}
        {editingField.field !== null && (
          <FieldEditorModal
            field={editingField.field}
            isNew={editingField.isNew}
            existingKeys={fields
              .filter((f) => editingField.isNew || f.key !== editingField.field?.key)
              .map((f) => f.key)}
            onSave={handleFieldSave}
            onClose={() => setEditingField({ field: null, isNew: false })}
          />
        )}

        {/* Fields list */}
        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {fields.length === 0 && (
            <div className="text-center py-10 text-zinc-400 text-xs">
              No fields yet. Click "Add Field" to begin.
            </div>
          )}

          {fields.map((field, idx) => (
            <div
              key={field.key}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                field.enabled
                  ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-900 opacity-60'
              }`}
            >
              {/* Order controls */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0 || saving}
                  onClick={() => handleMove(idx, 'up')}
                  className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                </button>
                <button
                  type="button"
                  disabled={idx === fields.length - 1 || saving}
                  onClick={() => handleMove(idx, 'down')}
                  className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>

              {/* Field info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    {field.label}
                    {field.required && (
                      <span className="text-rose-500 ml-0.5">*</span>
                    )}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                    {field.key}
                  </span>
                  <span className="font-mono text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                    {field.type}
                  </span>
                  {field.system && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" /> SYSTEM
                    </span>
                  )}
                  {!field.enabled && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                      DISABLED
                    </span>
                  )}
                </div>
                {field.placeholder && (
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    placeholder: "{field.placeholder}"
                  </p>
                )}
                {field.options && field.options.length > 0 && (
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    options: {field.options.join(', ')}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Required toggle */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleToggleRequired(field.key)}
                  title={field.required ? 'Click to make optional' : 'Click to make required'}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    field.required
                      ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {field.required ? 'REQ' : 'OPT'}
                </button>

                {/* Enabled toggle */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleToggleEnabled(field.key)}
                  title={field.enabled ? 'Disable field' : 'Enable field'}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  {field.enabled ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Edit */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditingField({ field: { ...field }, isNew: false })}
                  title="Edit field"
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Delete — only for non-system fields */}
                {!field.system && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDelete(field.key)}
                    title="Delete field"
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── FormsTab ────────────────────────────────────────────────────────────────
export const FormsTab: React.FC = () => {
  const [forms, setForms] = useState<FormConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Modals
  const [editingForm, setEditingForm] = useState<{
    form: Partial<FormConfig> | null;
    isNew: boolean;
  }>({ form: null, isNew: false });
  const [managingForm, setManagingForm] = useState<FormConfig | null>(null);

  const notify = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const loadForms = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getForms();
      const ALLOWED = ['contact', 'lead'];
      const filtered = Array.isArray(data) ? data.filter(f => ALLOWED.includes(f.slug)) : [];
      setForms(filtered);
    } catch (err) {
      setError(errorText(err) || 'Failed to load forms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleUpdateForm = async (data: Partial<FormConfig>) => {
    if (!editingForm.form?.slug) return;
    try {
      const updated = await api.updateForm(editingForm.form.slug, data);
      setForms((prev) =>
        prev.map((f) => (f.slug === updated.slug ? updated : f))
      );
      setEditingForm({ form: null, isNew: false });
      notify(`Form "${updated.name}" updated.`);
    } catch (err) {
      notify(`Error: ${errorText(err)}`);
    }
  };

  const handleToggleActive = async (form: FormConfig) => {
    try {
      const updated = await api.updateForm(form.slug, { active: !form.active });
      setForms((prev) =>
        prev.map((f) => (f.slug === form.slug ? updated : f))
      );
      notify(`Form "${form.name}" ${updated.active ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      notify(`Error: ${errorText(err)}`);
    }
  };

  const handleFormFieldsUpdate = (updatedForm: FormConfig) => {
    setForms((prev) =>
      prev.map((f) => (f.slug === updatedForm.slug ? updatedForm : f))
    );
    if (managingForm?.slug === updatedForm.slug) {
      setManagingForm(updatedForm);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Forms Management
          </h2>
          <p className="text-xs text-zinc-500">
            Manage fields, required states, and activation for core portfolio forms (Contact Me & Start Your Project).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadForms}
            title="Refresh"
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
          <span>✓</span>
          <span>{notice}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={loadForms}
            className="ml-auto underline font-bold hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-zinc-400 gap-2 text-xs">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading system forms...
        </div>
      )}

      {/* Forms table */}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left px-4 py-3 font-bold text-zinc-500 uppercase tracking-wider">
                  Form Name
                </th>
                <th className="text-left px-4 py-3 font-bold text-zinc-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="text-center px-4 py-3 font-bold text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-4 py-3 font-bold text-zinc-500 uppercase tracking-wider">
                  Configured Fields
                </th>
                <th className="text-right px-4 py-3 font-bold text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {forms.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10 text-zinc-400 italic"
                  >
                    No system forms loaded.
                  </td>
                </tr>
              )}
              {forms.map((form) => (
                <tr
                  key={form.slug}
                  className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      {form.name}
                    </div>
                    {form.description && (
                      <div className="text-zinc-400 text-[10px] mt-0.5 truncate max-w-xs">
                        {form.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                      {form.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                        form.active
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${form.active ? 'bg-emerald-500' : 'bg-zinc-400'}`}
                      />
                      {form.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">
                      {(form.fields ?? []).length}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Manage Fields */}
                      <button
                        onClick={() => setManagingForm(form)}
                        title="Manage Fields"
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Manage Fields
                      </button>

                      {/* Edit Form Info */}
                      <button
                        onClick={() =>
                          setEditingForm({ form: { ...form }, isNew: false })
                        }
                        title="Edit form info"
                        className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Enable / Disable */}
                      <button
                        onClick={() => handleToggleActive(form)}
                        title={form.active ? 'Disable form' : 'Enable form'}
                        className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                      >
                        {form.active ? (
                          <ToggleRight className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Editor Modal */}
      {editingForm.form !== null && (
        <FormEditorModal
          form={editingForm.form}
          isNew={false}
          onSave={handleUpdateForm}
          onClose={() => setEditingForm({ form: null, isNew: false })}
        />
      )}

      {/* Field Manager Panel */}
      {managingForm !== null && (
        <FieldManagerPanel
          form={managingForm}
          onUpdate={handleFormFieldsUpdate}
          onClose={() => setManagingForm(null)}
          notify={notify}
        />
      )}
    </div>
  );
};
