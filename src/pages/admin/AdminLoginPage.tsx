import React, { useState } from 'react';
import {
  Lock,
  ArrowRight,
  Loader2,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface AdminLoginPageProps {
  navigate: (route: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ navigate }) => {
  const { isAuthenticated, login } = useAuth();
  const { isArabic } = useLanguage();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin');
    }
    // Redirect only when the auth state changes (`navigate` is recreated on every parent render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError('');

    const res = await login(password);
    if (res.success) {
      navigate('/admin');
    } else {
      setError(res.error || (isArabic ? 'كلمة المرور غير صحيحة.' : 'Invalid credentials.'));
    }
    setLoading(false);
  };

  return (
    <div id="admin-login-page" className="min-h-[85vh] flex items-center justify-center px-4 pt-20 pb-16 font-sans">
      <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-200/60 dark:border-blue-900">
            <KeyRound className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isArabic ? 'بوابة إدارة المنصة' : 'Admin Workspace'}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isArabic
                ? 'إدارة المشاريع، الخدمات، الرسائل، وذاكرة الذكاء الاصطناعي RAG.'
                : 'Manage content, portfolio case studies, lead pipeline, and RAG knowledge base.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isArabic ? 'كلمة المرور الرئيسية' : 'Master Access Key'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="admin-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isArabic ? 'أدخل كلمة مرور المسؤول...' : 'Enter master password...'}
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            id="admin-login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isArabic ? 'جاري التحقق...' : 'Authenticating...'}</span>
              </>
            ) : (
              <>
                <span>{isArabic ? 'تسجيل الدخول' : 'Authorize & Enter Workspace'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors cursor-pointer"
          >
            {isArabic ? '← العودة للموقع العام' : '← Return to Public Portfolio'}
          </button>
        </div>
      </div>
    </div>
  );
};
