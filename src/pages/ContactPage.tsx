import React from 'react';
import {
  Mail,
  Github,
  Linkedin,
  Clock,
  MapPin,
} from 'lucide-react';
import { Profile, SiteSettings } from '../types';
import { safeUrl } from '../lib/content';
import { useLanguage } from '../context/LanguageContext';
import { DynamicForm } from '../components/DynamicForm';

interface ContactPageProps {
  profile: Profile | null;
  settings?: SiteSettings | null;
  navigate: (route: string) => void;
  openAIAssistantWithQuery: (q: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({
  profile,
  settings,
  navigate,
  openAIAssistantWithQuery
}) => {
  const { isArabic, t } = useLanguage();
  const contactEmail = profile?.email || settings?.contact_email || '';
  const githubUrl = safeUrl(settings?.social_links?.github) || safeUrl(profile?.github_url);
  const linkedinUrl = safeUrl(settings?.social_links?.linkedin) || safeUrl(profile?.linkedin_url);
  const calendlyUrl = safeUrl(settings?.calendly_url);

  return (
    <div id="contact-page" className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 font-sans text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="space-y-3 max-w-3xl">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
          {t('contact.badge', 'DIRECT CONTACT')}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t('contact.title', 'Let’s Discuss Your Next Architecture')}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          {isArabic
            ? 'تواصل معي مباشرة لمناقشة استشارات الذكاء الاصطناعي، مراجعة الأكواد والمعماريات، أو التعاقد على بناء المنتجات البرمجية.'
            : 'Whether you need a dedicated full-stack engineer, an AI architecture audit, or a custom RAG platform built from scratch, send a message below.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {isArabic ? 'معلومات التواصل المباشر' : 'Direct Channels'}
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{isArabic ? 'البريد الإلكتروني' : 'Email Address'}</span>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-xs sm:text-sm"
                  >
                    {contactEmail}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{isArabic ? 'الموقع ونطاق العمل' : 'Location & Timezone'}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {profile?.location || 'Remote (Worldwide / UTC+2)'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{isArabic ? 'سرعة الرد المتوقعة' : 'Expected SLA Response'}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {isArabic ? 'خلال 12 - 24 ساعة' : '< 12-24 Hours'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-400 block">{isArabic ? 'الملفات المهنية:' : 'Professional Profiles:'}</span>
              <div className="flex flex-wrap items-center gap-2">
                {githubUrl && <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </a>}
                {linkedinUrl && <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  LinkedIn
                </a>}
                {calendlyUrl && (
                  <a
                    href={calendlyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {isArabic ? 'احجز مكالمة' : 'Book a call'}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
            <DynamicForm
              slug="contact"
              submitButtonText={isArabic ? 'إرسال الرسالة الآن' : 'Send Message'}
              successMessage={isArabic ? 'تم استلام رسالتك بنجاح!' : 'Message Dispatched Successfully!'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
