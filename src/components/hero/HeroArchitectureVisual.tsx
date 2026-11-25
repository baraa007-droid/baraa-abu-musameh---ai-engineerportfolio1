import React, { useState } from 'react';
import {
  Zap,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ArchitectureNode } from '../../types';

interface NodeSpec {
  id: string;
  titleEn: string;
  titleAr: string;
  categoryEn: string;
  categoryAr: string;
  tech: string[];
  latency: string;
  descriptionEn: string;
  descriptionAr: string;
  detailsEn: string[];
  detailsAr: string[];
}

const DEFAULT_ARCHITECTURE_NODES: NodeSpec[] = [
  {
    id: 'input',
    titleEn: 'Client Request & Context',
    titleAr: 'طلب العميل والسياق',
    categoryEn: 'INGRESS LAYER',
    categoryAr: 'طبقة الدخول',
    tech: ['Next.js 14', 'TypeScript', 'HTTP/3 / WebSocket'],
    latency: '< 15ms',
    descriptionEn: 'Streaming client inputs, query tokenization, session state authentication, and rate limiting validation.',
    descriptionAr: 'معالجة مدخلات المستخدم الفورية، التحقق من جلسة الاتصال، وتنظيم معدل الطلبات.',
    detailsEn: ['Zero-trust token verification', 'Streaming payload chunking', 'Bilingual text preprocessing'],
    detailsAr: ['تحقق آمن بدون ثقة مسبقة', 'تقطيع البيانات المتدفقة', 'معالجة مسبقة للنصوص العربية والإنجليزية']
  },
  {
    id: 'rag',
    titleEn: 'Hybrid Vector & RAG Store',
    titleAr: 'البحث الشعاعي وذاكرة RAG',
    categoryEn: 'RETRIEVAL ENGINE',
    categoryAr: 'محرك الاسترجاع',
    tech: ['pgvector', 'Cosine Similarity', 'PostgreSQL'],
    latency: '< 45ms',
    descriptionEn: 'High-precision semantic embeddings with hybrid keyword fallbacks and dynamic similarity thresholding.',
    descriptionAr: 'تضمين شعاعي دقيق مع بحث هجين يضمن استرجاع السياق الموثق بدقة 100%.',
    detailsEn: ['768-dim embeddings', 'Sub-50ms index query', 'Deterministic knowledge chunking'],
    detailsAr: ['تضمينات بأبعاد 768', 'استعلام فهرس بأقل من 50ms', 'تقطيع نصوص محدد ومنظم']
  },
  {
    id: 'agent',
    titleEn: 'AI Agent & Guardrails',
    titleAr: 'وكيل الذكاء الاصطناعي والأمان',
    categoryEn: 'INTELLIGENCE CORE',
    categoryAr: 'نواة المعالجة الذكية',
    tech: ['Gemini 3.7', 'Typed Tool Calling', 'Security Filters'],
    latency: '< 450ms',
    descriptionEn: 'Reasoning core with strict prompt injection defenses, structured JSON tool calling, and anti-hallucination bounds.',
    descriptionAr: 'نواة التفكير والاستنتاج مع حماية صارمة ضد حقن التعليمات ومخرجات محددة الأنماط.',
    detailsEn: ['Anti-injection security boundaries', 'Automated lead qualification', 'Structured schema output'],
    detailsAr: ['فلاتر أمان لمنع تجاوز التعليمات', 'تقييم وتأهيل تلقائي للعملاء', 'مخرجات متوافقة مع JSON Schema']
  },
  {
    id: 'edge',
    titleEn: 'Edge Delivery & Microservices',
    titleAr: 'التسليم السحابي والخدمات',
    categoryEn: 'INFRASTRUCTURE',
    categoryAr: 'البنية التحتية',
    tech: ['Docker', 'Cloud Run', 'Redis Cache', 'Express'],
    latency: '< 20ms',
    descriptionEn: 'Containerized deployment running behind edge reverse proxies with active telemetry observability.',
    descriptionAr: 'نشر سحابي بالحاويات مع تخزين مؤقت ومراقبة مستمرة للأداء.',
    detailsEn: ['Global CDN edge caching', 'Auto-scaling concurrency', 'Real-time telemetry logging'],
    detailsAr: ['تخزين مؤقت عالمي', 'توسع تلقائي مع زيادة الطلب', 'تسجيل فوري لمؤشرات الأداء']
  }
];

interface HeroArchitectureVisualProps {
  nodes?: ArchitectureNode[];
}

export const HeroArchitectureVisual: React.FC<HeroArchitectureVisualProps> = ({ nodes }) => {
  const { isArabic } = useLanguage();

  const formattedNodes: NodeSpec[] = (nodes && nodes.length > 0)
    ? nodes.filter(n => n.enabled !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(n => ({
        id: n.id,
        titleEn: n.title_en,
        titleAr: n.title_ar || n.title_en,
        categoryEn: n.category_en,
        categoryAr: n.category_ar || n.category_en,
        tech: n.tech || [],
        latency: n.latency,
        descriptionEn: n.description_en,
        descriptionAr: n.description_ar || n.description_en,
        detailsEn: n.details_en || [],
        detailsAr: n.details_ar || n.details_en || []
      }))
    : DEFAULT_ARCHITECTURE_NODES;

  const [activeNodeId, setActiveNodeId] = useState<string>(formattedNodes[0]?.id || 'agent');
  const activeNode = formattedNodes.find(n => n.id === activeNodeId) || formattedNodes[0] || DEFAULT_ARCHITECTURE_NODES[0];

  return (
    <div id="hero-architecture-system" className="w-full rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-colors">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 ml-2">
            system_architecture.interactive
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {isArabic ? 'النظام نشط ومراقب' : 'LIVE TELEMETRY'}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Interactive Architecture Flow Diagram */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
          {formattedNodes.map((node, index) => {
            const isSelected = node.id === activeNodeId;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setActiveNodeId(node.id)}
                className={`text-left p-4 rounded-xl transition-all relative border flex flex-col justify-between space-y-3 cursor-pointer group ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 dark:border-blue-400 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Node Status & Stage */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    0{index + 1} // {isArabic ? node.categoryAr : node.categoryEn}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                    {node.latency}
                  </span>
                </div>

                {/* Node Title */}
                <div>
                  <h4 className={`text-xs sm:text-sm font-bold transition-colors ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                    {isArabic ? node.titleAr : node.titleEn}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {isArabic ? node.descriptionAr : node.descriptionEn}
                  </p>
                </div>

                {/* Primary Tech Tag */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {node.tech.map((t, idx) => (
                    <span
                      key={idx}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-blue-600/10 text-blue-700 dark:text-blue-300 font-medium'
                          : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Node Deep-Dive Inspection Box */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 transition-all space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isArabic ? activeNode.titleAr : activeNode.titleEn}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-900">
                    {isArabic ? activeNode.categoryAr : activeNode.categoryEn}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {isArabic ? 'مواصفات المعمارية وطبقة التنفيذ' : 'Production Pipeline Specification'}
                </span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Target Latency: <strong className="text-slate-900 dark:text-white">{activeNode.latency}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {(isArabic ? activeNode.detailsAr : activeNode.detailsEn).map((detail, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
