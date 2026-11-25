import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  Sparkles,
  Check
} from 'lucide-react';
import Markdown from 'react-markdown';
import { api } from '../lib/api';
import { BlogPost, SiteSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useSeoMeta } from '../hooks/useSeoMeta';

interface BlogPostPageProps {
  slug: string;
  navigate: (route: string) => void;
  openAIAssistantWithQuery: (q: string) => void;
  settings?: SiteSettings | null;
}

export const BlogPostPage: React.FC<BlogPostPageProps> = ({
  slug,
  navigate,
  openAIAssistantWithQuery,
  settings
}) => {
  const { isArabic, t } = useLanguage();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // SEO – updates <head> meta tags on load and SPA navigation
  useSeoMeta({
    entitySeoTitle: post?.seo_title,
    entityTitle: post?.title,
    entitySeoDescription: post?.seo_description,
    entityDescription: post?.excerpt,
    entityOgImage: post?.og_image,
    settings,
    canonicalPath: post ? `/blog/${post.slug}` : `/blog/${slug}`,
  });

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const data = await api.getBlogPost(slug);
        setPost(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">{isArabic ? 'جاري تحميل المقال الهندسي...' : 'Loading article content...'}</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-32 pb-20 text-center space-y-4 max-w-md mx-auto px-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Article Not Found</h2>
        <p className="text-xs text-slate-500">The requested article could not be retrieved from the index.</p>
        <button
          onClick={() => navigate('/blog')}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs cursor-pointer"
        >
          Return to Blog
        </button>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div id="blog-post-page" className="pt-24 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 font-sans text-slate-700 dark:text-slate-300">
      {/* Back button */}
      <button
        onClick={() => navigate('/blog')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{isArabic ? 'العودة لقائمة المقالات' : 'Back to Publications'}</span>
      </button>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">
            {post.category}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {post.published_at} • {post.read_time}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          {post.title}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          {post.excerpt}
        </p>

        {/* Author & Share Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              BM
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                {post.author_name || 'Baraa Abu Musameh'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                AI & Systems Engineer
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Article</span>
                </>
              )}
            </button>

            <button
              onClick={() => openAIAssistantWithQuery(`Can you summarize the core technical arguments in "${post.title}"?`)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      {post.cover_image && (
        <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video shadow-sm">
          <img
            src={post.cover_image}
            alt={post.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Article Body */}
      <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed space-y-4">
          <Markdown>{post.content}</Markdown>
        </div>

        {/* Tags */}
        <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Tags:</span>
          {(post.tags || []).map((t) => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
