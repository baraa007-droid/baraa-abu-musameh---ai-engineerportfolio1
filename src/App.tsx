import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { FloatingAIAssistant } from './components/ai/FloatingAIAssistant';
import { AIProjectAdvisorModal } from './components/ai/AIProjectAdvisorModal';
import { HomePage } from './pages/HomePage';
const AboutPage = React.lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ServicesPage = React.lazy(() => import('./pages/ServicesPage').then((m) => ({ default: m.ServicesPage })));
const ServiceDetailPage = React.lazy(() => import('./pages/ServiceDetailPage').then((m) => ({ default: m.ServiceDetailPage })));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = React.lazy(() => import('./pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })));
const BlogPage = React.lazy(() => import('./pages/BlogPage').then((m) => ({ default: m.BlogPage })));
const BlogPostPage = React.lazy(() => import('./pages/BlogPostPage').then((m) => ({ default: m.BlogPostPage })));
const ContactPage = React.lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const StartProjectPage = React.lazy(() => import('./pages/StartProjectPage').then((m) => ({ default: m.StartProjectPage })));
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
import { ErrorBoundary } from './components/ErrorBoundary';
import { api, setAnalyticsEnabled } from './lib/api';
import {
  Profile,
  Project,
  Service,
  Skill,
  BlogPost,
  Experience,
  Education,
  Certificate,
  Course,
  Testimonial,
  SiteSettings
} from './types';
import { Sparkles, ArrowUp, Loader2 } from 'lucide-react';
import { GlobalCTA } from './components/cta/GlobalCTA';
import { useSeoMeta } from './hooks/useSeoMeta';

export function AppContent() {
  // Navigation State
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Global Data
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [methodologySteps, setMethodologySteps] = useState<import('./types').MethodologyStep[]>([]);
  const [principles, setPrinciples] = useState<import('./types').EngineeringPrinciple[]>([]);
  const [architectureNodes, setArchitectureNodes] = useState<import('./types').ArchitectureNode[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // AI Assistant Modal State
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiAssistantInitialPrompt, setAiAssistantInitialPrompt] = useState<string | undefined>(undefined);

  // AI Project Advisor Modal State
  const [advisorModalOpen, setAdvisorModalOpen] = useState(false);

  // Scroll to top visibility
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Listen to popstate for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle route navigation
  const navigate = (path: string) => {
    if (path !== currentRoute) {
      window.history.pushState({}, '', path);
      setCurrentRoute(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      api.logPageView(path);
    }
  };

  // Scroll listener for back-to-top
  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Initial Data Fetching
  useEffect(() => {
    const fetchCoreData = async () => {
      // Each resource loads independently: one failing endpoint must not blank the whole site.
      const results = await Promise.allSettled([
        api.getProfile(),
        api.getProjects(),
        api.getServices(),
        api.getSkills(),
        api.getBlogPosts(),
        api.getExperience(),
        api.getEducation(),
        api.getCertificates(),
        api.getCourses(),
        api.getTestimonials(),
        api.getSettings(),
        api.getMethodology(),
        api.getPrinciples(),
        api.getArchitectureNodes()
      ] as const);
      const value = <T,>(r: PromiseSettledResult<T>, fallback: T): T => (r.status === 'fulfilled' && r.value != null ? r.value : fallback);
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) console.error(`Initial data load: ${failed} request(s) failed`, results.filter((r) => r.status === 'rejected').map((r: any) => r.reason?.message));

      const [prof, projs, servs, skls, posts, exp, edu, certs, crs, tests, sets, methods, prins, nodes] = results;
      setProfile(value(prof, null));
      setProjects(value(projs, []));
      setServices(value(servs, []));
      setSkills(value(skls, []));
      setBlogPosts(value(posts, []));
      setExperience(value(exp, []));
      setEducation(value(edu, []));
      setCertificates(value(certs, []));
      setCourses(value(crs, []));
      setTestimonials(value(tests, []));
      const loadedSettings = value(sets, null);
      setSettings(loadedSettings);
      setAnalyticsEnabled(loadedSettings?.analytics_enabled !== false && loadedSettings?.enable_analytics !== false);
      setMethodologySteps(value(methods, []));
      setPrinciples(value(prins, []));
      setArchitectureNodes(value(nodes, []));
      setDataLoaded(true);
      api.logPageView(window.location.pathname || '/');
    };

    fetchCoreData();
  }, []);

  // Admin feature switches (Settings → AI). Disabled features fall back to the human channels.
  const aiAssistantEnabled = settings?.ai_enabled !== false && settings?.enable_ai_assistant !== false;
  const advisorEnabled = settings?.ai_enabled !== false && settings?.enable_project_planner !== false;

  const openAIAssistantWithQuery = (prompt: string) => {
    if (!aiAssistantEnabled) {
      navigate('/contact');
      return;
    }
    setAiAssistantInitialPrompt(prompt);
    setAiAssistantOpen(true);
  };

  const openAdvisorModal = () => {
    if (!advisorEnabled) {
      navigate('/start-project');
      return;
    }
    setAdvisorModalOpen(true);
  };

  const openAssistant = () => {
    setAiAssistantInitialPrompt(undefined);
    if (!aiAssistantEnabled) {
      navigate('/contact');
      return;
    }
    setAiAssistantOpen(true);
  };

  // Global SEO for non-entity pages (entity pages override via their own useSeoMeta call)
  useSeoMeta({ settings, canonicalPath: currentRoute });

  // Simple Router
  const renderCurrentPage = () => {
    // Dynamic Route matching
    if (currentRoute.startsWith('/projects/')) {
      const slug = currentRoute.replace('/projects/', '');
      return (
        <ProjectDetailPage
          slug={slug}
          navigate={navigate}
          openAIAssistantWithQuery={openAIAssistantWithQuery}
          settings={settings}
        />
      );
    }

    if (currentRoute.startsWith('/services/')) {
      const slug = currentRoute.replace('/services/', '');
      return (
        <ServiceDetailPage
          slug={slug}
          navigate={navigate}
          openAIAssistantWithQuery={openAIAssistantWithQuery}
          settings={settings}
        />
      );
    }

    if (currentRoute.startsWith('/blog/')) {
      const slug = currentRoute.replace('/blog/', '');
      return (
        <BlogPostPage
          slug={slug}
          navigate={navigate}
          openAIAssistantWithQuery={openAIAssistantWithQuery}
          settings={settings}
        />
      );
    }

    switch (currentRoute) {
      case '/':
        return (
          <HomePage
            profile={profile}
            projects={projects}
            services={services}
            skills={skills}
            blogPosts={blogPosts}
            testimonials={testimonials}
            methodologySteps={methodologySteps}
            architectureNodes={architectureNodes}
            navigate={navigate}
            openAIAssistantWithQuery={openAIAssistantWithQuery}
            openAdvisorModal={openAdvisorModal}
          />
        );
      case '/about':
        return (
          <AboutPage
            profile={profile}
            experience={experience}
            education={education}
            certificates={certificates}
            courses={courses}
            skills={skills}
            principles={principles}
            navigate={navigate}
            openAdvisorModal={openAdvisorModal}
          />
        );
      case '/services':
        return (
          <ServicesPage
            services={services}
            navigate={navigate}
            openAdvisorModal={openAdvisorModal}
          />
        );
      case '/projects':
        return (
          <ProjectsPage
            projects={projects}
            navigate={navigate}
            openAdvisorModal={openAdvisorModal}
          />
        );
      case '/blog':
        return (
          <BlogPage
            blogPosts={blogPosts}
            navigate={navigate}
          />
        );
      case '/contact':
        return (
          <ContactPage
            profile={profile}
            settings={settings}
            navigate={navigate}
            openAIAssistantWithQuery={openAIAssistantWithQuery}
          />
        );
      case '/start-project':
        return (
          <StartProjectPage
            navigate={navigate}
            openAdvisorModal={openAdvisorModal}
          />
        );
      default: {
        if (currentRoute === '/admin/login') {
          return <AdminLoginPage navigate={navigate} />;
        }
        if (currentRoute === '/admin' || currentRoute.startsWith('/admin/')) {
          return (
            <ErrorBoundary navigate={navigate} fallbackText="Admin Workspace Error">
              <React.Suspense fallback={
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-400 font-mono text-xs space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span>Loading Admin Workspace...</span>
                </div>
              }>
                <AdminDashboard navigate={navigate} />
              </React.Suspense>
            </ErrorBoundary>
          );
        }
        return (
          <HomePage
            profile={profile}
            projects={projects}
            services={services}
            skills={skills}
            blogPosts={blogPosts}
            testimonials={testimonials}
            methodologySteps={methodologySteps}
            architectureNodes={architectureNodes}
            navigate={navigate}
            openAIAssistantWithQuery={openAIAssistantWithQuery}
            openAdvisorModal={openAdvisorModal}
          />
        );
      }
    }
  };

  const isAdminRoute = currentRoute.startsWith('/admin');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors selection:bg-emerald-500 selection:text-white flex flex-col justify-between">
      {/* Top Navbar */}
      <Navbar
        profile={profile}
        currentRoute={currentRoute}
        navigate={navigate}
        openAIAssistant={openAssistant}
        openAdvisorModal={openAdvisorModal}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Keyed by route: an error on one page is contained there and cleared on navigation. */}
        <ErrorBoundary key={currentRoute} navigate={navigate}>
          {/* Non-home pages are code-split; the fallback keeps layout height while a chunk loads. */}
          <React.Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" aria-label="Loading" /></div>}>
            {renderCurrentPage()}
          </React.Suspense>
        </ErrorBoundary>
      </main>

      {/* Global Footer (hidden on admin pages for cleaner layout) */}
      {!isAdminRoute && (
        <Footer
          profile={profile}
          settings={settings}
          navigate={navigate}
          openAIAssistant={openAssistant}
        />
      )}

      {/* Global CTA Banner (sticky bottom, only when enabled in settings) */}
      {!isAdminRoute && (
        <GlobalCTA settings={settings} navigate={navigate} />
      )}

      {/* Floating AI Assistant Launcher Button (Fixed Bottom-Right) */}
      {!aiAssistantOpen && aiAssistantEnabled && !isAdminRoute && (
        <button
          id="floating-ai-launcher"
          onClick={openAssistant}
          className="fixed bottom-5 right-5 z-40 p-3.5 rounded-2xl bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 text-white shadow-2xl hover:scale-105 hover:border-emerald-500/60 transition-all flex items-center gap-2 group"
          title="Ask Baraa AI Assistant"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="hidden sm:flex flex-col text-left pr-1">
            <span className="text-xs font-bold leading-tight flex items-center gap-1">
              Ask Baraa AI
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Grounded RAG</span>
          </div>
        </button>
      )}

      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-5 left-5 z-40 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 shadow-md transition-all hover:scale-105"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* Global AI Assistant Drawer / Modal */}
      <FloatingAIAssistant
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        navigate={navigate}
        initialPrompt={aiAssistantInitialPrompt}
        contactEmail={profile?.email || settings?.contact_email}
      />

      {/* Global AI Project Advisor Modal */}
      <AIProjectAdvisorModal
        isOpen={advisorModalOpen}
        onClose={() => setAdvisorModalOpen(false)}
        navigate={navigate}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
