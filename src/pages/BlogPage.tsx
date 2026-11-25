import React, { useState } from 'react';
import {
  ArrowRight,
  Search,
  Clock,
  X
} from 'lucide-react';
import { BlogPost } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface BlogPageProps {
  blogPosts: BlogPost[];
  navigate: (route: string) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ blogPosts, navigate }) => {
  const { isArabic, t } = useLanguage();
  const [selectedCat, setSelectedCat] = useState('All');
  const [search, setSearch] = useState('');

  const allLabel = isArabic ? 'الكل' : 'All';
  const dynamicCategories = Array.from(
    new Set(blogPosts.map(p => p.category).filter(Boolean))
  );
  const categories = [allLabel, ...dynamicCategories];

  const filteredPosts = blogPosts.filter(p => {
    let matchesCat = true;
    if (selectedCat !== 'All' && selectedCat !== 'الكل' && selectedCat !== allLabel) {
      matchesCat = p.category.toLowerCase() === selectedCat.toLowerCase() || p.category.toLowerCase().includes(selectedCat.toLowerCase());
    }

    const matchesSearch = search === '' ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  return (
    <div id="blog-page" className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 font-sans text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="space-y-3 max-w-3xl">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
          {t('blog.badge', 'PUBLICATIONS & LOGS')}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t('blog.title', 'Engineering Logs & Technical Research')}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          {isArabic
            ? 'مقالات وبحوث هندسية متعمقة حول معمارية الـ RAG، خوارزميات البحث الشعاعي، استراتيجيات النشر السحابي، وتحسين أداء الويب.'
            : 'Deep dives into zero-latency streaming pipelines, vector retrieval indexing, multi-agent frameworks, and scalable web architectures.'}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {categories.map((cat, idx) => {
            const isAll = cat === 'All' || cat === 'الكل';
            const isSelected = isAll ? (selectedCat === 'All' || selectedCat === 'الكل') : selectedCat === cat;
            return (
              <button
                key={idx}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isArabic ? 'ابحث في المقالات...' : 'Search articles...'}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Articles Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-sm">{isArabic ? 'لا توجد مقالات تطابق هذا البحث.' : 'No articles match your search criteria.'}</p>
          <button
            onClick={() => { setSelectedCat('All'); setSearch(''); }}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {isArabic ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => navigate(`/blog/${post.slug}`)}
              className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 hover:shadow-md cursor-pointer transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 dark:bg-slate-900/90 text-blue-600 dark:text-blue-400">
                    {post.category}
                  </span>
                </div>

                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{post.published_at}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      {post.read_time}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-850 mt-2">
                <div className="flex flex-wrap gap-1">
                  {(post.tags || []).slice(0, 2).map((t) => (
                    <span key={t} className="text-[10px] text-slate-400">
                      #{t}
                    </span>
                  ))}
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:underline">
                  <span>{t('blog.read_article', 'Read Article')}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
