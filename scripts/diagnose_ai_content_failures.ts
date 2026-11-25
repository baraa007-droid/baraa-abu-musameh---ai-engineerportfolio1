import { chatWithBaraaAI, semanticPortfolioSearch } from '../server/ai';

const cases = [
  ['TC-01', 'مرحبا، شو بتعمل بالزبط ومين انت؟'],
  ['TC-03', 'بقدر أشتغل معك على مشروعي وأنت في غزة؟'],
  ['TC-05', 'شو خبرتك في بناء المتاجر الإلكترونية؟'],
  ['TC-06', 'ما هي المؤهلات الأكاديمية والشهادات التي حصل عليها المهندس براء؟'],
  ['TC-07', 'يرجى تقديم تفاصيل معمارية مشروع NeuroDoc ومعدل دقة استرجاع البيانات.'],
  ['TC-10', 'هل يتضمن تسليم المشاريع الكود المصدري الكامل وضمان النشر؟'],
  ['TC-11', 'بدي أعمل AI chatbot للشركة تبعتي، شو الـ architecture المناسب؟'],
  ['TC-12', 'هل بتستخدم Next.js 14 مع Tailwind CSS في مشاريع الـ frontend؟'],
  ['TC-13', 'شو الفرق عندك بين الـ keyword search والـ vector embeddings في الـ RAG؟'],
  ['TC-14', 'بقدر أربط الـ database تبعتي بـ pgvector مع Gemini API؟'],
  ['TC-15', 'عندي فكرة SaaS Platform، كم الـ lead time المتوقع للـ MVP؟'],
  ['TC-18', 'What are your freelance services and starting rates?'],
  ['TC-21', 'بدي أعمل منصة تعليمية ذكية للطلاب فيها AI Tutor يجاوب على أسئلة الكتب، شو بتنصحني بالمعمارية؟'],
  ['TC-22', 'I want to build a real estate lead generation portal with AI valuation. What MVP features and stack do you recommend?'],
  ['TC-23', 'عندي متجر ملابس وبدي أضيف خاصية البحث بالصور والذكاء الاصطناعي، شو الخطوات؟'],
  ['TC-24', 'We need an automated PDF invoice parser that extracts tables and validates tax. What is the recommended approach?'],
  ['TC-25', 'بدي أعمل SaaS لإدارة حجوزات العيادات الطبية، قديش بكلف ووقت التنفيذ؟'],
  ['TC-26', "What was Baraa's role at Apex Intelligent Systems?"],
  ['TC-29', 'ما هي الشهادات المهنية التي يحملها براء؟'],
  ['TC-30', 'What rating did Marcus Vance from OmniTech give Baraa?'],
  ['TC-32', 'هل صنع براء كمبيوتر كمي في عام 2012؟'],
  ['TC-41', 'What is RAG (Retrieval-Augmented Generation) and how does it prevent hallucinations?'],
  ['TC-42', 'شو الفرق بين الـ RAG والـ Fine-tuning في نماذج الذكاء الاصطناعي؟'],
  ['TC-43', 'When should I choose PostgreSQL with pgvector over a standalone vector database like Pinecone?'],
  ['TC-44', 'كيف بحافظ على أمان الـ API keys في تطبيقات الويب؟'],
  ['TC-45', 'Explain what an autonomous AI agent with tool calling is.'],
  ['TC-50', 'اسعار الخدمات وتكلفة المشاريع']
] as const;

for (const [id, prompt] of cases) {
  let text: string;
  let degraded: boolean | undefined;
  let retrieval: string | undefined;
  if (id === 'TC-50') {
    const result = await semanticPortfolioSearch(prompt);
    text = `${result.aiSummary} ${result.projects.map((p) => p.title).join(' ')} ${result.services.map((s) => `${s.title} ${s.starting_price || ''}`).join(' ')}`;
  } else {
    const result = await chatWithBaraaAI({ message: prompt });
    text = result.text;
    degraded = result.degraded;
    retrieval = result.retrieval_method;
  }
  console.log(JSON.stringify({ id, prompt, degraded, retrieval, text: text.replace(/\s+/g, ' ').slice(0, 700) }));
}
