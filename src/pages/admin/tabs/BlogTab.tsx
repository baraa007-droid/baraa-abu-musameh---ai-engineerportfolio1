import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Eye,
  Loader2
} from 'lucide-react';
import { BlogPost } from '../../../types';
import { api } from '../../../lib/api';
import { slugify, errorText } from '../../../lib/content';

interface BlogTabProps {
  blogPosts: BlogPost[];
  onCreatePost: (post: Partial<BlogPost>) => void;
  onUpdatePost: (id: string, post: Partial<BlogPost>) => void;
  onDeletePost: (id: string) => void;
}

export const BlogTab: React.FC<BlogTabProps> = ({
  blogPosts,
  onCreatePost,
  onUpdatePost,
  onDeletePost
}) => {
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);
  const [aiActionLoading, setAiActionLoading] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  const startCreate = () => {
    setIsNew(true);
    setEditingPost({
      title: '',
      slug: '',
      category: 'AI & Engineering',
      excerpt: '',
      content: '# Introduction\n\nWrite your technical article here...',
      tags: ['AI', 'Full Stack', 'Architecture'],
      read_time: '5 min read',
      published: true,
      cover_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
    });
  };

  // UI action ids → server blog-assistant actions (server accepts: titles|outline|intro|seo|faq|summary|improve)
  const AI_ACTION_MAP = {
    generate_intro: 'intro',
    suggest_outline: 'outline',
    polish_text: 'improve',
    seo_metadata: 'seo',
    suggest_titles: 'titles'
  } as const;

  const handleAiAssist = async (action: keyof typeof AI_ACTION_MAP) => {
    if (!editingPost) return;
    setAiActionLoading(action);
    setAiFeedback(null);

    try {
      const res = await api.assistBlogCreation({
        action: AI_ACTION_MAP[action],
        topic: editingPost.title || 'Full-Stack Web & AI Engineering',
        currentContent: editingPost.content || ''
      });

      const generated = res.content || res.result || '';
      if (action === 'generate_intro') {
        setEditingPost({ ...editingPost, content: `${generated}\n\n${editingPost.content || ''}` });
        setAiFeedback('AI Introduction generated & prepended to article.');
      } else if (action === 'polish_text') {
        setEditingPost({ ...editingPost, content: generated });
        setAiFeedback('Article text polished for technical precision and readability.');
      } else if (action === 'suggest_titles' || action === 'seo_metadata') {
        // Suggestions are shown for review only, never inserted into the article automatically.
        setAiFeedback(`${action === 'seo_metadata' ? 'SEO suggestions' : 'Suggested Titles'}:\n${generated}`);
      } else {
        setEditingPost({ ...editingPost, content: `${editingPost.content || ''}\n\n${generated}` });
        setAiFeedback(`Generated section added.`);
      }
    } catch (e) {
      setAiFeedback(`AI error: ${errorText(e) || 'Failed to generate assistance.'}`);
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingPost?.title) return;

      const payload = {
        ...editingPost,
        slug: editingPost.slug || slugify(editingPost.title, 'post'),
        published_at: editingPost.published_at || new Date().toISOString().split('T')[0]
      };

      if (isNew) {
        await onCreatePost(payload);
      } else if (editingPost.id) {
        await onUpdatePost(editingPost.id, payload);
      }

      setEditingPost(null);
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
            <BookOpen className="w-5 h-5 text-amber-500" />
            Engineering Blog & Technical Insights CMS
          </h2>
          <p className="text-xs text-zinc-500">
            Publish technical deep dives with live Markdown support and Gemini-powered editorial co-pilot.
          </p>
        </div>

        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Article</span>
        </button>
      </div>

      {/* Editor Modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-4xl w-full max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {isNew ? 'Write New Technical Post' : `Edit "${editingPost.title}"`}
              </h3>
              <button
                onClick={() => setEditingPost(null)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕ Close
              </button>
            </div>

            {/* AI Editorial Co-Pilot Bar */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Gemini Editorial Co-Pilot
                </span>
                {aiActionLoading && (
                  <span className="text-xs font-mono text-amber-500 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {([
                  { action: 'generate_intro', label: 'Draft Intro' },
                  { action: 'suggest_outline', label: 'Generate Outline' },
                  { action: 'polish_text', label: 'Polish & Refactor Markdown' },
                  { action: 'seo_metadata', label: 'Generate SEO Meta' }
                ] as const).map(btn => (
                  <button
                    key={btn.action}
                    type="button"
                    disabled={!!aiActionLoading}
                    onClick={() => handleAiAssist(btn.action)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-amber-500/20 text-zinc-700 dark:text-zinc-300 hover:text-amber-500 font-mono text-[11px] disabled:opacity-40"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {aiFeedback && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-amber-500/20 text-[11px] text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap">
                  {aiFeedback}
                </div>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Article Title</label>
                  <input
                    type="text"
                    required
                    value={editingPost.title || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                    placeholder="e.g. Building Resilient RAG Architectures with Gemini"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Slug</label>
                  <input
                    type="text"
                    value={editingPost.slug || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                    placeholder="auto-generated-slug"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Category</label>
                  <input
                    type="text"
                    value={editingPost.category || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                    placeholder="AI / Architecture / Web"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Read Time</label>
                  <input
                    type="text"
                    value={editingPost.read_time || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, read_time: e.target.value })}
                    placeholder="5 min read"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Cover Image URL</label>
                  <input
                    type="url"
                    value={editingPost.cover_image || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, cover_image: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Excerpt / Meta Description</label>
                <input
                  type="text"
                  value={editingPost.excerpt || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                  placeholder="Short preview for social and cards..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Article Content (Markdown)</label>
                <textarea
                  rows={12}
                  value={editingPost.content || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                  placeholder="# Heading\n\nContent..."
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Tags (comma separated)</label>
                <input
                  type="text"
                  value={(editingPost.tags || []).join(', ')}
                  onChange={(e) => setEditingPost({
                    ...editingPost,
                    tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="AI, RAG, TypeScript, React"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                />
              </div>

              {/* SEO Section */}
              <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">SEO Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300">SEO Title <span className="font-normal text-zinc-400">(max 70)</span></label>
                    <input type="text" maxLength={70}
                      value={editingPost.seo_title || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, seo_title: e.target.value })}
                      placeholder="Custom title for search engines..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300">OG Image URL</label>
                    <input type="url"
                      value={editingPost.og_image || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, og_image: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">SEO Description <span className="font-normal text-zinc-400">(max 160)</span></label>
                  <textarea rows={2} maxLength={160}
                    value={editingPost.seo_description || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, seo_description: e.target.value })}
                    placeholder="Description for search engines and social sharing..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editingPost.published !== false}
                    onChange={(e) => setEditingPost({ ...editingPost, published: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Published & Publicly Accessible</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
                >
                  Save Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blog Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {blogPosts.map((post) => (
          <div
            key={post.id}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {post.category}
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {post.read_time}
                </span>
              </div>

              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {post.title}
              </h3>

              <p className="text-xs text-zinc-500 line-clamp-2">
                {post.excerpt}
              </p>

              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 pt-1">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {post.views || 0} views
                </span>
                <span>• {post.published_at}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${post.published ? 'bg-emerald-500/10 text-emerald-500 font-semibold' : 'bg-zinc-100 text-zinc-400'}`}>
                {post.published ? 'Published' : 'Draft'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsNew(false);
                    setEditingPost(post);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete article "${post.title}"?`)) {
                      onDeletePost(post.id);
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
