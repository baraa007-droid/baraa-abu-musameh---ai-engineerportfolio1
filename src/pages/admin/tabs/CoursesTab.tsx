import React, { useState } from 'react';
import { BookOpen, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { Course } from '../../../types';

interface CoursesTabProps {
  courses: Course[];
  onUpdateCourses: (courses: Course[]) => void;
}

const emptyCourse = (): Course => ({
  id: `course-${Date.now()}`,
  title: '',
  provider: '',
  description: '',
  completion_date: '',
  url: '',
  certificate_url: '',
  image_url: '',
  order: 99,
  published: true,
  created_at: new Date().toISOString().split('T')[0]
});

export const CoursesTab: React.FC<CoursesTabProps> = ({
  courses,
  onUpdateCourses
}) => {
  const [items, setItems] = useState<Course[]>(courses);
  const [editing, setEditing] = useState<Course | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.title.trim() || !editing?.provider.trim()) return;
    const exists = items.some(i => i.id === editing.id);
    const updated = exists
      ? items.map(i => (i.id === editing.id ? editing : i))
      : [...items, editing];
    updated.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    try {
      await onUpdateCourses(updated);
    } catch {
      return; // not saved: keep the form open and the list unchanged (the dashboard shows the error)
    }
    setItems(updated);
    setEditing(null);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this course entry?')) return;
    const updated = items.filter(i => i.id !== id);
    try {
      await onUpdateCourses(updated);
    } catch {
      return; // not saved: list unchanged (the dashboard shows the error)
    }
    setItems(updated);
  };

  const togglePublished = async (id: string) => {
    const updated = items.map(i => (i.id === id ? { ...i, published: i.published === false } : i));
    try {
      await onUpdateCourses(updated);
    } catch {
      return; // not saved: list unchanged (the dashboard shows the error)
    }
    setItems(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            Courses & Continuous Learning
          </h2>
          <p className="text-xs text-zinc-500">
            Manage courses, bootcamps, workshops, and training programs shown on the About page.
          </p>
        </div>
        <button
          onClick={() => setEditing(emptyCourse())}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.length === 0 && (
          <p className="text-xs text-zinc-400 col-span-full p-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center">
            No courses yet. Click "Add Course" to create your first entry.
          </p>
        )}
        {[...items].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)).map((course) => (
          <div
            key={course.id}
            className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border ${
              course.published === false ? 'border-dashed opacity-60' : ''
            } border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-3`}
          >
            <div className="min-w-0">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                {course.title} {!course.published && <span className="text-[10px] text-zinc-400 font-mono">(hidden)</span>}
              </h3>
              <p className="text-[11px] text-amber-500">{course.provider} • {course.completion_date || 'In progress'}</p>
              {course.description && (
                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{course.description}</p>
              )}
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-500">
                order: {course.order ?? 99}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => togglePublished(course.id)}
                title={course.published === false ? 'Publish' : 'Unpublish'}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                  course.published === false
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                {course.published === false ? 'Show' : 'Hide'}
              </button>
              {course.url && (
                <a href={course.url} target="_blank" rel="noreferrer" className="p-1.5 text-zinc-400 hover:text-zinc-100">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={() => setEditing(course)}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => remove(course.id)}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {items.some(i => i.id === editing.id) ? 'Edit Course' : 'Add Course'}
            </h3>
            <form onSubmit={save} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Title *</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  placeholder="e.g. Advanced RAG Systems"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Provider *</label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={editing.provider}
                    onChange={(e) => setEditing({ ...editing, provider: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    placeholder="e.g. DeepLearning.AI"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Completion Date</label>
                  <input
                    type="month"
                    value={editing.completion_date || ''}
                    onChange={(e) => setEditing({ ...editing, completion_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Description</label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Course URL</label>
                  <input
                    type="url"
                    value={editing.url || ''}
                    onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Certificate URL</label>
                  <input
                    type="url"
                    value={editing.certificate_url || ''}
                    onChange={(e) => setEditing({ ...editing, certificate_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Image URL</label>
                  <input
                    type="url"
                    value={editing.image_url || ''}
                    onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editing.published}
                    onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  Published (visible on site)
                </label>
                <div className="flex items-center gap-2">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Order</label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={editing.order}
                    onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value, 10) || 0 })}
                    className="w-20 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold">
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
