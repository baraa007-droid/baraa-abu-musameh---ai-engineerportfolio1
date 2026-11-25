import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  X,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  Loader2
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { savePrefill } from '../../lib/storage';

interface AIProjectAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: (route: string) => void;
  onApplyToStartProject?: (data: any) => void;
}

export const AIProjectAdvisorModal: React.FC<AIProjectAdvisorModalProps> = ({
  isOpen,
  onClose,
  navigate,
  onApplyToStartProject
}) => {
  const { isArabic } = useLanguage();
  const [idea, setIdea] = useState('');
  const [businessType, setBusinessType] = useState('Tech Startup');
  const [targetAudience, setTargetAudience] = useState('B2B Enterprise');
  const [budgetRange, setBudgetRange] = useState('');
  const [budgetOptions, setBudgetOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assessment, setAssessment] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const initialInputRef = useRef<HTMLTextAreaElement>(null);
  const modalContainerRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onClose,
    initialFocusRef: initialInputRef
  });

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void api.getForm('lead').then((config) => {
      if (!active) return;
      const field = config.fields.find((item) => item.key === 'budget_range');
      setBudgetOptions(Array.isArray(field?.options) ? field.options.filter(Boolean) : []);
    }).catch(() => {
      if (active) setBudgetOptions([]);
    });
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!idea.trim()) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await api.getProjectAdvice({
        idea,
        businessType,
        targetAudience,
        budgetRange: budgetRange || undefined
      });
      setAssessment(data);
    } catch (e) {
      console.error("Advisor error:", e);
      setErrorMessage(
        e instanceof ApiError && e.status === 429
          ? (isArabic ? 'عدد كبير من الطلبات. حاول مجددًا بعد دقيقة.' : 'Too many requests. Please try again in a minute.')
          : (isArabic ? 'تعذّر تحليل الفكرة الآن. حاول مرة أخرى أو أرسل التفاصيل عبر نموذج بدء المشروع.' : 'The idea could not be analyzed right now. Try again, or send the details through the Start Project form.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToForm = () => {
    if (assessment) {
      savePrefill({
        description: idea,
        project_type: assessment.projectType,
        budget_range: budgetRange,
        required_features: assessment.recommendedFeatures || [],
        source: 'advisor'
      });
      onClose();
      navigate('/start-project');
    }
  };

  const templates = [
    { title: "Enterprise RAG Knowledge Base", prompt: "A private internal document search system where employees upload legal & technical PDFs to get instant cited answers." },
    { title: "Headless E-Commerce Platform", prompt: "A fast online store with Next.js, Stripe checkout, automated visual search for products, and inventory dashboard." },
    { title: "SaaS Analytics & AI Copilot", prompt: "A multi-tenant web dashboard for tracking customer subscriptions, real-time telemetry, and automated AI summary reports." },
    { title: "Edge Computer Vision System", prompt: "Real-time camera feed analysis for detecting safety compliance in a facility with instant alerts and logging." }
  ];

  return (
    <div
      id="ai-project-advisor-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalContainerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advisor-modal-title"
        aria-describedby="advisor-modal-desc"
        tabIndex={-1}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-slate-800 dark:text-slate-200 focus:outline-none"
      >
        {/* Header */}
        <div className="p-5 bg-slate-50 dark:bg-slate-950 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 id="advisor-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                {isArabic ? 'مستشار ومقيم المشاريع الذكي' : 'AI Project Scoper & Advisor'}
              </h3>
              <p id="advisor-modal-desc" className="text-xs text-slate-500 dark:text-slate-400">
                {isArabic ? 'تحليل فوري لفكرة مشروعك، المعمارية المقترحة، والجدول الزمني' : 'Instant architectural recommendation & feasibility estimation'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={isArabic ? 'إغلاق النافذة' : 'Close modal'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!assessment ? (
            <div className="space-y-5">
              {/* Quick Template Chips */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                  {isArabic ? 'نماذج أفكار سريعة للاختيار:' : 'Quick Project Archetype Templates:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIdea(tpl.prompt)}
                      className="p-3 text-left rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-xs cursor-pointer"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">
                        {tpl.title}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {tpl.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Idea Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isArabic ? 'وصف فكرة مشروعك ومتطلباتك الأساسية:' : 'Describe what you want to build & key features:'}
                </label>
                <textarea
                  ref={initialInputRef}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  rows={4}
                  placeholder={isArabic ? 'مثال: نحتاج منصة بحث ذكية لملفات الشركة مع إمكانية استخراج الجداول وتوليد ملخصات تلقائية...' : 'e.g. A fast SaaS platform for real estate agents with AI valuation tools, customer portal, and Stripe billing...'}
                  className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Scope selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Business Stage
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Tech Startup">Early-Stage Startup</option>
                    <option value="Growth Scaleup">Growth Scaleup</option>
                    <option value="Enterprise / Corporate">Enterprise Corp</option>
                    <option value="Independent Founder">Solo Founder</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="B2B Enterprise">B2B Business</option>
                    <option value="B2C Consumer">B2C Mass Market</option>
                    <option value="Internal Operations">Internal Team Tool</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Target Budget
                  </label>
                  <select
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">{isArabic ? 'غير محدد' : 'Not specified'}</option>
                    {budgetOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </div>

              {errorMessage && (
                <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2">
                  {errorMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!idea.trim() || isLoading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing system feasibility with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{isArabic ? 'تحليل الفكرة وتوليد المعمارية المقترحة' : 'Analyze Feasibility & Generate Proposal'}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Results Presentation */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                    Recommended Architecture & Solution
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                    {assessment.projectType || '—'}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {assessment.suggestedSolution}
                </p>
                {assessment.generated_by === 'fallback_template' && (
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    {isArabic
                      ? 'ملاحظة: المساعد الذكي غير متاح الآن، وهذه نتيجة تقريبية مأخوذة من الخدمات المنشورة وليست تحليلًا بالذكاء الاصطناعي.'
                      : 'Note: the AI advisor is unavailable right now. This is an approximate match from the published services, not an AI analysis.'}
                  </p>
                )}
              </div>

              {/* Key Estimates Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block font-medium">Estimated Time</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {assessment.estimatedTimeline || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block font-medium">Estimated Range</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {assessment.estimatedBudget || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block font-medium">Core Tech Stack</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                    {(assessment.potentialTechnologies || []).slice(0, 2).join(', ') || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block font-medium">Complexity</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {assessment.complexity || '—'}
                  </span>
                </div>
              </div>

              {/* Recommended Features */}
              {assessment.recommendedFeatures && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                    Recommended Implementation Modules:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {assessment.recommendedFeatures.map((feat: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssessment(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Adjust Parameters
                </button>

                <button
                  type="button"
                  onClick={handleApplyToForm}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>Transfer to Project Intake Form</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
