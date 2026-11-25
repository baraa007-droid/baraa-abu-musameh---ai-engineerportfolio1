export interface Profile {
  name: string;
  title: string;
  headline: string;
  bio: string;
  about_long: string;
  email: string;
  phone?: string;
  location: string;
  avatar_url: string;
  resume_url?: string;
  github_url: string;
  linkedin_url: string;
  twitter_url?: string;
  available_for_freelance: boolean;
  years_experience: number;
  completed_projects: number;
  client_satisfaction: number;
  satisfaction_rate?: string;
  target_latency?: string;
  focus_areas: string[];
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  full_description?: string;
  description?: string;
  problem?: string;
  problem_statement?: string;
  solution?: string;
  solution_overview?: string;
  results: string[];
  architecture?: string;
  category: string;
  technologies: string[];
  features: string[];
  screenshots?: string[];
  cover_image: string;
  image_url?: string;
  github_url?: string;
  live_url?: string;
  featured: boolean;
  /** Public visibility; omitted legacy records remain public for backwards compatibility. */
  published?: boolean;
  order?: number;
  status?: 'completed' | 'in-progress' | 'maintenance';
  completion_date?: string;
  challenges?: string[];
  lessons_learned?: string[];
  lead_time?: string;
  tags?: string[];
  seo_title?: string;
  seo_description?: string;
  og_image?: string;
  gallery?: string[];
}

export interface Service {
  id: string;
  slug: string;
  title: string;
  category: string;
  short_description: string;
  full_description?: string;
  description?: string;
  icon?: string;
  features: string[];
  technologies?: string[];
  deliverables?: string[];
  process?: { step: string; title: string; description: string }[];
  timeline: string;
  starting_price: string;
  currency?: string;
  warranty_terms?: string;
  faq?: { question: string; answer: string }[];
  active?: boolean;
  order?: number;
  featured?: boolean;
  seo_title?: string;
  seo_description?: string;
  og_image?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: 'Programming' | 'AI & Machine Learning' | 'Web & Cloud' | 'Tools & DevOps' | 'Architecture & Design' | string;
  proficiency: number; // 0-100
  icon?: string;
  years_experience?: number;
  featured?: boolean;
  order?: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category: string;
  tags: string[];
  read_time: string;
  published: boolean;
  published_at: string;
  author_name?: string;
  author?: string;
  author_avatar?: string;
  views?: number;
  views_count?: number;
  seo_title?: string;
  seo_description?: string;
  og_image?: string;
}

export interface Experience {
  id: string;
  role: string;
  position?: string;
  type?: string;
  company: string;
  company_url?: string;
  location: string;
  start_date: string;
  end_date: string;
  current: boolean;
  description: string;
  achievements?: string[];
  highlights?: string[];
  technologies: string[];
  published?: boolean;
  order?: number;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  field_of_study?: string;
  field?: string;
  start_year: string;
  end_year: string;
  grade?: string;
  description?: string;
  achievements?: string[];
  order?: number;
  published?: boolean;
}

export interface Certificate {
  id: string;
  name: string;
  title?: string;
  issuer: string;
  issue_date: string;
  expiry_date?: string;
  credential_url?: string;
  credential_id?: string;
  badge_image?: string;
  description?: string;
  order?: number;
  published?: boolean;
}

export interface Course {
  id: string;
  title: string;
  provider: string;
  description?: string;
  completion_date?: string;
  url?: string;
  certificate_url?: string;
  image_url?: string;
  order: number;
  published: boolean;
  created_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role?: string;
  position: string;
  company: string;
  avatar_url?: string;
  content: string;
  rating: number;
  project_name?: string;
  published: boolean;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  created_at: string;
  notes?: string;
  custom_fields?: Record<string, any>;
}

export interface ProjectLead {
  id: string;
  name: string;
  email: string;
  company?: string;
  project_type: string;
  budget_range: string;
  deadline: string;
  description: string;
  required_features: string[];
  reference_links?: string[] | string;
  communication_pref: string;
  /** Private admin notes (never shown publicly). */
  notes?: string;
  ai_summary?: string;
  ai_score?: number;
  /** pending = queued for scoring; skipped = auto-qualification disabled in settings. */
  scored_by?: 'ai_model' | 'fallback' | 'pending' | 'skipped';
  ai_breakdown?: {
    clarity: number;
    feasibility: number;
    budget_fit: number;
    timeline_realism: number;
    notes: string;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'qualified' | 'contacted' | 'in_discussion' | 'won' | 'lost' | 'archived';
  created_at: string;
  updated_at: string;
  custom_fields?: Record<string, any>;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  source_type: 'profile' | 'project' | 'service' | 'blog' | 'skill' | 'custom' | 'faq' | string;
  source_id?: string;
  content: string;
  status: 'indexed' | 'pending' | 'failed';
  chunks_count: number;
  last_indexed_at: string;
  metadata?: Record<string, any>;
  type?: string;
}

export type KnowledgeDoc = KnowledgeDocument;

export interface KnowledgeChunk {
  id: string;
  document_id: string;
  content: string;
  embedding?: number[];
  /** Set by GET /api/knowledge, which omits the vector itself. */
  embedded?: boolean;
  dimensions?: number;
  metadata?: Record<string, any>;
}

export interface AIConversation {
  id: string;
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
  lead_id?: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: any[];
  tool_results?: any[];
  cards?: {
    type: 'project' | 'service' | 'action_brief' | 'contact_prompt';
    data: any;
  }[];
  created_at: string;
}

export interface AIEvent {
  id: string;
  event_type: 'page_view' | 'project_view' | 'service_view' | 'blog_view' | 'ai_chat' | 'search_query' | 'lead_submission' | 'cta_click';
  path: string;
  metadata: Record<string, any>;
  created_at: string;
  session_id: string;
}

export interface AIInsight {
  id: string;
  category: 'audience' | 'lead_trend' | 'tech_interest' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  actionable_recommendation: string;
  created_at: string;
}

export interface SiteSettings {
  site_name: string;
  tagline?: string;
  meta_description?: string;
  seo_title?: string;
  seo_description?: string;
  og_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  twitter_card?: 'summary' | 'summary_large_image';
  canonical_url?: string;
  contact_email: string;
  phone?: string;
  location?: string;
  calendly_url?: string;
  analytics_enabled?: boolean;
  enable_analytics?: boolean;
  ai_enabled?: boolean;
  enable_ai_assistant?: boolean;
  enable_project_planner?: boolean;
  ai_model?: string;
  lead_auto_qualification?: boolean;
  enable_email_notifications?: boolean;
  enable_telegram_notifications?: boolean;
  enable_whatsapp_notifications?: boolean;
  notification_email_to?: string;
  telegram_chat_id?: string;
  /** Send an automatic acknowledgement email to visitors (off by default to prevent relay abuse). */
  enable_visitor_confirmation?: boolean;
  maintenance_mode: boolean;
  maintenance_title?: string;
  maintenance_description?: string;
  footer_brand_description?: string;
  cta_banner_enabled?: boolean;
  cta_banner_title?: string;
  cta_banner_description?: string;
  cta_banner_primary_label?: string;
  cta_banner_primary_url?: string;
  cta_banner_secondary_label?: string;
  cta_banner_secondary_url?: string;
  cta_enabled?: boolean;
  cta_title?: string;
  cta_description?: string;
  cta_primary_label?: string;
  cta_primary_url?: string;
  cta_secondary_label?: string;
  cta_secondary_url?: string;
  footer_tech_stack?: string;
  social_links?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    kaggle?: string;
    huggingface?: string;
  };
}

export interface MethodologyStep {
  id: string;
  step_number: string;
  title: string;
  title_ar?: string;
  description: string;
  description_ar?: string;
  enabled: boolean;
  order: number;
}

export interface EngineeringPrinciple {
  id: string;
  title: string;
  title_ar?: string;
  description: string;
  description_ar?: string;
  icon?: string;
  enabled: boolean;
  order: number;
}

export interface ArchitectureNode {
  id: string;
  title_en: string;
  title_ar: string;
  category_en: string;
  category_ar: string;
  tech: string[];
  latency: string;
  description_en: string;
  description_ar: string;
  details_en: string[];
  details_ar: string[];
  enabled: boolean;
  order: number;
}

export interface FormField {
  key: string; // unique identifier used in submitted payloads
  label: string; // human‑readable label
  placeholder?: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date' | string;
  required: boolean;
  enabled: boolean;
  order: number; // numeric order for backend; UI will recalc on drag‑drop
  system?: boolean; // true for protected fields
  options?: string[]; // for select/radio/checkbox fields
}

export interface FormConfig {
  slug: string; // e.g., "contact" or "lead"
  name: string; // display name for the form
  description?: string;
  active: boolean; // soft‑delete flag
  fields: FormField[];
}
