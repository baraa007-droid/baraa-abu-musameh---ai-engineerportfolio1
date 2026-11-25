import React from 'react';
import {
  Github,
  Linkedin,
  Mail,
  ArrowRight,
  Code2,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Profile, SiteSettings } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { safeUrl } from '../../lib/content';

interface FooterProps {
  profile: Profile | null;
  settings: SiteSettings | null;
  navigate: (route: string) => void;
  openAIAssistant: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  profile,
  settings,
  navigate,
  openAIAssistant
}) => {
  const { isArabic, t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer id="main-footer" className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center">
                <Code2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              </div>
              <div>
                <span className="text-slate-900 dark:text-white font-bold text-sm">
                  {isArabic ? 'براء أبو مسامح' : 'Baraa Abu Musameh'}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isArabic ? 'مهندس ذكاء اصطناعي وتطبيقات ويب سحابية' : 'AI Systems & Full-Stack Engineer'}
                </p>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed max-w-sm whitespace-pre-line">
              {settings?.footer_brand_description
                ? settings.footer_brand_description
                : isArabic
                ? 'تصميم وبناء خطوط أنابيب الـ RAG، نماذج الذكاء الاصطناعي التوليدي، وتطبيقات الويب السحابية المتكاملة للمؤسسات والشركات الناشئة بأعلى معايير الأداء والموثوقية.'
                : 'Architecting deterministic AI pipelines, production RAG vector stores, and scalable full-stack web platforms engineered for speed and reliability.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { id: 'footer-github-link', href: safeUrl(settings?.social_links?.github) || safeUrl(profile?.github_url), label: 'GitHub', icon: <Github className="w-3.5 h-3.5" /> },
                { id: 'footer-linkedin-link', href: safeUrl(settings?.social_links?.linkedin) || safeUrl(profile?.linkedin_url), label: 'LinkedIn', icon: <Linkedin className="w-3.5 h-3.5" /> },
                { id: 'footer-twitter-link', href: safeUrl(settings?.social_links?.twitter) || safeUrl(profile?.twitter_url), label: 'X / Twitter', icon: <ExternalLink className="w-3.5 h-3.5" /> },
                { id: 'footer-kaggle-link', href: safeUrl(settings?.social_links?.kaggle), label: 'Kaggle', icon: <ExternalLink className="w-3.5 h-3.5" /> },
                { id: 'footer-huggingface-link', href: safeUrl(settings?.social_links?.huggingface), label: 'Hugging Face', icon: <ExternalLink className="w-3.5 h-3.5" /> }
              ].filter((l) => l.href).map((l) => (
                <a
                  key={l.id}
                  id={l.id}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 text-xs font-medium shadow-xs transition-colors"
                  aria-label={l.label}
                >
                  {l.icon}
                  <span>{l.label}</span>
                </a>
              ))}
              {(profile?.email || settings?.contact_email) && (
              <a
                id="footer-email-link"
                href={`mailto:${profile?.email || settings?.contact_email}`}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 text-xs font-medium shadow-xs transition-colors"
                aria-label="Email"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </a>
              )}
            </div>
          </div>

          {/* Navigation Col */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider">
              {isArabic ? 'أقسام الموقع' : 'Navigation'}
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <button
                  onClick={() => navigate('/projects')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{t('nav.projects', 'Case Studies & Projects')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/services')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{t('nav.services', 'Services & Solutions')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/about')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{t('nav.about', 'About & Architecture')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/blog')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{t('nav.blog', 'Technical Articles')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/contact')}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{t('nav.contact', 'Direct Contact')}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Quick AI & Services */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider">
              {isArabic ? 'الاستشارات والذكاء الاصطناعي' : 'AI Consultation'}
            </h4>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{isArabic ? 'مساعد الذكاء الاصطناعي التفاعلي' : 'Grounded AI Assistant'}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {isArabic
                  ? 'اطرح أي سؤال حول معمارية المشاريع، التكاليف التقديرية، أو طلب استشارة تقنية فورية.'
                  : 'Ask about architectural decisions, estimate timelines, or explore how to implement AI in your product.'}
              </p>
              <button
                onClick={openAIAssistant}
                className="w-full py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{isArabic ? 'فتح المساعد الذكي' : 'Launch AI Assistant'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            © {currentYear} Baraa Abu Musameh. {isArabic ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Admin Portal
            </button>
            <span>•</span>
            <span>{settings?.footer_tech_stack || 'TypeScript • Tailwind • Gemini AI'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
