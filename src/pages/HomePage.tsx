import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Cpu,
  CheckCircle2,
  ExternalLink,
  Github,
  Star,
  Clock
} from 'lucide-react';
import { Profile, Project, Service, Skill, BlogPost, Testimonial, MethodologyStep, ArchitectureNode } from '../types';
import { SemanticSearchBar } from '../components/ai/SemanticSearchBar';
import { HeroArchitectureVisual } from '../components/hero/HeroArchitectureVisual';
import { useLanguage } from '../context/LanguageContext';
import { getProjectImage, getTestimonialRole } from '../lib/content';

interface HomePageProps {
  profile: Profile | null;
  projects: Project[];
  services: Service[];
  skills: Skill[];
  blogPosts: BlogPost[];
  testimonials: Testimonial[];
  methodologySteps?: MethodologyStep[];
  architectureNodes?: ArchitectureNode[];
  navigate: (route: string) => void;
  openAIAssistantWithQuery: (q: string) => void;
  openAdvisorModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  profile,
  projects,
  services,
  skills,
  blogPosts,
  testimonials,
  methodologySteps,
  architectureNodes,
  navigate,
  openAIAssistantWithQuery,
  openAdvisorModal
}) => {
  const { isArabic, t } = useLanguage();
  const [selectedSkillCat, setSelectedSkillCat] = useState<string>('All');

  const featuredProjects = projects.filter(p => p.featured).slice(0, 4);
  const featuredServices = services.slice(0, 6);
  const recentArticles = blogPosts.slice(0, 3);

  const skillCategories = ['All', 'Programming', 'AI & Machine Learning', 'Web & Cloud', 'Tools & DevOps'];
  const filteredSkills = selectedSkillCat === 'All'
    ? skills
    : skills.filter(s => s.category === selectedSkillCat);

  const sortedMethodology = (methodologySteps && methodologySteps.length > 0)
    ? methodologySteps.filter(s => s.enabled !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [
        {
          id: "1",
          step_number: "01",
          title: isArabic ? "الاكتشاف ودراسة الجدوى" : "Discovery & Feasibility",
          description: isArabic ? "تقييم أهداف المشروع، متطلبات البيانات الشعاعية، والمواصفات الفنية." : "Evaluating core objectives, data schemas, vector embedding models, and API boundaries."
        },
        {
          id: "2",
          step_number: "02",
          title: isArabic ? "معمارية النظام والذكاء الاصطناعي" : "System & RAG Architecture",
          description: isArabic ? "هندسة قواعد البيانات pgvector، نماذج الاسترجاع RAG، وفلاتر الأمان." : "Designing deterministic schemas, vector indices, guardrails, and streaming protocols."
        },
        {
          id: "3",
          step_number: "03",
          title: isArabic ? "التطوير وتكامل الواجهات" : "Full-Stack Implementation",
          description: isArabic ? "بناء الواجهات التفاعلية بـ Next.js و Tailwind مع خوادم خلفية متوافقة مع TypeScript." : "Building responsive React UI and high-performance TypeScript backend services."
        },
        {
          id: "4",
          step_number: "04",
          title: isArabic ? "النشر السحابي والمراقبة" : "Cloud Deployment & Telemetry",
          description: isArabic ? "النشر بالحاويات مع تكامل مستمر ومراقبة فورية لمعدل الأخطاء والأداء." : "Deploying to Docker/Cloud Run with automated CI/CD and active observability."
        }
      ];

  return (
    <div id="home-page" className="space-y-20 md:space-y-28 pb-20 font-sans text-slate-700 dark:text-slate-300">
      {/* ---------------------------------------------------- */}
      {/* 1. HERO SECTION */}
      {/* ---------------------------------------------------- */}
      <section id="hero-section" className="pt-24 md:pt-32 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 pointer-events-none grid-pattern-subtle opacity-70" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          {/* Main Hero Header */}
          <div className="flex flex-col-reverse md:flex-row md:items-start md:justify-between gap-8">
          <div className="max-w-3xl space-y-5">
            {/* Availability Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{profile?.available_for_freelance
                ? (isArabic ? 'متاح للمشاريع الجديدة والاستشارات التقنية' : 'Available for select AI & full-stack projects')
                : (isArabic ? 'غير متاح حاليًا للمشاريع الجديدة' : 'Currently unavailable for new projects')}</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              {profile?.headline || profile?.title || (isArabic ? (
                <>
                  هندسة <span className="text-blue-600 dark:text-blue-500">الأنظمة الذكية</span> وتطبيقات الويب السحابية
                </>
              ) : (
                <>
                  Engineering <span className="text-blue-600 dark:text-blue-500">Intelligent Systems</span> & High-Performance Web Apps
                </>
              ))}
            </h1>

            {/* Value Proposition */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              {profile?.bio || profile?.about_long || (isArabic
                ? 'مهندس برمجيات وذكاء اصطناعي متخصص في بناء حلول الـ RAG المتقدمة، وكلاء الذكاء الاصطناعي المستقلين (AI Agents)، وتطبيقات الويب المؤسسية بأعلى معايير السرعة والأمان.'
                : 'I specialize in designing and shipping production AI systems, multimodal RAG platforms with pgvector, and scalable full-stack applications built for sub-100ms latency.')}
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                id="hero-start-project-btn"
                onClick={() => navigate('/start-project')}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <span>{t('hero.btn_start_project', 'Launch a Project')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="hero-advisor-modal-btn"
                onClick={openAdvisorModal}
                className="px-5 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-semibold text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{t('hero.btn_consult_ai', 'AI Project Advisor')}</span>
              </button>

              <button
                onClick={() => navigate('/projects')}
                className="px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <span>{t('hero.btn_explore_projects', 'Explore Case Studies')} →</span>
              </button>
            </div>
          </div>

          <div className="flex justify-center md:justify-end shrink-0">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-blue-500 via-emerald-400 to-blue-600 opacity-70 blur-sm" />
              <img
                src={profile?.avatar_url || '/images/baraa-profile.webp'}
                alt={isArabic ? 'صورة براء أبو مسامح' : 'Baraa Abu Musameh'}
                className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full object-cover border-4 border-white/80 dark:border-slate-800 shadow-2xl"
              />
              <div className="absolute -bottom-3 -start-3 rounded-xl bg-slate-950 dark:bg-slate-800 border border-slate-700 px-3 py-2 shadow-lg">
                <span className="flex items-center gap-2 text-[11px] font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {isArabic ? 'متاح للمشاريع' : 'Available for projects'}
                </span>
              </div>
            </div>
          </div>
          </div>

          {/* Interactive Architecture Visual */}
          <div className="pt-2">
            <HeroArchitectureVisual nodes={architectureNodes} />
          </div>

          {/* Proof Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono block">
                {profile?.years_experience ? `${profile.years_experience}+` : '—'}
              </span>
              <span className="text-xs text-slate-500 font-medium mt-1 block">
                {t('hero.stat_experience', 'Years Industry Experience')}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-500 font-mono block">
                {profile?.completed_projects ? `${profile.completed_projects}+` : '—'}
              </span>
              <span className="text-xs text-slate-500 font-medium mt-1 block">
                {t('hero.stat_projects', 'Production Builds Delivered')}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono block">
                {profile?.satisfaction_rate || (profile?.client_satisfaction ? `${profile.client_satisfaction}%` : '—')}
              </span>
              <span className="text-xs text-slate-500 font-medium mt-1 block">
                {t('hero.stat_satisfaction', 'Client Satisfaction Rate')}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono block">
                {profile?.target_latency || '—'}
              </span>
              <span className="text-xs text-slate-500 font-medium mt-1 block">
                {t('hero.stat_latency', 'P99 Target Latency')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 2. SEMANTIC SEARCH & AI EXPLORER */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="max-w-2xl space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{isArabic ? 'استكشف المشاريع بالبحث الذكي' : 'Explore Portfolio via Semantic Search'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isArabic
                ? 'استعلم مباشرة عن أي تقنية، نوع مشروع، أو متطلب برمجي للحصول على نتائج فورية.'
                : 'Natural language search across case studies, architecture notes, and engineering service packages.'}
            </p>
          </div>

          <SemanticSearchBar
            navigate={navigate}
            openAIAssistantWithQuery={openAIAssistantWithQuery}
          />
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 3. FEATURED CASE STUDIES / PROJECTS */}
      {/* ---------------------------------------------------- */}
      <section id="featured-projects-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
              {t('projects.badge', 'CASE STUDIES')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {t('projects.title', 'Featured Engineering Systems')}
            </h2>
          </div>

          <button
            id="view-all-projects-btn"
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
          >
            <span>{isArabic ? 'استعراض كافة المشاريع' : 'View All Case Studies'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuredProjects.map((project) => (
            <div
              key={project.id}
              className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Project Image & Category Pill */}
                <div className="aspect-video w-full relative bg-slate-100 dark:bg-slate-950 overflow-hidden border-b border-slate-200 dark:border-slate-800">
                  {getProjectImage(project) && <img
                    src={getProjectImage(project)}
                    alt={project.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-slate-900/90 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-800">
                      {project.category}
                    </span>
                  </div>

                  {project.results && project.results.length > 0 && (
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white shadow-md">
                      {project.results[0]}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {project.short_description}
                  </p>

                  {/* Tech Stack Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {project.technologies?.slice(0, 4).map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.technologies && project.technologies.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-400">
                        +{project.technologies.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-6 pt-0 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-850 mt-4">
                <button
                  onClick={() => navigate(`/projects/${project.slug}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  <span>{t('projects.view_case_study', 'Read Case Study')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  {project.live_url && (
                    <a
                      href={project.live_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title="Live Demo"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {project.github_url && (
                    <a
                      href={project.github_url}
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
      </section>

      {/* ---------------------------------------------------- */}
      {/* 4. SERVICES & SOLUTIONS */}
      {/* ---------------------------------------------------- */}
      <section id="services-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
              {t('services.badge', 'ENGINEERING SERVICES')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {t('services.title', 'Bespoke Software & AI Solutions')}
            </h2>
          </div>

          <button
            onClick={() => navigate('/services')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors cursor-pointer"
          >
            <span>{isArabic ? 'كافة الخدمات والتفاصيل' : 'Explore All Services'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredServices.map((service) => (
            <div
              key={service.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                    {service.starting_price}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {service.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {service.short_description}
                </p>

                {/* Key Deliverables Bullet Points */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {(service.deliverables || []).slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  <span>{service.timeline}</span>
                </span>

                <button
                  onClick={() => navigate(`/services/${service.slug}`)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{isArabic ? 'تفاصيل الخدمة' : 'View Scope'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5. ENGINEERING METHODOLOGY */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
            {t('process.badge', 'METHODOLOGY')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t('process.title', 'Deterministic Engineering Process')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedMethodology.map((step: any, idx: number) => (
            <div
              key={step.id || idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                {step.step_number} //
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {isArabic ? (step.title_ar || step.title) : step.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isArabic ? (step.description_ar || step.description) : step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 6. TECHNICAL PROFICIENCIES & SKILLS */}
      {/* ---------------------------------------------------- */}
      <section id="skills-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
              {t('skills.badge', 'CORE COMPETENCIES')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {t('skills.title', 'Stack & Ecosystem Mastery')}
            </h2>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {skillCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedSkillCat(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedSkillCat === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredSkills.map((skill) => (
            <div
              key={skill.id}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {skill.name}
                </h4>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {skill.proficiency}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${skill.proficiency}%` }}
                />
              </div>

              <span className="text-[10px] text-slate-400 font-medium block">
                {skill.category}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 7. CLIENT TESTIMONIALS */}
      {/* ---------------------------------------------------- */}
      {testimonials.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
              {t('testimonials.badge', 'TESTIMONIALS')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {t('testimonials.title', 'Trusted by Founders & Technical Leaders')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((tItem) => (
              <div
                key={tItem.id}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: Math.max(0, Math.min(5, Number(tItem.rating) || 0)) }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{tItem.content}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                    {(tItem.name || "?").slice(0, 1)}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      {tItem.name}
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      {getTestimonialRole(tItem)} {tItem.company ? `• ${tItem.company}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- */}
      {/* 8. RECENT ENGINEERING LOGS / BLOG */}
      {/* ---------------------------------------------------- */}
      {recentArticles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                {t('blog.badge', 'KNOWLEDGE LOGS')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {t('blog.title', 'Engineering Insights & Research')}
              </h2>
            </div>

            <button
              onClick={() => navigate('/blog')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <span>{isArabic ? 'استعراض كافة المقالات' : 'Read All Articles'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentArticles.map((post) => (
              <div
                key={post.id}
                onClick={() => navigate(`/blog/${post.slug}`)}
                className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 hover:shadow-md cursor-pointer transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video w-full bg-slate-100 dark:bg-slate-950 overflow-hidden relative border-b border-slate-200 dark:border-slate-800">
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

                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>{post.published_at}</span>
                      <span>•</span>
                      <span>{post.read_time}</span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                    <span>{t('blog.read_article', 'Read Full Log')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- */}
      {/* 9. CALL TO ACTION BANNER */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-xl">
          <div className="space-y-3 max-w-xl text-center md:text-left z-10">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block">
              {isArabic ? 'جاهز للبدء؟' : 'START A COLLABORATION'}
            </span>
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {isArabic
                ? 'هل تبني حلاً ذكياً أو منصة ويب جديدة؟'
                : 'Ready to engineer your next AI or full-stack platform?'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isArabic
                ? 'احصل على استشارة معمارية فورية وتقدير دقيق للتكلفة والجدول الزمني عبر مستشار الذكاء الاصطناعي أو تواصل مباشرة.'
                : 'Get an instant feasibility assessment and timeline estimate, or schedule a direct architectural discussion.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto z-10">
            <button
              onClick={() => navigate('/start-project')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <span>{isArabic ? 'ابدأ مشروعك الآن' : 'Initialize Project'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/contact')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{isArabic ? 'تواصل مباشرة' : 'Direct Inquiry'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
