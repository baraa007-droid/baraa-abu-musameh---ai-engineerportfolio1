import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageGet, storageSet } from '../lib/storage';

export type Language = 'en' | 'ar';

export interface LanguageContextType {
  language: Language;
  direction: 'ltr' | 'rtl';
  isArabic: boolean;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    'nav.overview': 'Overview',
    'nav.about': 'Architecture & Bio',
    'nav.services': 'Services',
    'nav.projects': 'Case Studies',
    'nav.blog': 'Technical Logs',
    'nav.contact': 'Contact',
    'nav.start_project': 'Start a Project',
    'nav.ask_ai': 'Ask Baraa AI',
    'nav.ai_advisor': 'AI Project Advisor',
    'nav.admin': 'Admin Terminal',
    'nav.logout': 'Sign Out',
    'nav.system_online': 'SYSTEM_ONLINE',
    'nav.prod_engineer': 'PRODUCTION_ENGINEER // OPEN_FOR_CONTRACTS',

    // Hero
    'hero.badge': 'AI ENGINEER & WEB DEVELOPER',
    'hero.title_1': 'Architecting Next-Gen',
    'hero.title_2': 'Intelligent Web Systems',
    'hero.title_3': '& AI Solutions',
    'hero.desc': 'Full-Stack Software Engineer and AI Specialist building production RAG systems, autonomous agent workflows, enterprise web applications, and vector search architectures with deterministic performance.',
    'hero.btn_explore_projects': 'Explore Case Studies',
    'hero.btn_start_project': 'Launch Your Project',
    'hero.btn_consult_ai': 'Consult AI Advisor',
    'hero.stat_experience': 'Years Experience',
    'hero.stat_projects': 'Completed Builds',
    'hero.stat_satisfaction': 'Client Satisfaction',
    'hero.stat_latency': 'P99 Latency Target',
    'hero.telemetry_title': 'TECHNICAL CAPABILITIES',
    'hero.status_open': 'Available for Freelance & Custom Builds',
    'hero.status_booked': 'Currently Engaged in Contracts',

    // Search
    'search.placeholder': 'Search projects, AI services, skills, or stack (e.g. "RAG", "Next.js", "E-Commerce", "PostgreSQL")...',
    'search.badge': 'Semantic Vector Search',
    'search.results_for': 'Results for',
    'search.no_results': 'No matching records found. Try asking Baraa AI assistant directly.',

    // Services
    'services.badge': 'ENGINEERING SERVICES & CAPABILITIES',
    'services.title': 'Bespoke Software & AI Solutions',
    'services.subtitle': 'From production generative AI pipelines to full-stack cloud web applications, built to institutional performance and security standards.',
    'services.starting_at': 'Starting at',
    'services.estimated_time': 'Est. Timeline',
    'services.view_details': 'View Deliverables & Architecture',
    'services.all_services': 'All Services',
    'services.request_service': 'Request This Service',

    // Projects
    'projects.badge': 'CASE STUDIES & PRODUCTION BUILDS',
    'projects.title': 'Engineered Systems Showcase',
    'projects.subtitle': 'Deep dives into real-world architectures, vector search implementations, and high-concurrency web platforms.',
    'projects.filter_all': 'All Builds',
    'projects.view_case_study': 'Read Technical Case Study',
    'projects.live_demo': 'Live Preview',
    'projects.source_code': 'Source Repository',
    'projects.tech_stack': 'Technologies Deployed',
    'projects.problem': 'The Challenge',
    'projects.solution': 'The Engineering Solution',
    'projects.results': 'Measurable Impact & Metrics',
    'projects.architecture': 'System Architecture',

    // Process
    'process.badge': 'METHODOLOGY & LIFECYCLE',
    'process.title': 'Deterministic Engineering Process',
    'process.subtitle': 'From technical feasibility discovery to CI/CD automated deployment and telemetry monitoring.',
    'process.step1': 'Discovery & Feasibility',
    'process.step1_desc': 'Evaluating business objectives, vector schema requirements, and data pipelines.',
    'process.step2': 'Requirements & Scope',
    'process.step2_desc': 'Defining deterministic API boundaries, token limits, and deliverable milestones.',
    'process.step3': 'Systems Architecture',
    'process.step3_desc': 'Engineering RAG embeddings, vector indices (pgvector/Pinecone), and edge caching.',
    'process.step4': 'High-Density UI/UX',
    'process.step4_desc': 'Building responsive, telemetry-dense React/Tailwind interfaces optimized for speed.',
    'process.step5': 'Core Implementation',
    'process.step5_desc': 'Constructing TypeScript backends, Gemini AI agent pipelines, and database schemas.',
    'process.step6': 'Benchmark & Testing',
    'process.step6_desc': 'Stress-testing LLM prompt hallucination rates, concurrency, latency, and security.',
    'process.step7': 'Production Deployment',
    'process.step7_desc': 'Deploying to Docker/Cloud Run/Vercel with CI/CD and automated telemetry.',
    'process.step8': 'Telemetry & Scaling',
    'process.step8_desc': 'Providing active observability, token usage optimization, and continuous updates.',

    // Skills
    'skills.badge': 'TECHNICAL PROFICIENCIES',
    'skills.title': 'Stack & Ecosystem Mastery',
    'skills.all': 'All Disciplines',
    'skills.programming': 'Programming',
    'skills.ai': 'AI & Machine Learning',
    'skills.web': 'Web & Cloud',
    'skills.tools': 'Tools & DevOps',

    // Testimonials
    'testimonials.badge': 'CLIENT & COLLABORATOR FEEDBACK',
    'testimonials.title': 'Trusted by Technical Leaders',

    // Blog
    'blog.badge': 'TECHNICAL LOGS & RESEARCH',
    'blog.title': 'Engineering Insights & Articles',
    'blog.subtitle': 'In-depth writeups on RAG architectures, LLM orchestration, Next.js optimization, and system design.',
    'blog.read_time': 'min read',
    'blog.read_article': 'Read Full Log',

    // About
    'about.title': 'Engineering Biography & Architecture',
    'about.badge': 'ENGINEER PROFILE & BACKGROUND',
    'about.core_focus': 'Core Focus:',
    'about.experience_label': 'Experience:',
    'about.years_short': 'Years',
    'about.status': 'Status:',
    'about.open_for_contracts': 'Open for Contracts',
    'about.verify': 'Verify',
    'about.courses': 'Courses & Continuous Learning',
    'about.course_completed': 'Completed',
    'about.course_certificate': 'Certificate',
    'about.present': 'Present',
    'about.experience': 'Professional Timeline',
    'about.education': 'Academic Foundation',
    'about.certificates': 'Verified Certifications',
    'about.download_cv': 'Download Curriculum Vitae (PDF)',
    'about.contact_direct': 'Initiate Direct Communication',

    // Contact & Start Project
    'contact.badge': 'COMMUNICATION CHANNELS',
    'contact.title': 'Initiate Contact or Consultation',
    'contact.subtitle': 'Reach out directly for freelance contracts, enterprise advisory, or technical inquiries.',
    'contact.name': 'Your Full Name',
    'contact.email': 'Your Work / Personal Email',
    'contact.subject': 'Subject / Topic',
    'contact.message': 'Message Details',
    'contact.send': 'Transmit Message',
    'contact.sending': 'Transmitting...',
    'contact.success': 'Message transmitted successfully! Baraa will reply within 24 hours.',

    // Start Project
    'start_project.badge': 'INBOUND PROJECT INTAKE',
    'start_project.title': 'Launch a New Project',
    'start_project.subtitle': 'Submit your specifications for automated AI qualification and immediate architectural scoping.',
    'start_project.project_type': 'Project Archetype',
    'start_project.budget': 'Target Investment Budget',
    'start_project.timeline': 'Target Delivery Timeline',
    'start_project.description': 'Core Objectives & Feature Requirements',
    'start_project.company': 'Company / Organization (Optional)',
    'start_project.communication': 'Preferred Communication Channel',
    'start_project.submit': 'Submit Project Intake for AI Evaluation',
    'start_project.submitting': 'Evaluating with AI & Submitting...',
    'start_project.success_title': 'Intake Successfully Evaluated!',
    'start_project.success_desc': 'Your project inquiry was analyzed by Baraa AI Core and logged into the priority queue.',

    // AI Modal & Assistant
    'ai.assistant_title': 'Baraa AI Assistant',
    'ai.assistant_subtitle': 'Grounded RAG Assistant & Tech Consultant',
    'ai.ask_anything': 'Ask anything about Baraa’s work, services, or how to build your idea...',
    'ai.advisor_title': 'AI Project Scoper & Advisor',
    'ai.advisor_desc': 'Describe your application or business idea to receive an instant architectural proposal, tech stack recommendation, and budget estimate powered by Gemini.',
    'ai.idea_placeholder': 'Describe what you want to build (e.g. "A high-performance e-commerce platform with automated AI customer support and inventory prediction")...',
    'ai.analyze_btn': 'Analyze Idea & Generate Proposal',
    'ai.analyzing': 'Architecting Technical Proposal...',

    // Footer
    'footer.rights': 'All technical rights reserved.',
    'footer.made_with': 'Engineered with TypeScript, Tailwind CSS, & Gemini AI Core.',
    'footer.quick_links': 'Navigation',
    'footer.services': 'Core Services',
    'footer.contact_info': 'Direct Telemetry'
  },
  ar: {
    // Nav
    'nav.overview': 'الرئيسية',
    'nav.about': 'السيرة والمعمارية',
    'nav.services': 'الخدمات',
    'nav.projects': 'المشاريع ودراسات الحالة',
    'nav.blog': 'السجلات التقنية',
    'nav.contact': 'تواصل معي',
    'nav.start_project': 'ابدأ مشروعك',
    'nav.ask_ai': 'اسأل مساعد الذكاء الاصطناعي',
    'nav.ai_advisor': 'مستشار المشاريع الذكي',
    'nav.admin': 'لوحة الإدارة',
    'nav.logout': 'تسجيل الخروج',
    'nav.system_online': 'النظام_متصل',
    'nav.prod_engineer': 'مهندس برمجيات وذكاء اصطناعي // متاح للتعاقدات',

    // Hero
    'hero.badge': 'مهندس ذكاء اصطناعي ومطور ويب متكامل',
    'hero.title_1': 'هندسة وبناء',
    'hero.title_2': 'الأنظمة البرمجية الذكية',
    'hero.title_3': 'وحلول الذكاء الاصطناعي',
    'hero.desc': 'مهندس برمجيات متخصص في بناء أنظمة الـ RAG المتقدمة، وكلاء الذكاء الاصطناعي المستقلين (AI Agents)، تطبيقات الويب المؤسسية عالية الأداء، وقواعد البيانات الشعاعية ذات السرعة والموثوقية العالية.',
    'hero.btn_explore_projects': 'استعرض دراسات الحالة',
    'hero.btn_start_project': 'أطلق مشروعك الآن',
    'hero.btn_consult_ai': 'استشر مستشار الذكاء الاصطناعي',
    'hero.stat_experience': 'سنوات خبرة عملية',
    'hero.stat_projects': 'مشاريع مكتملة',
    'hero.stat_satisfaction': 'نسبة رضا العملاء',
    'hero.stat_latency': 'زمن الاستجابة المستهدف',
    'hero.telemetry_title': 'القدرات الهندسية والتقنية',
    'hero.status_open': 'متاح حالياً لاستقبال المشاريع البرمجية والاستشارات',
    'hero.status_booked': 'مرتبط حالياً بعقود برمجية',

    // Search
    'search.placeholder': 'ابحث في المشاريع، حلول الذكاء الاصطناعي، المهارات، أو التقنيات (مثل: RAG، Next.js، متجر إلكتروني، PostgreSQL)...',
    'search.badge': 'محرك البحث الدلالي الذكي',
    'search.results_for': 'نتائج البحث عن',
    'search.no_results': 'لم يتم العثور على سجلات مطابقة. جرب سؤال مساعد الذكاء الاصطناعي مباشرة.',

    // Services
    'services.badge': 'الخدمات الهندسية والبرمجية',
    'services.title': 'حلول برمجية وذكاء اصطناعي مخصصة',
    'services.subtitle': 'من بناء وتدريب خطوط أنابيب الذكاء الاصطناعي التوليدي إلى تطوير تطبيقات الويب السحابية المتكاملة وفق أعلى معايير الأمان والسرعة.',
    'services.starting_at': 'تبدأ من',
    'services.estimated_time': 'المدة التقديرية',
    'services.view_details': 'عرض التفاصيل والمعمارية',
    'services.all_services': 'جميع الخدمات',
    'services.request_service': 'طلب هذه الخدمة',

    // Projects
    'projects.badge': 'المشاريع ودراسات الحالة',
    'projects.title': 'معرض الأنظمة البرمجية المنجزة',
    'projects.subtitle': 'نظرة متعمقة في المعماريات الواقعية، تطبيقات البحث الشعاعي، والمنصات السحابية ذات الاستيعاب العالي.',
    'projects.filter_all': 'كافة المشاريع',
    'projects.view_case_study': 'قراءة دراسة الحالة التقنية',
    'projects.live_demo': 'معاينة حية للمشروع',
    'projects.source_code': 'مستودع الكود (GitHub)',
    'projects.tech_stack': 'التقنيات المستخدمة',
    'projects.problem': 'التحدي والمشكلة',
    'projects.solution': 'الحل الهندسي المنفذ',
    'projects.results': 'النتائج والأثر القابل للقياس',
    'projects.architecture': 'معمارية النظام',

    // Process
    'process.badge': 'منهجية العمل ودورة التطوير',
    'process.title': 'عملية هندسية دقيقة ومنظمة',
    'process.subtitle': 'من دراسة الجدوى التقنية إلى الإطلاق السحابي والمراقبة الحية المستمرة.',
    'process.step1': 'الاستكشاف والجدوى التقنية',
    'process.step1_desc': 'تحليل أهداف العمل، متطلبات قواعد البيانات الشعاعية، وخطوط معالجة البيانات.',
    'process.step2': 'تحديد النطاق والمتطلبات',
    'process.step2_desc': 'تعريف واجهات الـ API، حدود التوكنز، ومحطات التسليم المحددة بدقة.',
    'process.step3': 'معمارية وهندسة النظام',
    'process.step3_desc': 'تصميم خطوط التضمين RAG، الفهارس الشعاعية (pgvector)، والطبقات السريعة (Cache).',
    'process.step4': 'تصميم الواجهات المتقدمة',
    'process.step4_desc': 'بناء واجهات React / Tailwind فائقة الاستجابة وسريعة التفاعل للمستخدم.',
    'process.step5': 'التطوير والتنفيذ البرمجي',
    'process.step5_desc': 'برمجة خوادم TypeScript، وكلاء Gemini AI، وجداول قواعد البيانات المحكمة.',
    'process.step6': 'الاختبار ومعايير الأداء',
    'process.step6_desc': 'فحص سرعة الاستجابة، منع الهلوسة في نماذج الذكاء الاصطناعي، واختبار الأمان.',
    'process.step7': 'الإطلاق السحابي والـ CI/CD',
    'process.step7_desc': 'نشر النظام على بيئات Docker / Cloud Run مع أتمتة كاملة لعمليات النشر.',
    'process.step8': 'المتابعة والتحسين المستمر',
    'process.step8_desc': 'توفير مراقبة حية لاستهلاك الموارد والتوكنز وتحسين الكفاءة باستمرار.',

    // Skills
    'skills.badge': 'الكفاءات والمهارات التقنية',
    'skills.title': 'إتقان التقنيات والأنظمة الحديثة',
    'skills.all': 'جميع المجالات',
    'skills.programming': 'لغات البرمجة',
    'skills.ai': 'الذكاء الاصطناعي وتعلم الآلة',
    'skills.web': 'تطوير الويب والسحابة',
    'skills.tools': 'الأدوات وDevOps',

    // Testimonials
    'testimonials.badge': 'آراء وتوصيات العملاء',
    'testimonials.title': 'ثقة قادة التقنية ورواد الأعمال',

    // Blog
    'blog.badge': 'السجلات التقنية والأبحاث',
    'blog.title': 'مقالات وأفكار هندسية متخصصة',
    'blog.subtitle': 'شروحات وتحليلات معمارية معمقة في مجالات RAG، نماذج الذكاء الاصطناعي، وتطوير الويب فائق السرعة.',
    'blog.read_time': 'دقائق قراءة',
    'blog.read_article': 'قراءة المقال بالكامل',

    // About
    'about.title': 'السيرة الهندسية والمعمارية البرمجية',
    'about.badge': 'الملف الهندسي والخلفية المهنية',
    'about.core_focus': 'التركيز الأساسي:',
    'about.experience_label': 'الخبرة:',
    'about.years_short': 'سنوات',
    'about.status': 'الحالة:',
    'about.open_for_contracts': 'متاح للتعاقد',
    'about.verify': 'تحقق',
    'about.courses': 'الكورسات والتعلم المستمر',
    'about.course_completed': 'أُنجز',
    'about.course_certificate': 'الشهادة',
    'about.present': 'حتى الآن',
    'about.experience': 'المسيرة المهنية والخبرات',
    'about.education': 'الخلفية الأكاديمية والتعليم',
    'about.certificates': 'الشهادات والاعتمادات الموثقة',
    'about.download_cv': 'تحميل السيرة الذاتية (PDF)',
    'about.contact_direct': 'بدء تواصل مباشر',

    // Contact & Start Project
    'contact.badge': 'قنوات التواصل المباشرة',
    'contact.title': 'تواصل معي أو اطلب استشارة',
    'contact.subtitle': 'تواصل مباشرة لمناقشة العقود البرمجية، الاستشارات التقنية، أو المشاريع المخصصة.',
    'contact.name': 'الاسم بالكامل',
    'contact.email': 'البريد الإلكتروني',
    'contact.subject': 'موضوع الرسالة',
    'contact.message': 'تفاصيل الرسالة أو الاستفسار',
    'contact.send': 'إرسال الرسالة',
    'contact.sending': 'جاري الإرسال...',
    'contact.success': 'تم إرسال رسالتك بنجاح! سيقوم براء بالرد عليك خلال أقل من 24 ساعة.',

    // Start Project
    'start_project.badge': 'نموذج طلب مشروع جديد',
    'start_project.title': 'أطلق فكرة مشروعك معنا',
    'start_project.subtitle': 'أرسل تفاصيل مشروعك لتحليله وتقييمه فورياً بواسطة الذكاء الاصطناعي وتحديد النطاق الهندسي.',
    'start_project.project_type': 'نوع المشروع المطلوب',
    'start_project.budget': 'الميزانية التقديرية للاستثمار',
    'start_project.timeline': 'الجدول الزمني المستهدف للتسليم',
    'start_project.description': 'أهداف المشروع والميزات المطلوبة بالتفصيل',
    'start_project.company': 'اسم الشركة / المؤسسة (اختياري)',
    'start_project.communication': 'قناة التواصل المفضلة',
    'start_project.submit': 'إرسال الطلب للتقييم الفوري بالذكاء الاصطناعي',
    'start_project.submitting': 'جاري التحليل بالذكاء الاصطناعي والتسجيل...',
    'start_project.success_title': 'تم استلام وتحليل طلبك بنجاح!',
    'start_project.success_desc': 'تم تقييم مشروعك بواسطة نموذج الذكاء الاصطناعي وتم تسجيله في قائمة الأولويات للمتابعة الفورية.',

    // AI Modal & Assistant
    'ai.assistant_title': 'مساعد براء الذكي',
    'ai.assistant_subtitle': 'مستشار تقني ذكي مدعوم بنظام الـ RAG',
    'ai.ask_anything': 'اسأل عن أي شيء يخص خبرات براء ومشاريعها، أو كيف تبني فكرتك...',
    'ai.advisor_title': 'مستشار ومخطط المشاريع بالذكاء الاصطناعي',
    'ai.advisor_desc': 'صف فكرة تطبيقك أو مشروعك للحصول على مقترح معماري فوري، واقتراح أفضل حزمة تقنيات (Tech Stack)، وتقدير التكلفة والمدة مدعوماً بـ Gemini.',
    'ai.idea_placeholder': 'صف ما تريد بناءه (مثال: "متجر إلكتروني ذكي عالي السرعة مع دعم فني آلي بالذكاء الاصطناعي وتوقع ذكي للمخزون")...',
    'ai.analyze_btn': 'تحليل الفكرة وتوليد المقترح الفني',
    'ai.analyzing': 'جاري إعداد المقترح الهندسي...',

    // Footer
    'footer.rights': 'جميع الحقوق التقنية محفوظة.',
    'footer.made_with': 'تمت الهندسة باستخدام TypeScript وTailwind CSS ومحرك Gemini الذكي.',
    'footer.quick_links': 'روابط سريعة',
    'footer.services': 'أبرز الخدمات',
    'footer.contact_info': 'بيانات الاتصال المباشرة'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  direction: 'rtl',
  isArabic: true,
  toggleLanguage: () => {},
  setLanguage: () => {},
  t: (key: string, defaultText?: string) => defaultText || key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = storageGet('local', 'baraa_lang');
    if (saved === 'ar' || saved === 'en') return saved;
    return 'ar'; // Default to Arabic as requested
  });

  const isArabic = language === 'ar';
  const direction = isArabic ? 'rtl' : 'ltr';

  useEffect(() => {
    storageSet('local', 'baraa_lang', language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    
    // Add/remove font family or RTL classes if helpful
    if (isArabic) {
      document.documentElement.classList.add('font-arabic');
    } else {
      document.documentElement.classList.remove('font-arabic');
    }
  }, [language, direction, isArabic]);

  const toggleLanguage = () => {
    setLanguageState(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English if not found in Arabic
    if (translations.en[key]) {
      return translations.en[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        direction,
        isArabic,
        toggleLanguage,
        setLanguage,
        t
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
