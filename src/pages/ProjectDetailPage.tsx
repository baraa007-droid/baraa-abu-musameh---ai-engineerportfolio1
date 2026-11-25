import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Github,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../lib/api';
import { Project, SiteSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useSeoMeta } from '../hooks/useSeoMeta';
import { savePrefill } from '../lib/storage';
import { getProjectGallery } from '../lib/content';

interface ProjectDetailPageProps {
  slug: string;
  navigate: (route: string) => void;
  openAIAssistantWithQuery: (q: string) => void;
  settings?: SiteSettings | null;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  slug,
  navigate,
  openAIAssistantWithQuery,
  settings
}) => {
  const { isArabic, t } = useLanguage();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const data = await api.getProject(slug);
        setProject(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [slug]);

  // SEO – updates <head> meta tags on load and SPA navigation
  useSeoMeta({
    entitySeoTitle: project?.seo_title,
    entityTitle: project?.title,
    entitySeoDescription: project?.seo_description,
    entityDescription: project?.short_description,
    entityOgImage: project?.og_image,
    settings,
    canonicalPath: project ? `/projects/${project.slug}` : `/projects/${slug}`,
  });

  if (loading) {
    return (
      <div className="pt-32 pb-20 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">{isArabic ? 'جاري تحميل تفاصيل دراسة الحالة...' : 'Loading case study details...'}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="pt-32 pb-20 text-center space-y-4 max-w-md mx-auto px-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Project Not Found</h2>
        <p className="text-xs text-slate-500">The requested project record could not be retrieved.</p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs cursor-pointer"
        >
          Return to Projects Index
        </button>
      </div>
    );
  }

  // Gallery: prefer gallery array, fall back to image_url
  const galleryImages: string[] = getProjectGallery(project);
  const prevGallery = () => setGalleryIndex(i => (i - 1 + galleryImages.length) % galleryImages.length);
  const nextGallery = () => setGalleryIndex(i => (i + 1) % galleryImages.length);

  const handleStartSimilarProject = () => {
    savePrefill({
      project_type: project.category,
      description: `I am interested in building a system similar to "${project.title}".`,
      required_features: project.technologies || [],
      source: `project:${project.slug}`
    });
    navigate('/start-project');
  };

  return (
    <div id="project-detail-page" className="pt-24 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 font-sans text-slate-700 dark:text-slate-300">
      {/* Back button */}
      <button
        onClick={() => navigate('/projects')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{isArabic ? 'العودة لقائمة المشاريع' : 'Back to Case Studies'}</span>
      </button>

      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">
            {project.category}
          </span>

          {project.results && project.results.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              {project.results[0]}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          {project.title}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
          {project.full_description || project.description || project.short_description}
        </p>

        {/* Live Action Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {project.live_url && (
            <a
              href={project.live_url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <span>Live Preview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {project.github_url && (
            <a
              href={project.github_url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Source Repository</span>
            </a>
          )}

          <button
            onClick={() => openAIAssistantWithQuery(`Can you explain the technical architecture of the project "${project.title}"?`)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Ask AI About This Project</span>
          </button>
        </div>
      </div>

      {/* Gallery / Cover Image Carousel */}
      {galleryImages.length > 0 && (
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 aspect-video shadow-md">
          <img
            src={galleryImages[galleryIndex]}
            alt={`${project.title} – image ${galleryIndex + 1}`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-opacity duration-300"
          />
          {galleryImages.length > 1 && (
            <>
              <button onClick={prevGallery} aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={nextGallery} aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {galleryImages.map((_, idx) => (
                  <button key={idx} onClick={() => setGalleryIndex(idx)} aria-label={`Go to image ${idx + 1}`}
                    className={`w-2 h-2 rounded-full transition-colors ${idx === galleryIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Deep-Dive Technical Sections */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Challenge & Solution */}
        <div className="md:col-span-8 space-y-6">
          {/* Challenge & Problem Statement */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>{isArabic ? 'التحدي والمشكلة التقنية' : 'The Challenge & Bottleneck'}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {project.problem_statement ||
                "Legacy manual processes, unconstrained model latency, and lack of deterministic grounding guardrails led to unpredictable outputs and high operational overhead."}
            </p>
          </div>

          {/* Solution & Architecture */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{isArabic ? 'الحل والمعمارية الهندسية' : 'The Engineered Solution & Architecture'}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {project.solution_overview ||
                "Designed a low-latency pipeline combining pgvector embeddings, typed schema validation, streaming token response, and a modular Next.js frontend."}
            </p>
          </div>

          {/* Results & Measurable Metrics */}
          {project.results && project.results.length > 0 && (
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isArabic ? 'النتائج والمؤشرات القابلة للقياس' : 'Measurable Impact & Production Results'}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {project.results.map((resItem, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{resItem}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Tech Stack & Bridge */}
        <div className="md:col-span-4 space-y-6">
          {/* Tech Stack Box */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {isArabic ? 'التقنيات المستخدمة' : 'Technologies Deployed'}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {project.technologies?.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Start Similar Project Intake Box */}
          <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {isArabic ? 'تريد بناء نظام مشابه؟' : 'Need a similar system?'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {isArabic
                ? 'انقل مواصفات هذا المشروع مباشرة إلى نموذج طلب المشاريع للحصول على دراسة فورية.'
                : 'Transfer this architecture specification into the intake builder for instant AI feasibility evaluation.'}
            </p>
            <button
              onClick={handleStartSimilarProject}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <span>{isArabic ? 'بدء مشروع مماثل' : 'Start Similar Project'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
