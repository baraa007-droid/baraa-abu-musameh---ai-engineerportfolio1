import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { FormConfig, FormField } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { errorText } from '../lib/content';

interface DynamicFormProps {
  slug: string;
  onSuccess?: (result: any) => void;
  submitButtonText?: string;
  successMessage?: string;
  initialValues?: Record<string, any>;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  slug,
  onSuccess,
  submitButtonText,
  successMessage,
  initialValues = {}
}) => {
  const { isArabic } = useLanguage();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>(initialValues);
  // Prefill is read once when the form config loads (later prop identity changes are ignored).
  const initialValuesRef = useRef(initialValues);
  // Honeypot (spam trap): hidden from people and assistive tech; bots tend to fill it.
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch form configuration
  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const cfg = await api.getForm(slug);
        if (isMounted) {
          setFormConfig(cfg);

          // Initialize defaults only for fields this form actually has. Selects start empty
          // ("choose…") instead of silently submitting the first option as the visitor's answer.
          // Prefilled values are kept only when the server will accept them.
          const defaults: Record<string, any> = {};
          for (const field of cfg.fields || []) {
            const initial = initialValuesRef.current[field.key];
            const options = field.options || [];
            if (field.type === 'checkbox') {
              defaults[field.key] = Array.isArray(initial) ? initial.filter((v: unknown) => typeof v === 'string' && options.includes(v)) : [];
            } else if (field.type === 'select' || field.type === 'radio') {
              // Only values that exist as options: anything else would render as "-- Select --" while submitting a hidden value.
              defaults[field.key] = typeof initial === 'string' && options.includes(initial) ? initial : '';
            } else {
              defaults[field.key] = typeof initial === 'string' || typeof initial === 'number' ? String(initial) : '';
            }
          }
          setFormData(defaults);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(errorText(err) || 'Failed to load form configuration.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchConfig();
    return () => { isMounted = false; };
  }, [slug]);

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleCheckboxToggle = (key: string, optionValue: string) => {
    setFormData(prev => {
      const currentList: string[] = Array.isArray(prev[key]) ? prev[key] : [];
      const updated = currentList.includes(optionValue)
        ? currentList.filter(o => o !== optionValue)
        : [...currentList, optionValue];
      return { ...prev, [key]: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConfig) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      let result;
      if (slug === 'contact') {
        result = await api.sendMessage({ ...formData, _hp: honeypot });
      } else if (slug === 'lead') {
        // Parse reference links if present as string
        const payload: Record<string, any> = { ...formData, _hp: honeypot };
        if (typeof payload.reference_links === 'string') {
          payload.reference_links = payload.reference_links
            .split(/[\s,]+/)
            .map((s: string) => s.trim())
            .filter((s: string) => {
              try { return ['http:', 'https:'].includes(new URL(s).protocol); }
              catch { return false; }
            });
        }
        result = await api.submitLead(payload);
      } else {
        // Generic fallback to messages
        result = await api.sendMessage(formData);
      }

      setIsSuccess(true);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setErrorMessage(errorText(err) || 'Submission failed. Please check required fields and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-xs font-mono">{isArabic ? 'جاري تحميل النموذج...' : 'Loading dynamic form...'}</span>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
        {errorMessage || 'Form is currently unavailable.'}
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
        <h4 className="text-lg font-bold text-slate-900 dark:text-white">
          {successMessage || (isArabic ? 'تم استلام البيانات بنجاح!' : 'Submission Received Successfully!')}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
          {isArabic
            ? 'شكراً لتواصلك. سأقوم بمراجعة التفاصيل والرد عليك في أقرب وقت.'
            : 'Thank you! Your information has been securely dispatched and will be reviewed shortly.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setIsSuccess(false);
            setFormData(initialValues);
          }}
          className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
        >
          {isArabic ? 'إرسال رد آخر' : 'Submit Another Response'}
        </button>
      </div>
    );
  }

  const enabledFields = (formConfig.fields || [])
    .filter(f => f.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Clipped in place (no off-screen offset: in RTL a negative offset would widen the page). */}
      <div aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: 0 }}>
        <label>
          Leave this field empty
          <input type="text" name="_hp" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </label>
      </div>
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {errorMessage}
        </div>
      )}

      <div className="space-y-4">
        {enabledFields.map((field: FormField) => {
          const val = formData[field.key];

          return (
            <div key={field.key} className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {field.label}
                {field.required && <span className="text-rose-500 ml-1">*</span>}
              </label>

              {/* Textarea */}
              {field.type === 'textarea' && (
                <textarea
                  rows={4}
                  required={field.required}
                  value={val ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder || ''}
                  className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}

              {/* Select */}
              {field.type === 'select' && (
                <select
                  required={field.required}
                  value={val ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">{field.placeholder || (isArabic ? '-- اختر --' : '-- Select --')}</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {/* Radio Group */}
              {field.type === 'radio' && (
                <div className="space-y-2 pt-1">
                  {(field.options || []).map((opt) => (
                    <label key={opt} className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name={field.key}
                        required={field.required && !val}
                        value={opt}
                        checked={val === opt}
                        onChange={() => handleChange(field.key, opt)}
                        className="w-4 h-4 text-blue-600 accent-blue-600 focus:ring-blue-500"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Checkbox Group */}
              {field.type === 'checkbox' && (
                <div className="space-y-2 pt-1">
                  {(field.options || []).map((opt) => {
                    const isChecked = Array.isArray(val) && val.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxToggle(field.key, opt)}
                          className="w-4 h-4 rounded text-blue-600 accent-blue-600 focus:ring-blue-500"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Standard Inputs: text, email, url, number, date, phone */}
              {['text', 'email', 'url', 'number', 'date', 'phone'].includes(field.type) && (
                <input
                  type={field.type === 'phone' ? 'tel' : field.type}
                  required={field.required}
                  value={val ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder || ''}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-6"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{isArabic ? 'جاري الإرسال...' : 'Transmitting message...'}</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>{submitButtonText || (isArabic ? 'إرسال النموذج الآن' : 'Submit Form')}</span>
          </>
        )}
      </button>
    </form>
  );
};
