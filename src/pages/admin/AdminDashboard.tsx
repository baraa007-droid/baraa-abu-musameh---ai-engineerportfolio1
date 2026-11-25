import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  TrendingUp,
  Users,
  Mail,
  Layers,
  Cpu,
  BookOpen,
  Sparkles,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  Quote,
  User,
  Database,
  Settings as SettingsIcon,
  Loader2,
  CheckCircle2,
  LogOut,
  ShieldOff,
  ExternalLink
} from 'lucide-react';
import { FormsTab } from './tabs/FormsTab';
import { useAuth } from '../../context/AuthContext';
import { api, KnowledgeState } from '../../lib/api';
import {
  Project,
  Service,
  BlogPost,
  ProjectLead,
  ContactMessage,
  Skill,
  KnowledgeDoc,
  SiteSettings,
  Experience,
  Education,
  Certificate,
  Course,
  Testimonial,
  Profile,
  MethodologyStep,
  EngineeringPrinciple,
  ArchitectureNode
} from '../../types';

import { OverviewTab } from './tabs/OverviewTab';
import { LeadsTab } from './tabs/LeadsTab';
import { MessagesTab } from './tabs/MessagesTab';
import { ProjectsTab } from './tabs/ProjectsTab';
import { ServicesTab } from './tabs/ServicesTab';
import { BlogTab } from './tabs/BlogTab';
import { SkillsTab } from './tabs/SkillsTab';
import { ExperienceTab } from './tabs/ExperienceTab';
import { EducationTab } from './tabs/EducationTab';
import { CoursesTab } from './tabs/CoursesTab';
import { TestimonialsTab } from './tabs/TestimonialsTab';
import { ProfileTab } from './tabs/ProfileTab';
import { KnowledgeTab } from './tabs/KnowledgeTab';
import { SettingsTab } from './tabs/SettingsTab';
import { MethodologyTab } from './tabs/MethodologyTab';
import { PrinciplesTab } from './tabs/PrinciplesTab';
import { ArchitectureTab } from './tabs/ArchitectureTab';
import { errorText } from '../../lib/content';

interface AdminDashboardProps {
  navigate: (route: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ navigate }) => {
  const { isAuthenticated, isLoading, logout, logoutAll } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'leads'
    | 'messages'
    | 'projects'
    | 'services'
    | 'blog'
    | 'skills'
    | 'experience'
    | 'education'
    | 'courses'
    | 'testimonials'
    | 'profile'
    | 'knowledge'
    | 'settings'
    | 'forms'
    | 'methodology'
    | 'principles'
    | 'architecture'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [statusNotice, setStatusNotice] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, []);

  // Data states
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [leads, setLeads] = useState<ProjectLead[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeState>({
    documents: [],
    chunks: [],
    totalChunks: 0,
    embeddedChunks: 0,
    indexedCategories: []
  });
  const [methodologySteps, setMethodologySteps] = useState<MethodologyStep[]>([]);
  const [principles, setPrinciples] = useState<EngineeringPrinciple[]>([]);
  const [architectureNodes, setArchitectureNodes] = useState<ArchitectureNode[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    loadAllData();
    // Intentionally keyed on auth state only: `navigate` and `loadAllData` are recreated on every
    // render, so listing them would reload all 18 sections in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  const loadAllData = async () => {
    setLoading(true);
    // Each section loads independently, so one failing endpoint does not empty the whole dashboard.
    const results = await Promise.allSettled([
      api.getAnalytics(),
      api.getLeads(),
      api.getMessages(),
      api.getProjects(true),
      api.getServices(true),
      api.getBlogPosts(true),
      api.getSkills(),
      api.getExperience(true),
      api.getEducation(true),
      api.getCertificates(true),
      api.getCourses(),
      api.getTestimonials(true),
      api.getProfile(),
      api.getSettings(),
      api.getKnowledge(),
      api.getMethodology(),
      api.getPrinciples(),
      api.getArchitectureNodes()
    ] as const);
    const v = <T,>(r: PromiseSettledResult<T>, fallback: T): T => (r.status === 'fulfilled' && r.value != null ? r.value : fallback);
    const [
      analyticsData, leadsData, messagesData, projectsData, servicesData, blogData, skillsData, expData, eduData,
      certData, courseData, testData, profileData, settingsData, knowledgeData, methodData, principleData, archData
    ] = results;

    setAnalytics(v(analyticsData, null));
    setLeads(v(leadsData, []));
    setMessages(v(messagesData, []));
    setProjects(v(projectsData, []));
    setServices(v(servicesData, []));
    setBlogPosts(v(blogData, []));
    setSkills(v(skillsData, []));
    setExperience(v(expData, []));
    setEducation(v(eduData, []));
    setCertificates(v(certData, []));
    setCourses(v(courseData, []));
    setTestimonials(v(testData, []));
    setProfile(v(profileData, null));
    setSettings(v(settingsData, null));
    setKnowledge(v(knowledgeData, { documents: [], chunks: [], totalChunks: 0, embeddedChunks: 0, indexedCategories: [] }));
    setMethodologySteps(v(methodData, []));
    setPrinciples(v(principleData, []));
    setArchitectureNodes(v(archData, []));

    const failures = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    if (failures.length > 0) {
      console.error('Admin data load failures:', failures.map((f) => f.reason?.message));
      notifyError(`${failures.length} section(s) failed to load: ${failures[0].reason?.message || 'unknown error'}`);
    }
    setLoading(false);
  };

  const notify = (msg: string) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatusIsError(false);
    setStatusNotice(msg);
    statusTimerRef.current = setTimeout(() => {
      setStatusNotice('');
      statusTimerRef.current = null;
    }, 3500);
  };

  const notifyError = (msg: string) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatusIsError(true);
    setStatusNotice(msg);
    statusTimerRef.current = setTimeout(() => {
      setStatusNotice('');
      statusTimerRef.current = null;
    }, 7000);
  };

  /** Wraps a handler so a failed request shows the server's reason instead of failing silently. */
  const withErrors = <A extends unknown[], R>(label: string, fn: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      try {
        return await fn(...args);
      } catch (e) {
        notifyError(`${label} failed: ${errorText(e) || 'unknown error'}`);
        throw e;
      }
    };

  // Handlers
  const handleUpdateLeadStatus = withErrors('Update Lead Status', async (id: string, status: ProjectLead['status']) => {
    const updated = await api.updateLead(id, { status });
    setLeads(prev => prev.map(l => (l.id === id ? updated : l)));
    notify(`Lead status changed to ${status}`);
  });

  const handleUpdateLeadNotes = withErrors('Update Lead Notes', async (id: string, notes: string) => {
    const updated = await api.updateLead(id, { notes });
    setLeads(prev => prev.map(l => (l.id === id ? updated : l)));
    notify('Lead notes saved.');
  });

  const handleDeleteLead = withErrors('Delete Lead', async (id: string) => {
    await api.deleteLead(id);
    setLeads(prev => prev.filter(l => l.id !== id));
    notify('Lead deleted.');
  });

  const handleUpdateMessageStatus = withErrors('Update Message Status', async (id: string, status: ContactMessage['status']) => {
    await api.updateMessageStatus(id, status);
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, status } : m)));
    notify(`Message status updated to ${status}`);
  });

  const handleDeleteMessage = withErrors('Delete Message', async (id: string) => {
    await api.deleteMessage(id);
    setMessages(prev => prev.filter(m => m.id !== id));
    notify('Message deleted.');
  });

  const handleCreateProject = withErrors('Create Project', async (proj: Partial<Project>) => {
    const created = await api.createProject(proj);
    setProjects(prev => [created, ...prev]);
    notify(`Project "${created.title}" created!`);
  });

  const handleUpdateProject = withErrors('Update Project', async (id: string, proj: Partial<Project>) => {
    const updated = await api.updateProject(id, proj);
    setProjects(prev => prev.map(p => (p.id === id ? updated : p)));
    notify(`Project "${updated.title}" updated.`);
  });

  const handleDeleteProject = withErrors('Delete Project', async (id: string) => {
    await api.deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    notify('Project deleted.');
  });

  const handleCreateService = withErrors('Create Service', async (srv: Partial<Service>) => {
    const created = await api.createService(srv);
    setServices(prev => [...prev, created]);
    notify(`Service "${created.title}" created.`);
  });

  const handleUpdateService = withErrors('Update Service', async (id: string, srv: Partial<Service>) => {
    const updated = await api.updateService(id, srv);
    setServices(prev => prev.map(s => (s.id === id ? updated : s)));
    notify(`Service "${updated.title}" updated.`);
  });

  const handleDeleteService = withErrors('Delete Service', async (id: string) => {
    await api.deleteService(id);
    setServices(prev => prev.filter(s => s.id !== id));
    notify('Service deleted.');
  });

  const handleCreatePost = withErrors('Create Post', async (post: Partial<BlogPost>) => {
    const created = await api.createBlogPost(post);
    setBlogPosts(prev => [created, ...prev]);
    notify(`Article "${created.title}" published!`);
  });

  const handleUpdatePost = withErrors('Update Post', async (id: string, post: Partial<BlogPost>) => {
    const updated = await api.updateBlogPost(id, post);
    setBlogPosts(prev => prev.map(b => (b.id === id ? updated : b)));
    notify(`Article "${updated.title}" saved.`);
  });

  const handleDeletePost = withErrors('Delete Post', async (id: string) => {
    await api.deleteBlogPost(id);
    setBlogPosts(prev => prev.filter(b => b.id !== id));
    notify('Article deleted.');
  });

  const handleCreateSkill = withErrors('Create Skill', async (sk: Partial<Skill>) => {
    const created = await api.createSkill(sk);
    setSkills(prev => [...prev, created]);
    notify(`Skill "${created.name}" added.`);
  });

  const handleUpdateSkill = withErrors('Update Skill', async (id: string, sk: Partial<Skill>) => {
    const updated = await api.updateSkill(id, sk);
    setSkills(prev => prev.map(s => (s.id === id ? updated : s)));
    notify(`Skill "${updated.name}" updated.`);
  });

  const handleDeleteSkill = withErrors('Delete Skill', async (id: string) => {
    await api.deleteSkill(id);
    setSkills(prev => prev.filter(s => s.id !== id));
    notify('Skill removed.');
  });

  const handleUpdateExperience = withErrors('Update Experience', async (exp: Experience[]) => {
    await api.updateExperience(exp);
    setExperience(exp);
    notify('Experience milestones updated.');
  });

  const handleUpdateEducation = withErrors('Update Education', async (edu: Education[]) => {
    await api.updateEducation(edu);
    setEducation(edu);
    notify('Education updated.');
  });

  const handleUpdateCertificates = withErrors('Update Certificates', async (certs: Certificate[]) => {
    await api.updateCertificates(certs);
    setCertificates(certs);
    notify('Certificates updated.');
  });

  const handleUpdateCourses = withErrors('Update Courses', async (list: Course[]) => {
    await api.updateCourses(list);
    setCourses(list);
    notify('Courses updated.');
  });

  const handleCreateTestimonial = withErrors('Create Testimonial', async (t: Partial<Testimonial>) => {
    const created = await api.createTestimonial(t);
    setTestimonials(prev => [created, ...prev]);
    notify('Testimonial added.');
  });

  const handleUpdateTestimonial = withErrors('Update Testimonial', async (id: string, t: Partial<Testimonial>) => {
    const updated = await api.updateTestimonial(id, t);
    setTestimonials(prev => prev.map(item => (item.id === id ? updated : item)));
    notify('Testimonial updated.');
  });

  const handleDeleteTestimonial = withErrors('Delete Testimonial', async (id: string) => {
    await api.deleteTestimonial(id);
    setTestimonials(prev => prev.filter(item => item.id !== id));
    notify('Testimonial deleted.');
  });

  const handleUpdateProfile = withErrors('Update Profile', async (p: Partial<Profile>) => {
    const updated = await api.updateProfile(p);
    setProfile(updated);
    notify('Profile updated and synchronized.');
  });

  const handleUpdateSettings = withErrors('Update Settings', async (s: Partial<SiteSettings>) => {
    const updated = await api.updateSettings(s);
    setSettings(updated);
    notify('Site settings saved.');
  });

  const handleReindex = withErrors('Reindex', async () => {
    const res = await api.reindexKnowledge();
    const kData = await api.getKnowledge();
    setKnowledge(kData);
    return res;
  });

  const handleCreateKnowledgeDoc = withErrors('Create Knowledge Doc', async (doc: Partial<KnowledgeDoc>) => {
    if (!doc.title?.trim() || !doc.content?.trim()) throw new Error('Title and content are required.');
    const res = await api.createKnowledgeDoc({ title: doc.title, content: doc.content, source_type: doc.source_type });
    const kData = await api.getKnowledge();
    setKnowledge(kData);
    return res;
  });

  const handleDeleteKnowledgeDoc = withErrors('Delete Knowledge Doc', async (id: string) => {
    const res = await api.deleteKnowledgeDoc(id);
    const kData = await api.getKnowledge();
    setKnowledge(kData);
    return res;
  });

  const handleUpdateMethodology = withErrors('Update Methodology', async (steps: MethodologyStep[]) => {
    const updated = await api.updateMethodology(steps);
    setMethodologySteps(updated);
    notify('Homepage engineering methodology updated.');
  });

  const handleUpdatePrinciples = withErrors('Update Principles', async (prins: EngineeringPrinciple[]) => {
    const updated = await api.updatePrinciples(prins);
    setPrinciples(updated);
    notify('Engineering principles updated.');
  });

  const handleUpdateArchitectureNodes = withErrors('Update Architecture Nodes', async (nodes: ArchitectureNode[]) => {
    const updated = await api.updateArchitectureNodes(nodes);
    setArchitectureNodes(updated);
    notify('Hero architecture nodes updated.');
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-400 font-mono text-xs">Authenticating Admin Workspace...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 space-y-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-zinc-400 font-mono text-xs">Loading Admin CMS Workspace...</p>
      </div>
    );
  }

  const unreadMessagesCount = messages.filter(m => m.status === 'new').length;

  const tabsConfig = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'leads', label: `Inbound Leads (${leads.length})`, icon: Users },
    { id: 'messages', label: `Messages (${unreadMessagesCount})`, icon: Mail },
    { id: 'projects', label: `Projects (${projects.length})`, icon: Layers },
    { id: 'services', label: `Services (${services.length})`, icon: Cpu },
    { id: 'blog', label: `Blog (${blogPosts.length})`, icon: BookOpen },
    { id: 'skills', label: `Skills (${skills.length})`, icon: Sparkles },
    { id: 'methodology', label: `Methodology (${methodologySteps.length})`, icon: Layers },
    { id: 'principles', label: `Principles (${principles.length})`, icon: ShieldCheck },
    { id: 'architecture', label: `Hero Nodes (${architectureNodes.length})`, icon: Cpu },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'education', label: 'Education & Certs', icon: GraduationCap },
    { id: 'courses', label: `Courses (${courses.length})`, icon: BookOpen },
    { id: 'testimonials', label: `Testimonials (${testimonials.length})`, icon: Quote },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'knowledge', label: `RAG Knowledge (${knowledge.chunks.length})`, icon: Database },
    { id: 'forms', label: 'Forms', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <div id="admin-dashboard-root" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Baraa Admin Workspace</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                Production Engine
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View Public Site</span>
            </button>

            <button
              type="button"
              title="Sign out all devices"
              aria-label="Sign out all devices"
              onClick={async () => {
                if (!window.confirm('Sign out every device, including this one? Use this after a suspected password leak.')) return;
                const res = await logoutAll();
                if (res.success) navigate('/admin/login');
                else notifyError(`Sign out all devices failed: ${res.error}`);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldOff className="w-3.5 h-3.5" />
              <span className="hidden md:inline">All Devices</span>
            </button>

            <button
              onClick={() => {
                logout();
                navigate('/admin/login');
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Status Toast */}
        {statusNotice && (
          <div role={statusIsError ? 'alert' : 'status'} className={statusIsError
            ? 'p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2 animate-in fade-in'
            : 'p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 animate-in fade-in'}>
            <CheckCircle2 className={statusIsError ? 'w-4 h-4 shrink-0 text-rose-600' : 'w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400'} />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-medium">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Views */}
        {activeTab === 'overview' && (
          <OverviewTab
            analytics={analytics}
            leads={leads}
            messages={messages}
            chunks={knowledge.chunks}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'leads' && (
          <LeadsTab
            leads={leads}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onUpdateLeadNotes={handleUpdateLeadNotes}
            onDeleteLead={handleDeleteLead}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesTab
            messages={messages}
            onUpdateMessageStatus={handleUpdateMessageStatus}
            onDeleteMessage={handleDeleteMessage}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsTab
            projects={projects}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {activeTab === 'services' && (
          <ServicesTab
            services={services}
            onCreateService={handleCreateService}
            onUpdateService={handleUpdateService}
            onDeleteService={handleDeleteService}
          />
        )}

        {activeTab === 'blog' && (
          <BlogTab
            blogPosts={blogPosts}
            onCreatePost={handleCreatePost}
            onUpdatePost={handleUpdatePost}
            onDeletePost={handleDeletePost}
          />
        )}

        {activeTab === 'skills' && (
          <SkillsTab
            skills={skills}
            onCreateSkill={handleCreateSkill}
            onUpdateSkill={handleUpdateSkill}
            onDeleteSkill={handleDeleteSkill}
          />
        )}

        {activeTab === 'methodology' && (
          <MethodologyTab
            steps={methodologySteps}
            onUpdateAll={handleUpdateMethodology}
          />
        )}

        {activeTab === 'principles' && (
          <PrinciplesTab
            principles={principles}
            onUpdateAll={handleUpdatePrinciples}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureTab
            nodes={architectureNodes}
            onUpdateAll={handleUpdateArchitectureNodes}
          />
        )}

        {activeTab === 'experience' && (
          <ExperienceTab
            experience={experience}
            onUpdateAllExperience={handleUpdateExperience}
          />
        )}

        {activeTab === 'education' && (
          <EducationTab
            education={education}
            certificates={certificates}
            onUpdateEducation={handleUpdateEducation}
            onUpdateCertificates={handleUpdateCertificates}
          />
        )}

        {activeTab === 'courses' && (
          <CoursesTab
            courses={courses}
            onUpdateCourses={handleUpdateCourses}
          />
        )}

        {activeTab === 'testimonials' && (
          <TestimonialsTab
            testimonials={testimonials}
            onCreateTestimonial={handleCreateTestimonial}
            onUpdateTestimonial={handleUpdateTestimonial}
            onDeleteTestimonial={handleDeleteTestimonial}
          />
        )}

        {activeTab === 'profile' && profile && (
          <ProfileTab
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeTab
            knowledge={knowledge}
            onReindex={handleReindex}
            onCreateDoc={handleCreateKnowledgeDoc}
            onDeleteDoc={handleDeleteKnowledgeDoc}
          />
        )}
        {/* Forms Tab */}
        {activeTab === 'forms' && <FormsTab />}

        {activeTab === 'settings' && settings && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>
    </div>
  );
};
