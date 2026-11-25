import React, { useState } from 'react';
import {
  Cpu,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Clock
} from 'lucide-react';
import { Service } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ServicesPageProps {
  services: Service[];
  navigate: (route: string) => void;
  openAdvisorModal: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({
  services,
  navigate,
  openAdvisorModal
}) => {
  const { isArabic, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('All');

  const allLabel = isArabic ? 'الكل' : 'All';
  const dynamicCategories = Array.from(
    new Set(services.map(s => s.category).filter(Boolean))
  );
  const categories = [allLabel, ...dynamicCategories];

  const filteredServices = activeCategory === 'All' || activeCategory === 'الكل' || activeCategory === allLabel
    ? services
    : services.filter(s => s.category.toLowerCase() === activeCategory.toLowerCase() || s.category.toLowerCase().includes(activeCategory.toLowerCase()));

  return (
    <div id="services-page" className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 font-sans text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
            {t('services.badge', 'SERVICES & PACKAGES')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('services.title', 'Engineering & Advisory Services')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            {isArabic
              ? 'خدمات برمجية دقيقة بمراحل تسليم واضحة، التزام صارم بالأمان والجودة، وخبرة عالية في الذكاء الاصطناعي وهندسة الويب.'
              : 'Fixed-scope and retainer engineering packages tailored for founders, technical leaders, and enterprises scaling their AI capabilities.'}
          </p>
        </div>

        {/* AI Advisor Callout */}
        <button
          onClick={openAdvisorModal}
          className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{isArabic ? 'مستشار تقدير تكلفة المشروع' : 'Instant AI Scoping Tool'}</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit shadow-xs">
        {categories.map((cat, idx) => {
          const isAll = cat === 'All' || cat === 'الكل';
          const isSelected = isAll ? (activeCategory === 'All' || activeCategory === 'الكل') : activeCategory === cat;
          return (
            <button
              key={idx}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((srv) => (
          <div
            key={srv.id}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 hover:shadow-md transition-all flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Starting at</span>
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                    {srv.currency ? `${srv.currency} ` : ''}{srv.starting_price}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  {srv.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {srv.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {srv.short_description}
                </p>
              </div>

              {/* Key Deliverables Checklist */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-900 dark:text-white block">
                  {isArabic ? 'المخرجات الأساسية:' : 'Included Deliverables:'}
                </span>
                {(srv.deliverables || []).slice(0, 3).map((item, fi) => (
                  <div key={fi} className="text-slate-700 dark:text-slate-300 flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{srv.timeline}</span>
              </span>

              <button
                onClick={() => navigate(`/services/${srv.slug}`)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isArabic ? 'تفاصيل الخدمة' : 'View Service'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
