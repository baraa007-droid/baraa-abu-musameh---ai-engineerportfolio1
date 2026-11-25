import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Profile } from '../../types';
import {
  Sparkles,
  Sun,
  Moon,
  Menu,
  X,
  ArrowRight,
  Shield,
  Code2,
  Globe,
  Terminal
} from 'lucide-react';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
  openAIAssistant: () => void;
  openAdvisorModal: () => void;
  profile?: Profile | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  navigate,
  openAIAssistant,
  openAdvisorModal,
  profile
}) => {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { language, toggleLanguage, isArabic, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: t('nav.overview', 'Overview'), path: '/' },
    { label: t('nav.projects', 'Projects'), path: '/projects' },
    { label: t('nav.services', 'Services'), path: '/services' },
    { label: t('nav.about', 'About & Bio'), path: '/about' },
    { label: t('nav.blog', 'Articles'), path: '/blog' },
    { label: t('nav.contact', 'Contact'), path: '/contact' }
  ];

  return (
    <header
      id="main-navbar"
      className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Identity */}
        <button
          id="nav-brand-logo"
          onClick={() => {
            navigate('/');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-3 group text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-sm group-hover:bg-blue-600 dark:group-hover:bg-blue-500 transition-colors">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{isArabic ? 'براء أبو مسامح' : (profile?.name || 'Baraa Abu Musameh')}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Available for projects" />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {profile?.title || (isArabic ? 'مهندس ذكاء اصطناعي وبرمجيات' : 'AI Systems & Web Engineer')}
            </div>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav id="desktop-nav-links" className="hidden lg:flex items-center gap-1 text-sm font-medium">
          {navLinks.map(link => {
            const isActive = currentRoute === link.path || (link.path !== '/' && currentRoute.startsWith(link.path));
            return (
              <button
                key={link.path}
                id={`nav-link-${link.path.replace('/', '') || 'home'}`}
                onClick={() => navigate(link.path)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Action Controls & CTA */}
        <div className="hidden md:flex items-center gap-2">
          {/* AI Project Advisor */}
          <button
            id="nav-ai-advisor-button"
            onClick={openAdvisorModal}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 flex items-center gap-1.5 transition-colors cursor-pointer"
            title={t('nav.ai_advisor', 'AI Project Advisor')}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden xl:inline">{isArabic ? 'مستشار المشاريع' : 'AI Advisor'}</span>
          </button>

          {/* Ask AI Copilot */}
          <button
            id="nav-ask-ai-button"
            onClick={openAIAssistant}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 flex items-center gap-1.5 transition-colors cursor-pointer"
            title={t('nav.ask_ai', 'Ask Baraa AI')}
          >
            <Terminal className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span className="hidden xl:inline">{isArabic ? 'اسأل الذكاء الاصطناعي' : 'Ask AI'}</span>
          </button>

          {/* Language Switcher */}
          <button
            id="nav-language-toggle"
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="font-semibold">{language === 'en' ? 'عربي' : 'EN'}</span>
          </button>

          {/* Theme Switcher */}
          <button
            id="nav-theme-toggle"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Admin Button (if auth) */}
          {isAuthenticated && (
            <button
              id="nav-admin-dashboard-btn"
              onClick={() => navigate('/admin')}
              className="p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
              title="Admin Portal"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}

          {/* Primary CTA */}
          <button
            id="nav-start-project-btn"
            onClick={() => navigate('/start-project')}
            className="ml-1 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <span>{t('nav.start_project', 'Start a Project')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Menu Trigger & Controls */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {language === 'en' ? 'عربي' : 'EN'}
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            id="nav-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-drawer" className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 px-4 pt-3 pb-6 space-y-3 shadow-xl">
          <div className="space-y-1">
            {navLinks.map(link => {
              const isActive = currentRoute === link.path || (link.path !== '/' && currentRoute.startsWith(link.path));
              return (
                <button
                  key={link.path}
                  onClick={() => {
                    navigate(link.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{link.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <button
              onClick={() => {
                openAdvisorModal();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isArabic ? 'استشر مستشار المشاريع الذكي' : 'AI Project Scoper & Advisor'}</span>
            </button>

            <button
              onClick={() => {
                openAIAssistant();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 flex items-center justify-center gap-2"
            >
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <span>{isArabic ? 'محادثة المساعد الذكي' : 'Ask Baraa AI Copilot'}</span>
            </button>

            <button
              onClick={() => {
                navigate('/start-project');
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{t('nav.start_project', 'Start a Project')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {isAuthenticated && (
              <button
                onClick={() => {
                  navigate('/admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center gap-2"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
