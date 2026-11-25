import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { api } from '../lib/api';
import { Service, SiteSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useSeoMeta } from '../hooks/useSeoMeta';
import { savePrefill } from '../lib/storage';

interface ServiceDetailPageProps {
  slug: string;
  navigate: (route: string) => void;
  openAIAssistantWithQuery: (q: string) => void;
  settings?: SiteSettings | null;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
  slug,
  navigate,
  openAIAssistantWithQuery,
  settings
}) => {
  const { isArabic, t } = useLanguage();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // SEO – updates <head> meta tags on load and SPA navigation
  useSeoMeta({
    entitySeoTitle: service?.seo_title,
    entityTitle: service?.title,
    entitySeoDescription: service?.seo_description,
    entityDescription: service?.short_description,
    entityOgImage: service?.og_image,
    settings,
    canonicalPath: service ? `/services/${service.slug}` : `/services/${slug}`,
  });

  useEffect(() => {
    const fetchService = async () => {
      setLoading(true);
      try {
        const data = await api.getService(slug);
        setService(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">{isArabic ? 'جاري تحميل تفاصيل الخدمة...' : 'Loading service specifications...'}</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="pt-32 pb-20 text-center space-y-4 max-w-md mx-auto px-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Service Not Found</h2>
        <p className="text-xs text-slate-500">The requested service catalog item does not exist.</p>
        <button
          onClick={() => navigate('/services')}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs cursor-pointer"
        >
          Return to Services Catalogue
        </button>
      </div>
    );
  }

  const handleStartThisProject = () => {
    savePrefill({
      project_type: service.title,
      budget_range: service.starting_price,
      description: `I am interested in hiring Baraa for the "${service.title}" package.`,
      required_features: service.deliverables || [],
      source: `service:${service.slug}`
    });
    navigate('/start-project');
  };

  return (
    <div id="service-detail-page" className="pt-24 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 font-sans text-slate-700 dark:text-slate-300">
      {/* Back button */}
      <button
        onClick={() => navigate('/services')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{isArabic ? 'العودة لكتالوج الخدمات' : 'Back to Services Catalogue'}</span>
      </button>

      {/* Hero Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">
            {service.category}
          </span>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {service.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            {service.full_description || service.description || service.short_description}
          </p>

          {/* AI Consultation Prompt */}
          <div className="pt-2">
            <button
              onClick={() => openAIAssistantWithQuery(`Can you explain the scope and architecture of your "${service.title}" service?`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Ask AI About This Service</span>
            </button>
          </div>
        </div>

        {/* Pricing / Booking Card */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm sticky top-24">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Starting Investment</span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {service.currency ? `${service.currency} ` : ''}{service.starting_price}
            </div>
          </div>

          <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Estimated Timeline:</span>
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{service.timeline}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Production Warranty:</span>
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{service.warranty_terms || 'Included (30 Days)'}</span>
            </div>
          </div>

          <button
            onClick={handleStartThisProject}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>{isArabic ? 'حجز هذه الخدمة' : 'Engage This Package'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Deliverables Section */}
      {service.deliverables && service.deliverables.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isArabic ? 'المخرجات وحزم التسليم المضمنة' : 'Included Scope & Engineering Deliverables'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {service.deliverables.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features / Capabilities */}
      {service.features && service.features.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isArabic ? 'المواصفات والقدرات التقنية' : 'Technical Specifications & Architecture'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {service.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
