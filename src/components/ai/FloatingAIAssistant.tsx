import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  RotateCcw,
  ArrowRight,
  Maximize2,
  Minimize2,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, ApiError } from '../../lib/api';
import { Project, Service } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface FloatingAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: (route: string) => void;
  initialPrompt?: string;
  /** Public contact email (from the profile) shown when the assistant is unavailable. */
  contactEmail?: string;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  cards?: {
    type: 'project' | 'service' | 'action_brief';
    data: any;
  }[];
  timestamp: string;
}

const SUGGESTED_PROMPTS = [
  "مين براء أبو مسامح؟",
  "Show me your AI & RAG projects",
  "ما هي الخدمات والأسعار المتاحة؟",
  "عندي فكرة تطبيق وبدي نصيحة في المعمارية",
  "Can you build a custom web app or SaaS?"
];

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  isOpen,
  onClose,
  navigate,
  initialPrompt,
  contactEmail
}) => {
  const { isArabic } = useLanguage();
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      content: isArabic
        ? `مرحباً! أنا **براء AI**، المساعد الذكي ثنائي اللغة لملف براء أبو مسامح.

لديّ معرفة موثقة بـ **مشاريع براء، المعماريات التقنية، خدمات العمل الحر، والأسعار**.

* 🔍 **استكشف المشاريع**: معماريات RAG، تطبيقات ويب متكاملة، تجارة إلكترونية، رؤية حاسوبية
* 💼 **الخدمات والأسعار**: استعرض باقات الخدمات والأسعار والجداول الزمنية كما هي منشورة في الموقع
* 💡 **مستشار المشاريع**: ناقش فكرة مشروعك وتوصيات المعمارية والتقديرات بالعربية أو الإنجليزية`
        : `Hello! I am **Baraa AI**, the bilingual portfolio assistant for Baraa Abu Musameh (براء أبو مسامح).

I have verified knowledge of Baraa's **projects, technical architectures, freelance services, and pricing**.

* 🔍 **Explore Projects**: RAG architectures, full-stack web apps, e-commerce, computer vision
* 💼 **Services & Pricing**: Review service packages, published pricing, and timelines
* 💡 **Project Advisor**: Discuss your project idea, architecture recommendations, and estimates in **Arabic or English**`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const containerRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onClose,
    initialFocusRef: inputRef
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // A question passed in from a page is sent once per opening (refs avoid a stale handler and
  // stop the same prompt from being re-sent when the panel re-renders).
  const handleSendRef = useRef<(text?: string) => void>(() => {});
  const lastAutoPromptRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      lastAutoPromptRef.current = null;
      return;
    }
    if (initialPrompt && lastAutoPromptRef.current !== initialPrompt) {
      lastAutoPromptRef.current = initialPrompt;
      handleSendRef.current(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  const handleSend = async (textToSend?: string): Promise<void> => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: MessageItem = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content
      }));

      const res = await api.chatWithAI({
        message: text,
        history
      });
      if (!res || typeof res.text !== 'string' || !res.text.trim()) {
        throw new Error('empty-response');
      }

      const assistantMsg: MessageItem = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        content: res.text,
        cards: res.cards || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : -1;
      const reason = status === 429
        ? (isArabic ? 'تم تجاوز عدد الطلبات المسموح مؤقتًا. حاول مرة أخرى بعد دقيقة.' : 'Too many requests right now. Please try again in a minute.')
        : status === 0
          ? (isArabic ? 'تعذّر الاتصال بالخادم. تحقّق من اتصالك ثم أعد المحاولة.' : 'The server could not be reached. Check your connection and try again.')
          : (isArabic ? 'تعذّر الحصول على رد من المساعد الآن.' : 'The assistant could not answer right now.');
      const contact = contactEmail ? (isArabic ? ` يمكنك التواصل مباشرة عبر **${contactEmail}**.` : ` You can also reach out directly via **${contactEmail}**.`) : '';
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'assistant',
          content: reason + contact,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  handleSendRef.current = (text?: string) => { void handleSend(text); };

  const resetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        content: "Session reset. How can I assist you with technical architectures, project estimations, or services today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div
      id="floating-ai-assistant-modal"
      className={`fixed z-50 transition-all duration-200 ${
        isExpanded
          ? 'inset-3 md:inset-8 flex flex-col'
          : 'bottom-4 right-4 w-[94vw] sm:w-[460px] h-[620px] max-h-[88vh] flex flex-col'
      }`}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-assistant-title"
        tabIndex={-1}
        className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 text-slate-800 dark:text-slate-200 focus:outline-none"
      >
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span id="ai-assistant-title">{isArabic ? 'مساعد براء الذكي' : 'Baraa AI Assistant'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800">
                  RAG Core
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>{isArabic ? 'متصل بقاعدة المعرفة الشعاعية' : 'Vector Grounded & Ready'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <button
              id="ai-reset-chat-button"
              onClick={resetChat}
              title={isArabic ? 'إعادة ضبط المحادثة' : 'Reset conversation'}
              aria-label={isArabic ? 'إعادة ضبط المحادثة' : 'Reset conversation'}
              className="p-1.5 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              id="ai-toggle-expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? (isArabic ? 'تصغير' : 'Minimize') : (isArabic ? 'تكبير' : 'Expand')}
              aria-label={isExpanded ? 'Minimize' : 'Expand'}
              className="p-1.5 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:block cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              id="ai-close-modal-button"
              onClick={onClose}
              title={isArabic ? 'إغلاق المساعد' : 'Close assistant'}
              aria-label={isArabic ? 'إغلاق المساعد' : 'Close assistant'}
              className="p-1.5 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Area */}
        <div
          id="ai-messages-scroll-area"
          className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 dark:bg-slate-950/50 text-xs"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 flex-shrink-0 flex items-center justify-center mt-0.5 border border-blue-200 dark:border-blue-900">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div className={`max-w-[88%] space-y-1.5`}>
                <div
                  className={`p-3.5 rounded-2xl ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs shadow-xs'
                  }`}
                >
                  <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed font-sans">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>

                {/* Render Rich Tool Cards if attached */}
                {m.cards && m.cards.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {m.cards.map((card, cIdx) => {
                      if (card.type === 'project') {
                        const proj: Project = card.data;
                        return (
                          <div
                            key={`card-${cIdx}`}
                            className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-blue-500/50 transition-colors shadow-xs"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800">
                                {proj.category}
                              </span>
                              <span className="text-slate-400 font-mono">Case Study</span>
                            </div>
                            <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                              {proj.title}
                            </h5>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                              {proj.short_description}
                            </p>
                            <button
                              onClick={() => {
                                navigate(`/projects/${proj.slug}`);
                                onClose();
                              }}
                              className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>Explore Case Study</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      }

                      if (card.type === 'service') {
                        const srv: Service = card.data;
                        return (
                          <div
                            key={`card-${cIdx}`}
                            className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {srv.title}
                              </span>
                              <span className="text-slate-900 dark:text-white font-bold font-mono">
                                {srv.currency ? `${srv.currency} ` : ''}{srv.starting_price}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              {srv.short_description}
                            </p>
                            <button
                              onClick={() => {
                                navigate(`/services/${srv.slug}`);
                                onClose();
                              }}
                              className="w-full py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>View Service Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      }

                      if (card.type === 'action_brief') {
                        const brief = card.data;
                        return (
                          <div
                            key={`card-${cIdx}`}
                            className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Generated Project Specification</span>
                            </div>
                            <div className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300">
                              <div><span className="font-semibold text-slate-500">Type:</span> {brief.projectType}</div>
                              <div><span className="font-semibold text-slate-500">Timeline:</span> {brief.estimatedTimeline}</div>
                              <div><span className="font-semibold text-slate-500">Budget:</span> {brief.estimatedBudget}</div>
                            </div>
                            <button
                              onClick={() => {
                                navigate('/start-project');
                                onClose();
                              }}
                              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <span>Transfer to Project Intake</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                <div className="text-[9px] text-slate-400 dark:text-slate-500 px-1">
                  {m.timestamp}
                </div>
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 pl-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                {isArabic ? 'جاري استرجاع البيانات وتحليل السياق...' : 'Analyzing RAG vector knowledge base...'}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts pills */}
        {messages.length <= 2 && (
          <div className="px-3 py-2 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-850 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors flex-shrink-0 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            id="ai-assistant-input-field"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isArabic ? 'اطرح سؤالاً عن المشاريع، المعمارية، أو الأسعار...' : 'Ask about architecture, RAG systems, pricing...'}
            disabled={isLoading}
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            id="ai-send-message-button"
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
