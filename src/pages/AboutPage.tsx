import React from 'react';
import {
  Briefcase,
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  Sparkles
} from 'lucide-react';
import { Profile, Experience, Education, Certificate, Course, Skill, EngineeringPrinciple } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { safeUrl } from '../lib/content';

interface AboutPageProps {
  profile: Profile | null;
  experience: Experience[];
  education: Education[];
  certificates: Certificate[];
  courses: Course[];
  skills: Skill[];
  principles?: EngineeringPrinciple[];
  navigate: (route: string) => void;
  openAdvisorModal: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  profile,
  experience,
  education,
  certificates,
  courses,
  skills,
  principles: cmsPrinciples,
  navigate,
  openAdvisorModal
}) => {
  const { isArabic, t } = useLanguage();

  // All roles are shown (past ones too): current roles first, then most recent start date.
  const visibleExperience = [...experience]
    .filter((e) => (e as any).published !== false)
    .sort((a, b) => (Number(b.current) - Number(a.current)) || (a.start_date < b.start_date ? 1 : -1));
  const visibleEducation = [...education]
    .filter((e) => e.published !== false)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const visibleCertificates = [...certificates]
    .filter((c) => c.published !== false)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const visibleCourses = [...courses]
    .filter((c) => c.published !== false)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  const sortedPrinciples = (cmsPrinciples && cmsPrinciples.length > 0)
    ? cmsPrinciples.filter(p => p.enabled !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [
        {
          id: '1',
          title: isArabic ? "الهندسة الحتمية والموثوقية" : "Deterministic Engineering",
          description: isArabic ? "بناء أنظمة ذكية محكومة بقواعد صارمة للتحقق من المخرجات وتقليل نسب الهلوسة للصفر." : "Resilient systems with strict output schemas, grounding guardrails, and automated evaluation suites rather than unconstrained prompt calls."
        },
        {
          id: '2',
          title: isArabic ? "معمارية منخفضة زمن الاستجابة" : "Low-Latency Architecture",
          description: isArabic ? "تحسين استعلامات قواعد البيانات، تخزين التضمينات الشعاعية مؤقتاً، وتصميم واجهات فائقة السرعة." : "Optimizing database indexing, caching embeddings, leveraging edge runtimes, and targeting sub-100ms response times."
        },
        {
          id: '3',
          title: isArabic ? "أمان الأنواع من البداية للنهاية" : "End-to-End Type Safety",
          description: isArabic ? "استخدام TypeScript الصارم من جداول البيانات وواجهات الـ API وحتى الواجهات التفاعلية." : "Strict TypeScript from database schemas and API boundaries to client components for bulletproof code safety."
        },
        {
          id: '4',
          title: isArabic ? "التسليم المعتمد على المراحل" : "Milestone-Driven Delivery",
          description: isArabic ? "مخرجات واضحة، نشر بيئات تجريبية فورية، ومراجعات فنية دورية وشفافة." : "Clear sprint deliverables, staging preview deployments, and rapid iteration with transparent technical updates."
        }
      ];

  return (
    <div id="about-page" className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 font-sans text-slate-700 dark:text-slate-300">
      {/* 1. Hero & Bio Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
            {t('about.badge', 'ENGINEER PROFILE & BACKGROUND')}
          </span>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {isArabic ? 'براء أبو مسامح // مهندس ذكاء اصطناعي وتطبيقات ويب' : 'Bridging Machine Learning With Scalable Web Architectures'}
          </h1>

          <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              {isArabic
                ? 'أنا براء أبو مسامح، مهندس برمجيات وذكاء اصطناعي متخصص في بناء وتطوير منصات الـ RAG، وكلاء الذكاء الاصطناعي، وتطبيقات الويب السحابية ذات الأداء العالي.'
                : 'I am Baraa Abu Musameh, a Software & AI Engineer. I specialize in designing and shipping production AI systems, multimodal RAG platforms, and high-conversion web applications.'}
            </p>
            <p>
              {isArabic
                ? 'يركز نهجي الهندسي على حل الاختناقات التشغيلية الحقيقية: أتمتة معالجة الوثائق الضخمة، بناء واجهات SaaS تفاعلية بـ Next.js و Tailwind، ونشر النماذج على الخوادم السحابية.'
                : 'My engineering approach centers on solving real-world operational bottlenecks: replacing manual human document processing with grounded vector pipelines, building lightning-fast SaaS web interfaces, and integrating intelligent agent workflows.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => navigate('/start-project')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <span>{isArabic ? 'بدء مشروع جديد' : 'Launch a Project'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={openAdvisorModal}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isArabic ? 'استشارة الذكاء الاصطناعي' : 'AI Scoping Tool'}</span>
            </button>
          </div>
        </div>

        {/* Profile Card Sidebar */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <img
              src={profile?.avatar_url || '/images/baraa-profile.webp'}
              alt={isArabic ? 'صورة براء أبو مسامح' : 'Baraa Abu Musameh'}
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm"
            />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Baraa Abu Musameh
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {profile?.title || 'AI & Full-Stack Engineer'}
              </p>
              <p className="text-[11px] text-slate-400">
                {profile?.location || 'Remote / Worldwide'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">{t('about.core_focus')}</span>
              <span className="font-semibold text-slate-900 dark:text-white text-right">{profile?.focus_areas?.slice(0, 3).join(', ') || '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">{t('about.experience_label')}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{profile?.years_experience ?? '—'}{profile?.years_experience !== undefined ? `+ ${t('about.years_short')}` : ''}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">{t('about.status')}</span>
              {profile?.available_for_freelance === false
                ? <span className="text-slate-500 font-bold">{isArabic ? 'غير متاح حاليًا' : 'Not available right now'}</span>
                : <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t('about.open_for_contracts')}</span>}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            {safeUrl(profile?.github_url) && <a
              href={safeUrl(profile?.github_url)}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>}
            {safeUrl(profile?.linkedin_url) && <a
              href={safeUrl(profile?.linkedin_url)}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Linkedin className="w-4 h-4" />
            </a>}
            {profile?.email && <a
              href={`mailto:${profile.email}`}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Mail className="w-4 h-4" />
            </a>}
          </div>
        </div>
      </section>

      {/* 2. Core Engineering Principles */}
      <section className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isArabic ? 'المبادئ والمعايير الهندسية' : 'Core Engineering Principles'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sortedPrinciples.map((pr: any, idx: number) => (
            <div
              key={pr.id || idx}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs"
            >
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{isArabic ? (pr.title_ar || pr.title) : pr.title}</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isArabic ? (pr.description_ar || pr.description) : pr.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Professional Experience & Roles */}
      <section className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{isArabic ? 'الخبرات المهنية وسجل العمل' : 'Professional Experience & Engineering Track'}</span>
          </h2>
        </div>

        <div className="space-y-4">
          {visibleExperience.map((exp) => (
            <div
              key={exp.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {exp.role} <span className="text-blue-600 dark:text-blue-400">@ {exp.company}</span>
                </h4>
                <span className="text-xs text-slate-400 font-medium">
                  {exp.start_date} - {exp.end_date || t('about.present')} {exp.location ? `• ${exp.location}` : ''}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {exp.description}
              </p>

              {exp.highlights && exp.highlights.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {exp.highlights.map((h, hi) => (
                    <div key={hi} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 4. Education & Certifications */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Education */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{isArabic ? 'التعليم الأكاديمي' : 'Education'}</span>
          </h3>

          <div className="space-y-4">
            {visibleEducation.map((edu) => (
              <div key={edu.id} className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{edu.degree}</h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{edu.institution}</p>
                <p className="text-[11px] text-slate-400">{edu.start_year} - {edu.end_year}</p>
                {edu.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">{edu.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{isArabic ? 'الشهادات والاعتمادات' : 'Certifications'}</span>
          </h3>

          <div className="space-y-4">
            {visibleCertificates.map((cert) => (
              <div key={cert.id} className="space-y-1">
                <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cert.name}</h4>
                  {cert.description && <p className="text-xs text-slate-500">{cert.description}</p>}
                  {cert.credential_url && (
                    <a
                      href={cert.credential_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>{t('about.verify')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">{cert.issuer} • {cert.issue_date}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Courses & Continuous Learning */}
      {visibleCourses.length > 0 && (
        <section className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('about.courses')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleCourses.map((course) => (
              <div
                key={course.id}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{course.title}</h4>
                  {course.certificate_url && (
                    <a
                      href={course.certificate_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>{t('about.course_certificate')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {course.provider}
                  {course.completion_date ? ` • ${t('about.course_completed')} ${course.completion_date}` : ''}
                </p>
                {course.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{course.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
