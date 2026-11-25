import React, { useState } from 'react';
import {
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DynamicForm } from '../components/DynamicForm';
import { takePrefill } from '../lib/storage';

interface StartProjectPageProps {
  navigate: (route: string) => void;
  openAdvisorModal: () => void;
}

export const StartProjectPage: React.FC<StartProjectPageProps> = ({
  navigate,
  openAdvisorModal
}) => {
  const { isArabic } = useLanguage();
  // One-shot handoff from a project/service page or the AI advisor (read once, then cleared).
  const [prefill] = useState(() => takePrefill());

  return (
    <div id="start-project-page" className="pt-24 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 font-sans text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="space-y-3 max-w-3xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
            {isArabic ? 'بدء مشروع جديد' : 'PROJECT INTAKE & SCOPING'}
          </span>
          <button
            type="button"
            onClick={openAdvisorModal}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isArabic ? 'استشر المساعد الذكي' : 'Use AI Scoper'}</span>
          </button>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {isArabic ? 'ابدأ مشروعك البرمجي والذكي' : 'Initialize Your Engineering Project'}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          {isArabic
            ? 'حدد متطلبات مشروعك، الميزانية، والميزات الأساسية للحصول على دراسة جدوى فنية وتخطيط معماري شامل.'
            : 'Specify your core requirements, target deliverables, and timeline to receive a direct architectural proposal.'}
        </p>
      </div>

      <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {prefill && (
          <p className="mb-6 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2">
            {isArabic ? 'تمت تعبئة بعض الحقول مسبقًا. راجعها وعدّلها قبل الإرسال.' : 'Some fields were pre-filled for you. Please review them before submitting.'}
          </p>
        )}
        <DynamicForm
          slug="lead"
          initialValues={prefill ? { ...prefill } : undefined}
          submitButtonText={isArabic ? 'إرسال طلب المشروع واعتماد المواصفات' : 'Submit Project Specification'}
          successMessage={isArabic ? 'تم استلام طلب المشروع بنجاح!' : 'Project Specification Received!'}
        />
      </div>
    </div>
  );
};
