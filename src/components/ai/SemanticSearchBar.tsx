import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ArrowRight,
  Layers,
  Cpu,
  Loader2,
  X
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Project, Service, BlogPost } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface SemanticSearchBarProps {
  navigate: (route: string) => void;
  openAIAssistantWithQuery?: (query: string) => void;
}

export const SemanticSearchBar: React.FC<SemanticSearchBarProps> = ({
  navigate,
  openAIAssistantWithQuery
}) => {
  const { isArabic } = useLanguage();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    projects: Project[];
    services: Service[];
    blogPosts: BlogPost[];
    aiSummary: string;
  } | null>(null);

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery || query).trim();
    if (!q) return;

    setIsLoading(true);
    try {
      const data = await api.semanticSearch(q);
      setResults({
        projects: Array.isArray(data?.projects) ? data.projects : [],
        services: Array.isArray(data?.services) ? data.services : [],
        blogPosts: Array.isArray(data?.blogPosts) ? data.blogPosts : [],
        aiSummary: typeof data?.aiSummary === 'string' ? data.aiSummary : ''
      });
    } catch (e) {
      console.error(e);
      const message = e instanceof ApiError && e.status === 429
        ? (isArabic ? 'عدد كبير من عمليات البحث. حاول مجددًا بعد دقيقة.' : 'Too many searches. Please try again in a minute.')
        : (isArabic ? 'تعذّر تنفيذ البحث الآن. حاول مرة أخرى.' : 'Search is unavailable right now. Please try again.');
      setResults({ projects: [], services: [], blogPosts: [], aiSummary: message });
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
  };

  const sampleQueries = isArabic ? [
    "مشاريع الذكاء الاصطناعي و RAG",
    "تطبيقات الويب الكاملة Next.js",
    "أنظمة الرؤية الحاسوبية",
    "خدمات بناء المواقع والمتاجر"
  ] : [
    "Enterprise RAG & pgvector",
    "Full-Stack Next.js SaaS",
    "Real-Time Vision Systems",
    "Agentic Workflows"
  ];

  return (
    <div id="semantic-search-section" className="w-full space-y-3">
      {/* Search Bar Input Container */}
      <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-sm transition-all">
        <div className="pl-3 pr-2 text-slate-400 dark:text-slate-500 flex items-center">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          id="semantic-search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          placeholder={isArabic ? "ابحث بالذكاء الاصطناعي (مثل: 'مشاريع الـ RAG'، 'تطبيقات الويب'، 'الأسعار')..." : "Semantic search (e.g. 'RAG with pgvector', 'Next.js SaaS', 'computer vision')..."}
          className="flex-1 bg-transparent py-2 px-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
        />

        {query && (
          <button
            onClick={clearSearch}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white mr-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          id="semantic-search-submit-button"
          onClick={() => handleSearch()}
          disabled={!query.trim() || isLoading}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isArabic ? 'بحث ذكي' : 'Search'}</span>
        </button>
      </div>

      {/* Suggested Quick Search Chips */}
      {!results && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] font-medium text-slate-500">
            {isArabic ? 'اقتراحات سريعة:' : 'Suggested topics:'}
          </span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-850 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            >
              {sq}
            </button>
          ))}
        </div>
      )}

      {/* Search Results Display Area */}
      {results && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm animate-in fade-in">
          {/* AI Semantic Summary Badge */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-950 dark:text-blue-100 space-y-1">
            <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isArabic ? 'ملخص البحث الذكي' : 'AI Semantic Assessment'}</span>
            </div>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300 text-xs">{results.aiSummary}</p>
          </div>

          {/* Project Matches */}
          {results.projects.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{isArabic ? 'المشاريع المطابقة' : 'Matching Case Studies'} ({results.projects.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800">
                          {proj.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {proj.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                        {proj.short_description}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/projects/${proj.slug}`)}
                      className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isArabic ? 'عرض تفاصيل المشروع' : 'View Case Study'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services Matches */}
          {results.services.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>{isArabic ? 'الخدمات المطابقة' : 'Matching Services'} ({results.services.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.services.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-900 dark:text-white">{srv.title}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-mono">{srv.currency ? `${srv.currency} ` : ''}{srv.starting_price}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                        {srv.short_description}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/services/${srv.slug}`)}
                      className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isArabic ? 'عرض تفاصيل الخدمة' : 'View Service'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
