import React, { useState } from 'react';
import {
  ArrowRight,
  Github,
  ExternalLink,
  CheckCircle2,
  Search,
  X
} from 'lucide-react';
import { Project } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getProjectImage } from '../lib/content';

interface ProjectsPageProps {
  projects: Project[];
  navigate: (route: string) => void;
  openAdvisorModal: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  navigate,
  openAdvisorModal
}) => {
  const { isArabic, t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');

  const allLabel = isArabic ? 'الكل' : 'All';
  const dynamicCategories = Array.from(
    new Set(projects.map(p => p.category).filter(Boolean))
  );
  const categories = [allLabel, ...dynamicCategories];

  const filteredProjects = projects.filter(p => {
    let matchesCat = true;
    if (selectedCategory !== 'All' && selectedCategory !== 'الكل' && selectedCategory !== allLabel) {
      matchesCat = p.category.toLowerCase() === selectedCategory.toLowerCase() || p.category.toLowerCase().includes(selectedCategory.toLowerCase());
    }

    const matchesSearch = searchFilter === '' ||
      p.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.short_description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.technologies?.some(t => t.toLowerCase().includes(searchFilter.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  return (
    <div id="projects-page" className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 font-sans text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="space-y-3 max-w-3xl">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
          {t('projects.badge', 'PORTFOLIO & CASE STUDIES')}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t('projects.title', 'Engineered Systems & Case Studies')}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          {isArabic
            ? 'استعرض دراسات الحالة الهندسية والأنظمة البرمجية المكتملة عبر الذكاء الاصطناعي التوليدي، قواعد البيانات الشعاعية، وتطبيقات الويب السحابية.'
            : 'Deep dives into real-world production architectures, vector search implementations, computer vision pipelines, and high-concurrency web platforms.'}
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {categories.map((cat, idx) => {
            const isAll = cat === 'All' || cat === 'الكل';
            const isSelected = isAll ? (selectedCategory === 'All' || selectedCategory === 'الكل') : selectedCategory === cat;
            return (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
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

        {/* Text Filter Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={isArabic ? 'ابحث بالكلمات المفتاحية...' : 'Search stack, name, keyword...'}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-sm">{isArabic ? 'لا توجد مشاريع تطابق البحث الحالي.' : 'No case studies match the selected filters.'}</p>
          <button
            onClick={() => { setSelectedCategory('All'); setSearchFilter(''); }}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {isArabic ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Cover Image */}
                <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  {getProjectImage(proj) && (
                    <img
                      src={getProjectImage(proj)}
                      alt={proj.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-slate-900/90 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-800">
                      {proj.category}
                    </span>
                    {proj.featured && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white">
                        FEATURED
                      </span>
                    )}
                  </div>

                  {proj.results && proj.results.length > 0 && (
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white shadow-md">
                      {proj.results[0]}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {proj.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {proj.short_description}
                  </p>

                  {/* Highlights/Result bullet */}
                  {proj.results && proj.results.length > 0 && (
                    <div className="pt-1 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="line-clamp-1">{proj.results[0]}</span>
                    </div>
                  )}

                  {/* Tech stack */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {proj.technologies?.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-6 pt-0 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-850 mt-4">
                <button
                  onClick={() => navigate(`/projects/${proj.slug}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  <span>{t('projects.view_case_study', 'Read Case Study')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  {proj.live_url && (
                    <a
                      href={proj.live_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title="Live Preview"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {proj.github_url && (
                    <a
                      href={proj.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title="Source Code"
                    >
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
