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
  ContactMessage,
  ProjectLead,
  KnowledgeDocument,
  KnowledgeChunk,
  SiteSettings,
  MethodologyStep,
  EngineeringPrinciple,
  ArchitectureNode,
  FormConfig
} from '../types';

const API_BASE = '/api';
// The admin session lives in an HttpOnly cookie (unreadable by scripts). Only a non-secret hint
// is kept so public pages do not call /api/auth/check for every visitor.
const LEGACY_TOKEN_KEY = 'baraa_admin_token';
const ADMIN_HINT_KEY = 'baraa_admin_hint';
export const AUTH_EXPIRED_EVENT = 'baraa:auth-expired';

/** Error thrown for any non-2xx API response. `status` is the HTTP status (0 = network error). */
export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function safeStorageGet(storage: 'local' | 'session', key: string): string | null {
  try {
    return (storage === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(storage: 'local' | 'session', key: string, value: string | null) {
  try {
    const s = storage === 'local' ? window.localStorage : window.sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    /* storage unavailable (private mode / blocked) */
  }
}

/** True when this browser has (probably) signed in to the admin; the cookie decides for real. */
export function hasAdminHint(): boolean {
  return safeStorageGet('local', ADMIN_HINT_KEY) === '1';
}

export function setAdminHint(signedIn: boolean) {
  safeStorageSet('local', ADMIN_HINT_KEY, signedIn ? '1' : null);
  // Tokens stored by older versions are removed: they were readable by any script on the page.
  safeStorageSet('local', LEGACY_TOKEN_KEY, null);
}

function getSessionId(): string {
  let sid = safeStorageGet('session', 'baraa_session_id');
  if (!sid) {
    sid = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    safeStorageSet('session', 'baraa_session_id', sid);
  }
  return sid;
}

let analyticsEnabled = true;
/** Mirrors the admin "Analytics Tracking" setting so the client stops sending events when disabled. */
export function setAnalyticsEnabled(enabled: boolean) {
  analyticsEnabled = enabled;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  session?: boolean;
  /** Do not broadcast AUTH_EXPIRED_EVENT on 401 (used by checkAuth). */
  quiet401?: boolean;
  /** Internal: this is the single retry after refreshing a stale CSRF token. */
  csrfRetry?: boolean;
}

// CSRF token of the current admin session. Kept in memory only (never in storage or a cookie);
// it comes from the login / auth-check responses and is re-fetched after a page reload.
let csrfToken: string | null = null;

function rememberCsrf(value: unknown) {
  csrfToken = typeof value === 'string' && value ? value : null;
}

/** Re-reads the CSRF token of the current cookie session (e.g. after another tab signed in again). */
async function refreshCsrfToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/check`);
    if (!res.ok) {
      rememberCsrf(null);
      return false;
    }
    const data = await res.json();
    rememberCsrf(data?.csrfToken);
    return Boolean(csrfToken);
  } catch {
    return false;
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const method = opts.method || 'GET';
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  // Same-origin fetch sends the HttpOnly session cookie automatically; writes must also carry the
  // session's CSRF token, which a cross-site page cannot know.
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  if (opts.session) headers['x-session-id'] = getSessionId();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    });
  } catch (e) {
    throw new ApiError('Network error: the server could not be reached.', 0);
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    // Stale CSRF token (e.g. the session was re-created in another tab): refresh it once and retry.
    // If the session itself is gone, the refresh fails and the user is sent to the login page.
    if (res.status === 403 && data?.code === 'CSRF_INVALID' && opts.auth && !opts.csrfRetry) {
      if (await refreshCsrfToken()) return request<T>(path, { ...opts, csrfRetry: true });
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    if (res.status === 401 && opts.auth && !opts.quiet401 && typeof window !== 'undefined') {
      rememberCsrf(null);
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    const message =
      (data && (data.message || data.error)) ||
      (res.status === 429 ? 'Too many requests. Please wait a moment and try again.' : `Request failed (HTTP ${res.status}).`);
    throw new ApiError(String(message), res.status, data);
  }
  if (data === null && text) {
    throw new ApiError('Unexpected non-JSON response from server.', res.status);
  }
  return data as T;
}

export interface KnowledgeState {
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
  totalChunks: number;
  embeddedChunks: number;
  indexedCategories: string[];
  embeddingModel?: string;
  embeddingProviderConfigured?: boolean;
  embeddingPassRunning?: boolean;
  retrievalMode?: 'hybrid' | 'keyword';
}

export const api = {
  // Auth (login/checkAuth resolve with a result object instead of throwing on 4xx)
  async login(password: string): Promise<{ success: boolean; user?: { role: string; name: string }; expiresIn?: number; error?: string }> {
    try {
      const res = await request<{ success: boolean; csrfToken?: string; user?: { role: string; name: string }; expiresIn?: number; error?: string }>(
        '/auth/login',
        { method: 'POST', body: { password } }
      );
      rememberCsrf(res.success ? res.csrfToken : null);
      return { success: res.success, user: res.user, expiresIn: res.expiresIn, error: res.error };
    } catch (e) {
      if (e instanceof ApiError) return { success: false, error: e.message };
      throw e;
    }
  },
  async logout() {
    try {
      await request('/auth/logout', { method: 'POST', auth: true, quiet401: true });
    } catch {
      /* ignore */
    } finally {
      rememberCsrf(null);
    }
  },
  async logoutAllSessions() {
    try {
      return await request<{ success: boolean; sessionsRevoked: number }>('/auth/logout-all', { method: 'POST', auth: true });
    } finally {
      rememberCsrf(null);
    }
  },
  async checkAuth(): Promise<{ authenticated: boolean; user?: { role: string; name: string } }> {
    try {
      const res = await request<{ authenticated: boolean; user?: { role: string; name: string }; csrfToken?: string }>(
        '/auth/check',
        { auth: true, quiet401: true }
      );
      rememberCsrf(res.authenticated ? res.csrfToken : null);
      return { authenticated: res.authenticated, user: res.user };
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        rememberCsrf(null);
        return { authenticated: false };
      }
      throw e;
    }
  },

  // Profile
  getProfile: () => request<Profile>('/profile'),
  updateProfile: (profile: Partial<Profile>) => request<Profile>('/profile', { method: 'PUT', body: profile, auth: true }),

  // Projects
  getProjects: (admin = false) => request<Project[]>(`/projects${admin ? '?all=true' : ''}`, { auth: admin }),
  getProject: (slug: string) => request<Project>(`/projects/${encodeURIComponent(slug)}`),
  createProject: (project: Partial<Project>) => request<Project>('/projects', { method: 'POST', body: project, auth: true }),
  updateProject: (id: string, project: Partial<Project>) =>
    request<Project>(`/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: project, auth: true }),
  deleteProject: (id: string) => request<{ success: boolean }>(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),

  // Services (admin=true includes inactive services)
  getServices: (admin = false) => request<Service[]>(`/services${admin ? '?all=true' : ''}`, { auth: admin }),
  getService: (slug: string) => request<Service>(`/services/${encodeURIComponent(slug)}`),
  createService: (service: Partial<Service>) => request<Service>('/services', { method: 'POST', body: service, auth: true }),
  updateService: (id: string, service: Partial<Service>) =>
    request<Service>(`/services/${encodeURIComponent(id)}`, { method: 'PUT', body: service, auth: true }),
  deleteService: (id: string) => request<{ success: boolean }>(`/services/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),

  // Skills
  getSkills: () => request<Skill[]>('/skills'),
  createSkill: (skill: Partial<Skill>) => request<Skill>('/skills', { method: 'POST', body: skill, auth: true }),
  updateSkill: (id: string, skill: Partial<Skill>) =>
    request<Skill>(`/skills/${encodeURIComponent(id)}`, { method: 'PUT', body: skill, auth: true }),
  deleteSkill: (id: string) => request<{ success: boolean }>(`/skills/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),

  // Blog (all=true returns drafts and requires an admin session)
  getBlogPosts: (all = false) => request<BlogPost[]>(`/blog${all ? '?all=true' : ''}`, { auth: all }),
  getBlogPost: (slug: string) => request<BlogPost>(`/blog/${encodeURIComponent(slug)}`, { auth: hasAdminHint(), quiet401: true }),
  createBlogPost: (post: Partial<BlogPost>) => request<BlogPost>('/blog', { method: 'POST', body: post, auth: true }),
  updateBlogPost: (id: string, post: Partial<BlogPost>) =>
    request<BlogPost>(`/blog/${encodeURIComponent(id)}`, { method: 'PUT', body: post, auth: true }),
  deleteBlogPost: (id: string) => request<{ success: boolean }>(`/blog/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),

  // Experience, education, certificates, courses
  getExperience: (admin = false) => request<Experience[]>(`/experience${admin ? '?all=true' : ''}`, { auth: admin }),
  updateExperience: (exp: Experience[]) => request<Experience[]>('/experience', { method: 'PUT', body: exp, auth: true }),
  getEducation: (admin = false) => request<Education[]>(`/education${admin ? '?all=true' : ''}`, { auth: admin }),
  updateEducation: (edu: Education[]) => request<Education[]>('/education', { method: 'PUT', body: edu, auth: true }),
  getCertificates: (admin = false) => request<Certificate[]>(`/certificates${admin ? '?all=true' : ''}`, { auth: admin }),
  updateCertificates: (certs: Certificate[]) => request<Certificate[]>('/certificates', { method: 'PUT', body: certs, auth: true }),
  getCourses: () => request<Course[]>('/courses'),
  updateCourses: (courses: Course[]) => request<Course[]>('/courses', { method: 'PUT', body: courses, auth: true }),

  // Testimonials (all=true returns unpublished items and requires an admin session)
  getTestimonials: (all = false) => request<Testimonial[]>(`/testimonials${all ? '?all=true' : ''}`, { auth: all }),
  createTestimonial: (t: Partial<Testimonial>) => request<Testimonial>('/testimonials', { method: 'POST', body: t, auth: true }),
  updateTestimonial: (id: string, t: Partial<Testimonial>) =>
    request<Testimonial>(`/testimonials/${encodeURIComponent(id)}`, { method: 'PUT', body: t, auth: true }),
  deleteTestimonial: (id: string) =>
    request<{ success: boolean }>(`/testimonials/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),

  // Contact messages
  sendMessage: (msg: Record<string, any>) => request<ContactMessage>('/messages', { method: 'POST', body: msg, session: true }),
  getMessages: () => request<ContactMessage[]>('/messages', { auth: true }),
  updateMessageStatus: (id: string, status: ContactMessage['status']) =>
    request<{ success: boolean; message?: ContactMessage }>(`/messages/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      body: { status },
      auth: true
    }),
  deleteMessage: (id: string) => request<{ success: boolean }>(`/messages/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),

  // Project leads
  submitLead: (lead: Record<string, any>) => request<ProjectLead>('/leads', { method: 'POST', body: lead, session: true }),
  getLeads: () => request<ProjectLead[]>('/leads', { auth: true }),
  updateLead: (id: string, lead: Partial<Pick<ProjectLead, 'status' | 'priority' | 'notes'>>) =>
    request<ProjectLead>(`/leads/${encodeURIComponent(id)}`, { method: 'PUT', body: lead, auth: true }),
  deleteLead: (id: string) => request<{ success: boolean }>(`/leads/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),

  // AI assistant & tools
  chatWithAI: (params: { message: string; history?: { role: 'user' | 'assistant'; content: string }[] }) =>
    request<{
      text: string;
      cards?: { type: 'project' | 'service' | 'action_brief'; data: any }[];
      retrieval_method?: string;
      degraded?: boolean;
    }>('/ai/chat', { method: 'POST', body: { ...params, sessionId: getSessionId() } }),

  semanticSearch: (query: string) =>
    request<{ projects: Project[]; services: Service[]; blogPosts: BlogPost[]; aiSummary: string; vectorMatch?: boolean }>(
      '/ai/semantic-search',
      { method: 'POST', body: { query }, session: true }
    ),

  getProjectAdvice: (params: { idea: string; businessType?: string; targetAudience?: string; budgetRange?: string }) =>
    request<any>('/ai/project-advisor', { method: 'POST', body: params }),

  assistBlogCreation(params: { action: 'titles' | 'outline' | 'intro' | 'seo' | 'faq' | 'summary' | 'improve'; topic: string; currentContent?: string }) {
    return api.getBlogAssistance(params);
  },
  getBlogAssistance: (params: { action: 'titles' | 'outline' | 'intro' | 'seo' | 'faq' | 'summary' | 'improve'; topic: string; currentContent?: string }) =>
    request<{ result: string; content: string }>('/ai/blog-assistant', { method: 'POST', body: params, auth: true }),

  // Knowledge base admin
  async getKnowledge(): Promise<KnowledgeState> {
    const data = await request<any>('/knowledge', { auth: true });
    return {
      documents: data.documents || data.docs || [],
      chunks: data.chunks || [],
      totalChunks: data.totalChunks ?? (data.chunks || []).length,
      embeddedChunks: data.embeddedChunks ?? 0,
      indexedCategories: data.indexedCategories || [],
      embeddingModel: data.embeddingModel,
      embeddingProviderConfigured: data.embeddingProviderConfigured,
      embeddingPassRunning: data.embeddingPassRunning,
      retrievalMode: data.retrievalMode
    };
  },
  reindexKnowledge: () =>
    request<{ success: boolean; chunksCount: number; alreadyEmbedded: number; missingEmbeddings: number; embeddingQueued: boolean; embeddingPassRunning: boolean; embeddingProvider: string | null }>(
      '/knowledge/reindex',
      { method: 'POST', auth: true }
    ),
  createKnowledgeDoc: (doc: { title: string; content: string; source_type?: string }) =>
    request<KnowledgeDocument>('/knowledge/documents', { method: 'POST', body: doc, auth: true }),
  deleteKnowledgeDoc: (id: string) => request<{ success: boolean }>(`/knowledge/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),

  // Analytics & settings
  getAnalytics: () => request<any>('/analytics', { auth: true }),
  async logPageView(path: string) {
    if (!analyticsEnabled) return;
    try {
      await request('/events', {
        method: 'POST',
        body: { event_type: 'page_view', path: String(path).slice(0, 200), metadata: {}, session_id: getSessionId() }
      });
    } catch {
      /* analytics is best-effort */
    }
  },
  getSettings: () => request<SiteSettings>('/settings', { auth: hasAdminHint(), quiet401: true }),
  updateSettings: (settings: Partial<SiteSettings>) => request<SiteSettings>('/settings', { method: 'PUT', body: settings, auth: true }),

  // Forms
  getForms: () => request<FormConfig[]>('/forms', { auth: true }),
  getForm: (slug: string) => request<FormConfig>(`/forms/${encodeURIComponent(slug)}`),
  createForm: (data: Partial<FormConfig>) => request<FormConfig>('/forms', { method: 'POST', body: data, auth: true }),
  updateForm: (slug: string, data: Partial<FormConfig>) =>
    request<FormConfig>(`/forms/${encodeURIComponent(slug)}`, { method: 'PUT', body: data, auth: true }),
  deleteForm: (slug: string) => request<{ success: boolean }>(`/forms/${encodeURIComponent(slug)}`, { method: 'DELETE', auth: true }),

  // Methodology, principles, architecture nodes
  getMethodology: () => request<MethodologyStep[]>('/methodology'),
  updateMethodology: (steps: MethodologyStep[]) => request<MethodologyStep[]>('/methodology', { method: 'PUT', body: steps, auth: true }),
  getPrinciples: () => request<EngineeringPrinciple[]>('/principles'),
  updatePrinciples: (principles: EngineeringPrinciple[]) =>
    request<EngineeringPrinciple[]>('/principles', { method: 'PUT', body: principles, auth: true }),
  getArchitectureNodes: () => request<ArchitectureNode[]>('/architecture-nodes'),
  updateArchitectureNodes: (nodes: ArchitectureNode[]) =>
    request<ArchitectureNode[]>('/architecture-nodes', { method: 'PUT', body: nodes, auth: true })
};
