import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getPostgresPool, initializePostgresSchema } from './postgres';
import { isPostgresConfigured, isVercelProduction } from './config';
import { errorText } from './lib/http';
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
  AIConversation,
  AIMessage,
  AIEvent,
  AIInsight,
  SiteSettings,
  FormConfig,
  MethodologyStep,
  EngineeringPrinciple,
  ArchitectureNode
} from '../src/types';


function comparablePath(p: string): string {
  let resolved: string;
  try {
    resolved = fs.realpathSync.native(p);
  } catch {
    resolved = path.resolve(p);
  }
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

/**
 * DATA_DIR selects where db.json lives (default: <cwd>/.data).
 * Under NODE_ENV=test it is mandatory and must not point at (or inside) the project's
 * real .data directory, so an automated test can never modify production records.
 */
export function resolveDataDir(): string {
  const projectDataDir = path.resolve(process.cwd(), '.data');
  const configured = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : projectDataDir;
  if (process.env.NODE_ENV === 'test') {
    const target = comparablePath(configured);
    const real = comparablePath(projectDataDir);
    if (!process.env.DATA_DIR || target === real || target.startsWith(real + path.sep)) {
      throw new Error('[DB] Refusing to run tests against the project .data directory. Set DATA_DIR to a temporary directory.');
    }
  }
  return configured;
}

const DATA_DIR = resolveDataDir();
const DB_FILE = path.join(DATA_DIR, 'db.json');

/** Unicode-aware slug (keeps Arabic letters); mirrors src/lib/content.ts slugify. */
export function slugifyServer(input: string, fallbackPrefix = 'item'): string {
  const slug = String(input || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

/** Collision-safe id: two submissions in the same millisecond no longer share an id. */
function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

export interface DatabaseSchema {
  profile: Profile;
  projects: Project[];
  services: Service[];
  skills: Skill[];
  blog: BlogPost[];
  experience: Experience[];
  education: Education[];
  certificates: Certificate[];
  courses: Course[];
  testimonials: Testimonial[];
  messages: ContactMessage[];
  leads: ProjectLead[];
  knowledge: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
  conversations: AIConversation[];
  ai_messages: AIMessage[];
  events: AIEvent[];
  insights: AIInsight[];
  settings: SiteSettings;
  forms: FormConfig[];
  methodology_steps?: MethodologyStep[];
  principles?: EngineeringPrinciple[];
  architecture_nodes?: ArchitectureNode[];
}

const initialData: DatabaseSchema = {
  profile: {
    name: "Baraa Abu Musameh",
    title: "AI Engineer & Web Developer",
    headline: "Architecting Next-Gen Intelligent Web Systems & AI Solutions",
    bio: "AI Engineer and Full-Stack Web Developer specialized in generative AI, neural search & RAG pipelines, autonomous agent architectures, and high-performance modern web applications. Passionate about turning complex business challenges into scalable, elegant technical products.",
    about_long: "I am an AI Engineer and Full-Stack Web Developer with deep expertise across modern machine learning ecosystems and full-stack software development. My technical work spans building production multimodal RAG systems, developing scalable SaaS platforms, engineering bespoke AI agents with structured tool calling, and designing ultra-responsive frontend architectures. With a focus on performance, security, and exceptional user experience, I help startups, businesses, and enterprises conceptualize and deploy cutting-edge digital products.",
    email: "b.musameh2007@gmail.com",
    phone: "+970 59-123-4567",
    location: "Gaza / Remote Worldwide",
    avatar_url: "/images/baraa-profile.webp",
    resume_url: "#",
    github_url: "https://github.com/baraamusameh",
    linkedin_url: "https://linkedin.com/in/baraamusameh",
    twitter_url: "https://x.com/baraamusameh",
    available_for_freelance: true,
    years_experience: 4,
    completed_projects: 38,
    client_satisfaction: 99,
    satisfaction_rate: "100%",
    target_latency: "< 50ms",
    focus_areas: [
      "Generative AI & LLM Systems",
      "Retrieval-Augmented Generation (RAG)",
      "Full-Stack Web Engineering (React / Next.js / Node)",
      "Autonomous Agents & Tool Orchestration",
      "Vector Search & High-Performance Databases",
      "Modern E-Commerce & SaaS Architectures"
    ]
  },
  projects: [
    {
      id: "proj-1",
      slug: "neurodoc-enterprise-rag",
      title: "NeuroDoc: Enterprise Multimodal RAG Assistant",
      short_description: "Production-grade retrieval augmented generation platform indexing complex enterprise documentation with hybrid semantic search and citation verification.",
      full_description: "NeuroDoc is a high-accuracy RAG platform engineered for enterprises with massive technical documentation, compliance policies, and internal wikis. Utilizing advanced chunking strategies, dense vector embeddings, and re-ranking models, NeuroDoc enables employees to ask complex questions in natural language and receive grounded, cited answers in milliseconds.",
      problem: "Enterprise teams wasted up to 25% of their working hours manually digging through fragmented PDFs, Notion workspaces, and internal API docs to verify compliance and technical protocols.",
      solution: "Engineered an end-to-end vector pipeline that automatically ingests, extracts, chunks, and indexes multi-format documents. Added dynamic reranking and grounded citation attribution to eliminate hallucinations completely.",
      results: [
        "Reduced internal knowledge query resolution time from 18 minutes to under 4 seconds",
        "Achieved 99.2% citation accuracy across 50,000+ indexed pages",
        "Adopted by 3 enterprise pilot teams with 98% positive sentiment"
      ],
      architecture: "Next.js 14 Frontend • Fastify / Express Microservices • PostgreSQL with pgvector • Gemini Embeddings & LLM Reranker • Redis Cache Layer",
      category: "AI Solutions",
      technologies: ["TypeScript", "Python", "Next.js", "PostgreSQL", "pgvector", "Gemini API", "Tailwind CSS", "Docker"],
      features: [
        "Multi-format document ingestion (PDF, DOCX, Markdown, HTML)",
        "Hybrid dense vector + BM25 keyword retrieval",
        "Source attribution with interactive highlighted document viewer",
        "Role-based access control (RBAC) and audit log tracking",
        "Streaming response generation with real-time token metrics"
      ],
      screenshots: [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
      ],
      cover_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      github_url: "https://github.com/baraamusameh/neurodoc-rag",
      live_url: "https://neurodoc-demo.example.com",
      featured: true,
      status: "completed",
      completion_date: "2026-04-15",
      challenges: [
        "Handling complex PDF table structures without losing semantic relationships between columns.",
        "Balancing vector retrieval speed against reranking precision under heavy concurrency."
      ],
      lessons_learned: [
        "Chunk boundary heuristics and metadata enrichment are far more impactful than embedding dimension size alone.",
        "Streaming token generation drastically improves user perceived latency."
      ],
      lead_time: "6 weeks",
      tags: ["RAG", "Vector Search", "LLMs", "Enterprise AI", "Full-Stack"],
      seo_title: "NeuroDoc Enterprise RAG Case Study - Baraa Abu Musameh",
      seo_description: "Case study of NeuroDoc, an enterprise RAG assistant with hybrid vector search built by AI Engineer Baraa Abu Musameh."
    },
    {
      id: "proj-2",
      slug: "omnistore-ai-ecommerce",
      title: "OmniStore: Autonomous AI-Driven E-Commerce Platform",
      short_description: "Modern headless e-commerce store with personalized real-time visual search, conversational shopping assistant, and automated inventory forecasting.",
      full_description: "OmniStore redefines modern digital retail by combining an ultra-fast headless storefront with integrated AI agents. Shoppers can search via natural language (e.g., 'a minimalist linen shirt for summer beach wedding') or upload an image to find visually identical items instantly.",
      problem: "Traditional keyword search in e-commerce results in 68% cart abandonment when users cannot remember exact product SKU names or terminology.",
      solution: "Developed a headless commerce system featuring semantic search, an AI style advisor with shopping cart integration, and a predictive inventory replenishment dashboard for merchant admins.",
      results: [
        "Increased conversion rates by 34% compared to legacy keyword store",
        "Sub-100ms page transitions via Next.js ISR & edge caching",
        "Automated 80% of customer pre-sales inquiries via the shopping agent"
      ],
      architecture: "React / Next.js Server Components • Stripe Payment Gateway • PostgreSQL • Vector Similarity Engine • Tailwind CSS • Webhooks",
      category: "E-Commerce",
      technologies: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Stripe API", "PostgreSQL", "Gemini Pro", "Framer Motion"],
      features: [
        "Conversational AI stylist with one-click direct cart additions",
        "Multimodal visual search for product discovery",
        "Instant checkout flow with Stripe & Apple Pay / Google Pay",
        "Merchant analytics dashboard with predictive demand forecasting",
        "Automated SEO optimization for generated product categories"
      ],
      screenshots: [
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1556742049-0a67e557229b?auto=format&fit=crop&w=1200&q=80"
      ],
      cover_image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
      github_url: "https://github.com/baraamusameh/omnistore-ai",
      live_url: "https://omnistore-demo.example.com",
      featured: true,
      status: "completed",
      completion_date: "2026-02-28",
      challenges: [
        "Ensuring real-time inventory locking during simultaneous AI assistant checkout sessions.",
        "Optimizing product image embeddings for edge browser execution."
      ],
      lessons_learned: [
        "Headless architectures provide unparalleled flexibility for injecting AI micro-experiences into checkout funnels."
      ],
      lead_time: "8 weeks",
      tags: ["E-Commerce", "Headless", "Stripe", "AI Shopping", "Next.js"],
      seo_title: "OmniStore Headless AI E-Commerce Platform - Baraa Abu Musameh",
      seo_description: "Case study for OmniStore, an AI-powered headless e-commerce store built by Web Developer Baraa Abu Musameh."
    },
    {
      id: "proj-3",
      slug: "visionpulse-edge-analytics",
      title: "VisionPulse: Real-Time Edge Computer Vision & Analytics",
      short_description: "Industrial computer vision dashboard performing real-time object tracking, safety zone compliance, and telemetry visualizers.",
      full_description: "VisionPulse processes live multi-stream RTSP camera feeds to detect safety gear compliance (PPE), occupancy limits, and workflow bottlenecks in manufacturing warehouses, rendering live analytics onto an interactive canvas dashboard.",
      problem: "Manufacturing managers lacked automated visibility into factory floor safety protocols and zone violations, risking costly downtime and accidents.",
      solution: "Constructed an edge-deployed lightweight neural model pipeline with a WebSocket telemetry stream rendering high-density analytics on a React dashboard.",
      results: [
        "Achieved 30 FPS inference on low-power edge gateways",
        "Zero downtime across 6 months of continuous operation",
        "Reduced safety non-compliance incidents by 62%"
      ],
      architecture: "Python OpenCV & TensorRT Edge Worker • Node.js WebSocket Hub • React + D3 / Canvas Live Visualizer",
      category: "Web Applications",
      technologies: ["Python", "OpenCV", "TypeScript", "React", "WebSockets", "Tailwind CSS", "D3.js", "Docker"],
      features: [
        "Multi-camera live RTSP stream ingestion with bounding box overlays",
        "Heatmap density rendering with historical playback scrubber",
        "Instant SMS/Webhook alert triggers on restricted zone breaches",
        "Exportable PDF/CSV safety audit logs"
      ],
      screenshots: [
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80"
      ],
      cover_image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
      github_url: "https://github.com/baraamusameh/visionpulse-analytics",
      live_url: "https://visionpulse.example.com",
      featured: true,
      status: "completed",
      completion_date: "2025-11-20",
      challenges: ["Streaming low-latency video annotations over fluctuating industrial Wi-Fi."],
      lessons_learned: ["Canvas-based hardware-accelerated rendering beats DOM nodes for real-time bounding boxes."],
      lead_time: "7 weeks",
      tags: ["Computer Vision", "Real-Time", "WebSockets", "IoT", "Dashboard"],
      seo_title: "VisionPulse Computer Vision Analytics - Baraa Abu Musameh",
      seo_description: "Industrial edge computer vision dashboard engineered by AI Engineer Baraa Abu Musameh."
    },
    {
      id: "proj-4",
      slug: "cloudflow-agent-orchestrator",
      title: "CloudFlow: Intelligent Agent Workflow Orchestrator",
      short_description: "Visual node-based orchestration engine for building, testing, and deploying autonomous multi-agent task workflows with external API integrations.",
      full_description: "CloudFlow enables engineers to drag and drop custom agent nodes, define tool calling schemas, chain LLM reasoning steps, and execute complex workflows like automated lead research, code review bots, and multi-source data extraction.",
      problem: "Engineering teams were writing repetitive, brittle boilerplate code to link LLMs with external REST APIs and error-handling retry loops.",
      solution: "Created an interactive node graph editor with live debugger, variable interpolation, and serverless workflow execution engine.",
      results: [
        "Cut multi-agent pipeline development time from days to under 30 minutes",
        "Handled 250,000+ monthly node executions reliably",
        "Featured in developer community showcases"
      ],
      architecture: "React Flow UI Canvas • Node.js Serverless Runtime • PostgreSQL • Sandbox Code Execution • Gemini 3",
      category: "Automation",
      technologies: ["React", "TypeScript", "Node.js", "React Flow", "Gemini API", "PostgreSQL", "Tailwind CSS"],
      features: [
        "Interactive drag-and-drop workflow canvas with custom node connectors",
        "Real-time step-by-step debugger with intermediate state inspector",
        "Built-in tool integrations (GitHub, Slack, Google Workspace, REST APIs)",
        "Cron and webhook trigger support with automatic exponential retry"
      ],
      screenshots: [
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80"
      ],
      cover_image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
      github_url: "https://github.com/baraamusameh/cloudflow-orchestrator",
      live_url: "https://cloudflow-agents.example.com",
      featured: false,
      status: "completed",
      completion_date: "2025-08-14",
      challenges: ["Isolating custom user script execution safely within sandbox constraints."],
      lessons_learned: ["Schema validation at node boundaries prevents 95% of agent execution runtime failures."],
      lead_time: "5 weeks",
      tags: ["Agent Orchestrator", "Automation", "Visual Canvas", "Tool Calling"],
      seo_title: "CloudFlow Agent Orchestrator - Baraa Abu Musameh",
      seo_description: "Visual autonomous agent workflow orchestrator built by Baraa Abu Musameh."
    },
    {
      id: "proj-5",
      slug: "saasmetrics-pro-analytics",
      title: "SaaSMetrics Pro: Predictive Subscription Platform",
      short_description: "Financial modeling & customer churn prediction suite with automated MRR forecasting and cohort analytics.",
      full_description: "A comprehensive SaaS intelligence dashboard that integrates directly with Stripe and Paddle to calculate Net Revenue Retention, Customer Lifetime Value (LTV), and trains regression models to alert founders of churn risks 30 days in advance.",
      problem: "SaaS founders struggled to pinpoint why churn was happening until weeks after revenue had dropped.",
      solution: "Engineered predictive cohort analytics with automatic anomaly detection and AI actionable suggestions.",
      results: [
        "Helped users proactively retain over $120,000 in recurring subscriptions",
        "Processed millions in monthly subscription transaction events"
      ],
      architecture: "Next.js • Recharts • PostgreSQL • Python ML Worker • Tailwind CSS",
      category: "Web Applications",
      technologies: ["Next.js", "TypeScript", "PostgreSQL", "Python", "Recharts", "Tailwind CSS"],
      features: [
        "Real-time MRR, ARR, Churn, and NRR financial telemetry",
        "Predictive churn scoring model with customer health metrics",
        "Automated revenue anomaly email alerts",
        "Interactive cohort retention heatmaps"
      ],
      screenshots: [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
      ],
      cover_image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
      github_url: "https://github.com/baraamusameh/saasmetrics-pro",
      live_url: "https://saasmetrics.example.com",
      featured: false,
      status: "completed",
      completion_date: "2025-05-10",
      tags: ["SaaS", "Analytics", "Predictive ML", "FinTech", "Dashboard"],
      seo_title: "SaaSMetrics Pro Case Study - Baraa Abu Musameh",
      seo_description: "Predictive SaaS financial analytics suite engineered by Baraa Abu Musameh."
    }
  ],
  services: [
    {
      id: "srv-1",
      slug: "ai-solutions-custom-agents",
      title: "AI Solutions & Custom Agents",
      category: "AI Solutions",
      short_description: "Bespoke Generative AI integrations, enterprise RAG systems, semantic search, and autonomous multi-agent tool-calling workflows.",
      full_description: "Supercharge your business operations by integrating state-of-the-art AI. I architect end-to-end custom AI solutions—from high-accuracy Retrieval-Augmented Generation (RAG) pipelines that converse with your proprietary documents, to autonomous agents capable of performing complex multi-step tasks using your internal APIs.",
      icon: "Cpu",
      features: [
        "Enterprise RAG & Document Intelligence pipelines",
        "Autonomous Agent development with custom Tool Calling",
        "Dense vector search & semantic indexing (pgvector, Pinecone)",
        "Fine-tuning & structured prompt engineering",
        "Multimodal AI systems (Text, Vision, Audio)",
        "Hallucination mitigation and rigorous evaluation benchmarks"
      ],
      technologies: ["Python", "TypeScript", "Gemini API", "PostgreSQL", "pgvector", "LangChain", "FastAPI", "Docker"],
      deliverables: [
        "Production-ready backend API service with full test coverage",
        "Interactive vector knowledge retrieval pipeline",
        "Web admin dashboard for AI system monitoring & telemetry",
        "Comprehensive API documentation and deployment guides"
      ],
      process: [
        { step: "01", title: "Feasibility & Data Audit", description: "Analyzing your proprietary data, domain terminology, and integration constraints." },
        { step: "02", title: "Architecture & Schema", description: "Designing optimal chunking, vector embedding models, and tool execution boundaries." },
        { step: "03", title: "Implementation & Tuning", description: "Building the core AI engine, prompt pipelines, and guardrails." },
        { step: "04", title: "Evaluation & Deployment", description: "Benchmarking accuracy, latency, and deploying to scalable cloud containers." }
      ],
      timeline: "2 to 5 weeks",
      starting_price: "$2,800",
      faq: [
        { question: "How do you prevent the AI from hallucinating?", answer: "We enforce strict retrieval-grounded context windows, citation verification, temperature tuning, and fallback validations so the AI only speaks on confirmed knowledge." },
        { question: "Is my business data secure?", answer: "Yes. All data remains within your private enterprise database and VPC. No proprietary data is shared with external model trainers." }
      ],
      active: true,
      featured: true,
      seo_title: "Custom AI Solutions & Agent Development - Baraa Abu Musameh",
      seo_description: "Hire AI Engineer Baraa Abu Musameh for enterprise RAG, intelligent agents, and semantic search systems."
    },
    {
      id: "srv-2",
      slug: "full-stack-web-applications",
      title: "Full-Stack Web Applications",
      category: "Web Applications",
      short_description: "Scalable, high-performance SaaS applications, customer portals, and internal business management platforms built with React & Next.js.",
      full_description: "I build robust, responsive, and secure web applications tailored to your exact business logic. From architecture design and database modeling to fluid frontends with sub-second page loads, I deliver production systems that scale gracefully.",
      icon: "LayoutDashboard",
      features: [
        "Custom SaaS platforms with multi-tenant architecture",
        "Interactive dashboards, analytics, and data visualizers",
        "Role-Based Access Control (RBAC) & OAuth authentication",
        "Relational database design (PostgreSQL) with migration pipelines",
        "REST and GraphQL API architecture",
        "Complete payment gateway integration (Stripe, Lemon Squeezy)"
      ],
      technologies: ["React", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS", "Express", "Redis"],
      deliverables: [
        "Full-stack web application source code with modular architecture",
        "Secure database migrations and ORM models",
        "Admin control panel and user management",
        "CI/CD deployment pipeline configuration"
      ],
      process: [
        { step: "01", title: "Discovery & Wireframing", description: "Mapping user journeys, database schemas, and interface wireframes." },
        { step: "02", title: "Backend & API Core", description: "Constructing secure data layers, auth endpoints, and business logic." },
        { step: "03", title: "Frontend & Interactions", description: "Developing responsive UI components, micro-animations, and client state." },
        { step: "04", title: "Testing & Launch", description: "Performing end-to-end security audits, load testing, and production deployment." }
      ],
      timeline: "3 to 8 weeks",
      starting_price: "$3,200",
      faq: [
        { question: "Do I own the full intellectual property and code?", answer: "100%. All repository ownership, licenses, and deployment infrastructure are transferred directly to you upon project handover." }
      ],
      active: true,
      featured: true,
      seo_title: "Full-Stack Web Development Services - Baraa Abu Musameh",
      seo_description: "Custom SaaS and web application development by Baraa Abu Musameh."
    },
    {
      id: "srv-3",
      slug: "modern-ecommerce-platforms",
      title: "Modern E-Commerce Platforms",
      category: "E-Commerce",
      short_description: "High-converting headless e-commerce stores, custom checkout funnels, payment integrations, and AI product recommendation engines.",
      full_description: "Turn casual visitors into loyal buyers with blisteringly fast, high-converting digital storefronts. I build bespoke e-commerce experiences with rich catalog navigation, instant search, frictionless checkout, and merchant control dashboards.",
      icon: "ShoppingBag",
      features: [
        "Headless e-commerce storefronts with sub-second page loads",
        "Seamless Stripe, Apple Pay, Google Pay, and localized checkout",
        "Custom product variants, dynamic inventory tracking & order routing",
        "Conversational AI sales assistant and smart search",
        "Discount engines, abandoned cart recovery, and CRM webhooks"
      ],
      technologies: ["Next.js", "React", "TypeScript", "Stripe", "PostgreSQL", "Tailwind CSS", "Framer Motion"],
      deliverables: [
        "Headless store with responsive mobile-optimized UI",
        "Merchant back-office for order fulfillment and catalog management",
        "Payment gateway compliance and webhook integrations",
        "Analytics and conversion event tracking setup"
      ],
      process: [
        { step: "01", title: "Catalog & Checkout Strategy", description: "Defining product structures, taxation, currencies, and payment providers." },
        { step: "02", title: "Storefront UI/UX", description: "Crafting modern product display pages and rapid checkout funnels." },
        { step: "03", title: "Payment & Webhook Setup", description: "Connecting Stripe API, webhooks, invoice generation, and emails." },
        { step: "04", title: "Conversion Optimization", description: "Benchmarking Core Web Vitals and launching the store." }
      ],
      timeline: "3 to 6 weeks",
      starting_price: "$2,500",
      faq: [
        { question: "Can I manage products without touching code?", answer: "Yes! Every store includes a clean, intuitive Admin CMS to add products, adjust pricing, upload images, and manage inventory easily." }
      ],
      active: true,
      featured: true,
      seo_title: "Modern E-Commerce Development - Baraa Abu Musameh",
      seo_description: "Custom headless e-commerce stores and high-converting checkout platforms."
    },
    {
      id: "srv-4",
      slug: "business-websites-landing-pages",
      title: "Business Websites & Landing Pages",
      category: "Business Websites",
      short_description: "High-impact, lightning-fast corporate websites, portfolios, and marketing landing pages engineered for maximum conversion.",
      full_description: "Establish a commanding digital presence. I craft bespoke business websites with refined typography, responsive layouts, captivating micro-interactions, and built-in SEO to tell your brand story and capture high-intent leads.",
      icon: "Globe",
      features: [
        "Custom responsive design tailored to your brand identity",
        "Blazing-fast load speeds with perfect 95+ Lighthouse scores",
        "Built-in lead capture intake forms and CRM integrations",
        "Technical SEO optimization (Structured Data, OpenGraph, Sitemaps)",
        "Integrated Headless CMS for effortless team blogging and updates"
      ],
      technologies: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion", "SEO Best Practices"],
      deliverables: [
        "Production website deployed on fast global CDN",
        "Interactive lead capture forms with instant email/Slack alerts",
        "Content management interface for team updates",
        "Complete technical SEO setup"
      ],
      process: [
        { step: "01", title: "Brand & Content Strategy", description: "Mapping value propositions, call-to-actions, and page structure." },
        { step: "02", title: "Interactive Design", description: "Developing responsive layouts with subtle motion and modern polish." },
        { step: "03", title: "Content Integration", description: "Configuring CMS schemas, copywriting, and media optimization." },
        { step: "04", title: "SEO & Launch", description: "Domain configuration, SSL, indexing submission, and analytics setup." }
      ],
      timeline: "1 to 3 weeks",
      starting_price: "$1,400",
      faq: [
        { question: "Will my website look great on mobile devices?", answer: "Absolutely. Mobile-first responsive craftsmanship ensures flawless navigation across phones, tablets, and wide desktop displays." }
      ],
      active: true,
      featured: false,
      seo_title: "High-Performance Business Websites - Baraa Abu Musameh",
      seo_description: "Custom corporate websites and conversion-focused landing pages by Baraa Abu Musameh."
    },
    {
      id: "srv-5",
      slug: "intelligent-workflow-automation",
      title: "Intelligent Workflow Automation",
      category: "Automation",
      short_description: "Automate repetitive business workflows, data extraction, CRM synchronizations, and webhook pipelines using autonomous background workers.",
      full_description: "Free your team from tedious manual work. I design and build automated backend pipelines that bridge your disparate software tools, extract information from emails and documents, sync customer databases, and trigger smart action chains.",
      icon: "Zap",
      features: [
        "Custom API bridges and automated webhook listeners",
        "Automated PDF and invoice data extraction using OCR & AI",
        "CRM & lead pipeline synchronization (HubSpot, Notion, Airtable, Slack)",
        "Scheduled background workers and batch data processing",
        "Error alerting and automatic retry resilience"
      ],
      technologies: ["Node.js", "Python", "Docker", "PostgreSQL", "REST APIs", "Webhooks", "Redis"],
      deliverables: [
        "Serverless automation scripts or microservice workers",
        "Webhook endpoint listeners with secure HMAC authentication",
        "Monitoring dashboard with execution logs and alert triggers",
        "System runbook documentation"
      ],
      process: [
        { step: "01", title: "Workflow Audit", description: "Mapping manual friction points and required data transformations." },
        { step: "02", title: "API Integrations", description: "Connecting endpoints, authenticating scopes, and crafting webhooks." },
        { step: "03", title: "Error Handling & Tests", description: "Implementing exponential backoff, dead-letter queues, and validation." },
        { step: "04", title: "Monitoring & Handover", description: "Enabling telemetry alerts and deploying to automated infrastructure." }
      ],
      timeline: "1 to 4 weeks",
      starting_price: "$1,800",
      faq: [
        { question: "What happens if a third-party API goes down?", answer: "Our automation architecture includes idempotency checks and automated retry queues so no data is ever lost during outages." }
      ],
      active: true,
      featured: false,
      seo_title: "Intelligent Workflow Automation Services - Baraa Abu Musameh",
      seo_description: "Custom backend automation and API pipelines engineered by Baraa Abu Musameh."
    },
    {
      id: "srv-6",
      slug: "content-platforms-custom-cms",
      title: "Blogs & Content Platforms",
      category: "Blogs / Content Platforms",
      short_description: "Fast, readable technical publications, community portals, and custom content publishing platforms with built-in AI writing assistants.",
      full_description: "Publish your ideas with distinction. I engineer modern publishing platforms with clean markdown editors, syntax-highlighted code blocks, smart tag hierarchies, newsletter subscription funnels, and AI writing co-pilots.",
      icon: "BookOpen",
      features: [
        "Rich Markdown and MDX content rendering with syntax highlighting",
        "Built-in AI writing assistant for outline and SEO generation",
        "Author profiles, category hierarchies, and estimated reading time",
        "Full-text search and related articles recommendation",
        "Newsletter capture and RSS feed generation"
      ],
      technologies: ["Next.js", "React", "TypeScript", "Tailwind CSS", "PostgreSQL", "Markdown / MDX"],
      deliverables: [
        "Complete publishing platform and authoring CMS",
        "Dynamic OpenGraph image generation for social sharing",
        "Integrated subscriber capture forms",
        "SEO sitemaps and RSS endpoints"
      ],
      process: [
        { step: "01", title: "Editorial Strategy", description: "Designing typography, layout rhythm, and reading experience." },
        { step: "02", title: "CMS Architecture", description: "Constructing content schemas, asset uploaders, and drafting states." },
        { step: "03", title: "Search & Features", description: "Adding full-text search, tag indexing, and social share badges." },
        { step: "04", title: "Optimization & Launch", description: "Validating RSS feeds, SEO structured data, and CDN delivery." }
      ],
      timeline: "2 to 4 weeks",
      starting_price: "$1,900",
      faq: [
        { question: "Can we support multiple authors and guest writers?", answer: "Yes, the CMS supports multi-author attribution, contributor bios, and role permissions." }
      ],
      active: true,
      featured: false,
      seo_title: "Custom Blogs & Content Platforms - Baraa Abu Musameh",
      seo_description: "Modern content management systems and technical publications by Baraa Abu Musameh."
    }
  ],
  skills: [
    { id: "sk-1", name: "TypeScript", category: "Programming", proficiency: 95, icon: "Code", years_experience: 4, featured: true },
    { id: "sk-2", name: "Python", category: "Programming", proficiency: 92, icon: "Terminal", years_experience: 4, featured: true },
    { id: "sk-3", name: "JavaScript (ES6+)", category: "Programming", proficiency: 96, icon: "FileCode", years_experience: 4, featured: true },
    { id: "sk-4", name: "C++", category: "Programming", proficiency: 84, icon: "Cpu", years_experience: 3, featured: false },
    { id: "sk-5", name: "SQL", category: "Programming", proficiency: 90, icon: "Database", years_experience: 4, featured: false },

    { id: "sk-6", name: "RAG Architectures", category: "AI & Machine Learning", proficiency: 95, icon: "Network", years_experience: 3, featured: true },
    { id: "sk-7", name: "LLM Orchestration & Tool Calling", category: "AI & Machine Learning", proficiency: 94, icon: "Bot", years_experience: 3, featured: true },
    { id: "sk-8", name: "Vector Databases & Embeddings", category: "AI & Machine Learning", proficiency: 92, icon: "Layers", years_experience: 3, featured: true },
    { id: "sk-9", name: "Computer Vision (OpenCV)", category: "AI & Machine Learning", proficiency: 86, icon: "Eye", years_experience: 2, featured: false },
    { id: "sk-10", name: "Machine Learning (Scikit-Learn, PyTorch)", category: "AI & Machine Learning", proficiency: 88, icon: "Sparkles", years_experience: 3, featured: true },

    { id: "sk-11", name: "React 18/19", category: "Web & Cloud", proficiency: 96, icon: "Atom", years_experience: 4, featured: true },
    { id: "sk-12", name: "Next.js (App Router)", category: "Web & Cloud", proficiency: 94, icon: "Globe", years_experience: 4, featured: true },
    { id: "sk-13", name: "Node.js & Express", category: "Web & Cloud", proficiency: 92, icon: "Server", years_experience: 4, featured: true },
    { id: "sk-14", name: "PostgreSQL & pgvector", category: "Web & Cloud", proficiency: 90, icon: "Database", years_experience: 4, featured: true },
    { id: "sk-15", name: "Tailwind CSS", category: "Web & Cloud", proficiency: 98, icon: "Palette", years_experience: 4, featured: true },
    { id: "sk-16", name: "Supabase & Firebase", category: "Web & Cloud", proficiency: 90, icon: "Cloud", years_experience: 3, featured: false },

    { id: "sk-17", name: "Git & GitHub Actions", category: "Tools & DevOps", proficiency: 92, icon: "GitBranch", years_experience: 4, featured: true },
    { id: "sk-18", name: "Docker & Containerization", category: "Tools & DevOps", proficiency: 88, icon: "Box", years_experience: 3, featured: true },
    { id: "sk-19", name: "REST & GraphQL APIs", category: "Tools & DevOps", proficiency: 94, icon: "Radio", years_experience: 4, featured: false },
    { id: "sk-20", name: "Linux / Bash Scripting", category: "Tools & DevOps", proficiency: 88, icon: "TerminalSquare", years_experience: 4, featured: false }
  ],
  blog: [
    {
      id: "post-1",
      slug: "building-production-rag-pipelines-guide",
      title: "Building Production-Grade RAG Pipelines: Beyond Basic Vector Search",
      excerpt: "Why simple cosine similarity fails in production, and how hybrid chunking, metadata filters, and cross-encoder reranking eliminate hallucinations.",
      content: `## The Reality of Production RAG

Most introductory tutorials show you how to load a PDF, split it with a fixed character counter, calculate cosine embeddings, and pass top-3 results to an LLM. While this looks magical in a Jupyter Notebook demo, it frequently fails in enterprise scenarios.

### Why Basic Vector Search Breaks Down

1. **Lost Structural Hierarchy**: Tables, headers, and bulleted lists lose their semantic relationships when chopped by arbitrary token counts.
2. **Keyword Blind Spots**: Dense vector embeddings often struggle with exact SKU numbers, error codes, and strict legal definitions.
3. **Retrieval Noise**: The top similarity matches might contain similar phrasing but completely lack the factual answer needed.

\`\`\`typescript
// Example: Combining BM25 keyword matching with Dense Vector Retrieval
async function hybridRetrieve(query: string, limit = 10) {
  const [denseResults, keywordResults] = await Promise.all([
    vectorStore.similaritySearch(query, limit * 2),
    keywordIndex.search(query, limit * 2)
  ]);
  
  // Reciprocal Rank Fusion (RRF)
  return reciprocalRankFusion([denseResults, keywordResults], limit);
}
\`\`\`

### 3 Essential Strategies to Supercharge Your Retrieval

* **1. Document Chunking by Syntax**: Chunk documents respecting markdown headers or AST tree boundaries rather than fixed token chunks.
* **2. Hybrid Search with RRF**: Combine BM25 full-text indexes with pgvector dense embeddings using Reciprocal Rank Fusion.
* **3. Cross-Encoder Reranking**: Pass top-20 retrieved candidates through a high-precision reranker model before constructing your final LLM prompt context.

Implementing these three steps will reduce hallucination rates by upwards of 90% in technical enterprise knowledge bases.`,
      cover_image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      category: "AI & Machine Learning",
      tags: ["RAG", "Vector Search", "LLMs", "Python", "Architecture"],
      read_time: "6 min read",
      published: true,
      published_at: "2026-03-12",
      author_name: "Baraa Abu Musameh",
      views_count: 1420,
      seo_title: "Building Production RAG Pipelines - Baraa Abu Musameh",
      seo_description: "Technical guide to building robust, hallucination-free RAG systems using hybrid search and rerankers."
    },
    {
      id: "post-2",
      slug: "agentic-tool-calling-architectures-nextjs",
      title: "Agentic Tool-Calling Architectures with Next.js and TypeScript",
      excerpt: "A deep dive into constructing autonomous AI agents with typed tool calling schemas, deterministic guardrails, and streaming feedback loops.",
      content: `## The Shift from Chatbots to Autonomous Agents

The true value of modern Large Language Models is unlocked when models are given deterministic tools to interact with the real world—querying databases, scheduling calendar invites, mutating e-commerce carts, and triggering webhook events.

### Defining Typed Tool Schemas

To ensure your agent never sends invalid arguments to your backend functions, always define your tool declarations using rigid type contracts:

\`\`\`typescript
import { Type } from "@google/genai";

export const createProjectLeadTool = {
  name: "createProjectLead",
  description: "Creates and qualifies a prospective client project inquiry in the database.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      clientName: { type: Type.STRING, description: "Full name of the client" },
      projectType: { type: Type.STRING, description: "Type: Web App, AI Solution, or E-Commerce" },
      estimatedBudget: { type: Type.STRING, description: "Budget range provided by user" },
      features: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["clientName", "projectType"]
  }
};
\`\`\`

### Guardrails and User Confirmation

Autonomous agents should never perform irreversible operations (like charging a credit card or wiping a record) without explicit user confirmation in the UI loop. Always structure your agent so it proposes the action payload, renders an interactive confirmation card, and waits for user consent.`,
      cover_image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
      category: "AI Engineering",
      tags: ["AI Agents", "TypeScript", "Tool Calling", "Next.js"],
      read_time: "5 min read",
      published: true,
      published_at: "2026-01-20",
      author_name: "Baraa Abu Musameh",
      views_count: 980,
      seo_title: "Agentic Tool Calling with Next.js - Baraa Abu Musameh",
      seo_description: "Architectural blueprint for building autonomous AI agents with structured tool calling."
    },
    {
      id: "post-3",
      slug: "high-performance-full-stack-web-patterns",
      title: "Full-Stack Web Performance: Sub-Second Loads and Zero Layout Shift",
      excerpt: "Practical patterns for achieving 100 Lighthouse scores: edge rendering, atomic CSS, optimized font loading, and resilient state machines.",
      content: `## Why Performance is Your Best Marketing Asset

Every 100ms delay in website load time directly drops conversion rates by up to 7%. Crafting a high-performance web experience isn't about using the newest trendy library; it's about disciplined architectural choices.

### 4 Pillars of Web Performance

1. **Optimize the Critical Rendering Path**: Minimize blocking scripts in your head tag, inline critical CSS, and defer secondary telemetry.
2. **Server-Side Data Pruning**: Only serialize the exact JSON fields required by the view—never leak full raw database rows to client state.
3. **Container Dimension Reserves**: Explicitly declare aspect ratios on images and cards to completely prevent Cumulative Layout Shift (CLS).
4. **Adaptive Pre-fetching**: Pre-fetch route chunks on hover so user navigation feels instantaneous.`,
      cover_image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80",
      category: "Web Development",
      tags: ["Performance", "React", "Frontend", "Next.js", "UX"],
      read_time: "4 min read",
      published: true,
      published_at: "2025-11-05",
      author_name: "Baraa Abu Musameh",
      views_count: 1150,
      seo_title: "Full-Stack Web Performance Patterns - Baraa Abu Musameh",
      seo_description: "Achieving sub-second load times and zero layout shift in full-stack applications."
    }
  ],
  experience: [
    {
      id: "exp-1",
      role: "Lead AI Engineer & Full-Stack Architect",
      company: "Apex Intelligent Systems",
      company_url: "https://example.com",
      location: "Remote / Tech Hub",
      start_date: "2024-01",
      end_date: "Present",
      current: true,
      description: "Directing the architecture and implementation of enterprise generative AI pipelines, custom RAG platforms, and high-concurrency client web portals.",
      achievements: [
        "Architected enterprise RAG system indexing 50k+ technical documents with 99.2% citation precision",
        "Decreased average API response latency by 45% through Redis caching and edge query pruning",
        "Led client technical consultations resulting in $180k+ in new contracted project engagements"
      ],
      technologies: ["TypeScript", "Python", "Next.js", "PostgreSQL", "pgvector", "Gemini API", "Docker"]
    },
    {
      id: "exp-2",
      role: "Full-Stack Web & AI Developer",
      company: "Digital Horizon Labs",
      company_url: "https://example.com",
      location: "Remote",
      start_date: "2022-06",
      end_date: "2023-12",
      current: false,
      description: "Developed modern headless e-commerce stores, client dashboards, and integrated computer vision edge models for industrial automation clients.",
      achievements: [
        "Built 12+ production web applications and custom client portals with 100% on-time delivery",
        "Engineered real-time edge telemetry dashboard handling 30 FPS camera feeds with sub-100ms visual latency"
      ],
      technologies: ["React", "Node.js", "PostgreSQL", "OpenCV", "Python", "Tailwind CSS", "Stripe API"]
    }
  ],
  education: [
    {
      id: "edu-1",
      degree: "Bachelor of Science in Software Engineering & Artificial Intelligence",
      institution: "Islamic University of Gaza",
      field_of_study: "Software Engineering & Computer Science",
      start_year: "2021",
      end_year: "2025",
      grade: "Top 5% Honors",
      description: "Comprehensive coursework in Machine Learning, Deep Neural Networks, Advanced Data Structures & Algorithms, Distributed Cloud Systems, Database Engineering, and Software Architecture.",
      achievements: [
        "Led University AI Research Study on Multi-modal RAG Optimization",
        "First Place in Regional Hackathon for Autonomous Edge Vision Safety Solution"
      ]
    }
  ],
  certificates: [
    {
      id: "cert-1",
      name: "Deep Learning Specialization",
      issuer: "DeepLearning.AI",
      issue_date: "2024-03",
      credential_url: "https://coursera.org",
      credential_id: "DLAI-DL-99214"
    },
    {
      id: "cert-2",
      name: "Full-Stack Web Engineering Certification",
      issuer: "Meta",
      issue_date: "2023-10",
      credential_url: "https://coursera.org",
      credential_id: "META-FSW-48201"
    },
    {
      id: "cert-3",
      name: "PostgreSQL & Vector Database Professional",
      issuer: "PostgreSQL Guild",
      issue_date: "2024-07",
      credential_url: "https://example.com",
      credential_id: "PG-VEC-88310"
    }
  ],
  courses: [
    {
      id: "course-1",
      title: "LangChain for LLM Application Development",
      provider: "DeepLearning.AI",
      description: "Building production LLM applications with chains, agents, memory, and structured tool calling.",
      completion_date: "2024-05",
      url: "https://example.com",
      order: 1,
      published: true,
      created_at: "2024-05-20"
    },
    {
      id: "course-2",
      title: "Advanced Retrieval for AI with Chroma",
      provider: "DeepLearning.AI",
      description: "Advanced retrieval techniques: multi-query, RAG-Fusion, sentence-window retrieval, and auto-merging retrieval.",
      completion_date: "2024-08",
      url: "https://example.com",
      order: 2,
      published: true,
      created_at: "2024-08-15"
    }
  ],
  testimonials: [
    {
      id: "test-1",
      name: "Marcus Vance",
      position: "CTO & Co-Founder",
      company: "OmniTech Solutions",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      content: "Baraa delivered our enterprise RAG platform weeks ahead of schedule. His understanding of vector search, chunking heuristics, and frontend polish made our internal tools feel 10x faster and genuinely useful. Highly recommended for any serious AI engineering endeavor.",
      rating: 5,
      project_name: "NeuroDoc Enterprise RAG",
      published: true,
      created_at: "2026-04-18"
    },
    {
      id: "test-2",
      name: "Elena Rostova",
      position: "VP of Product",
      company: "LuxeRetail Direct",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      content: "Working with Baraa was one of the smoothest freelance partnerships we have ever had. He architected our headless e-commerce store with an AI shopping assistant that lifted our mobile conversion rate by 34% within the first month.",
      rating: 5,
      project_name: "OmniStore E-Commerce",
      published: true,
      created_at: "2026-03-05"
    },
    {
      id: "test-3",
      name: "David Kim",
      position: "Engineering Manager",
      company: "Industrial Edge IoT",
      avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      content: "Baraa possesses that rare blend of deep machine learning competence and pristine full-stack craftsmanship. The computer vision dashboard he built runs 24/7 without a hiccup.",
      rating: 5,
      project_name: "VisionPulse Analytics",
      published: true,
      created_at: "2025-12-10"
    }
  ],
  messages: [
    {
      id: "msg-1",
      name: "Sarah Jenkins",
      email: "sarah.j@acmecorp.com",
      subject: "Inquiry regarding custom RAG implementation",
      message: "Hello Baraa, we loved your NeuroDoc case study. We are looking to build a similar internal knowledge assistant for our legal and compliance documentation. Would love to set up a consultation call.",
      status: "new",
      created_at: "2026-08-18T10:20:00Z"
    }
  ],
  leads: [
    {
      id: "lead-1",
      name: "Alexander Wright",
      email: "a.wright@solardynamics.io",
      company: "Solar Dynamics Inc.",
      project_type: "AI Solution",
      budget_range: "$5,000 - $10,000",
      deadline: "Within 6 weeks",
      description: "We need an AI document processing system that automatically ingests supplier PDF invoices, extracts line items, validates tax calculations, and posts clean payloads to our accounting API.",
      required_features: [
        "PDF ingestion & OCR parser",
        "Line item table extraction",
        "Human-in-the-loop review dashboard",
        "Accounting API integration"
      ],
      reference_links: "https://solardynamics.io",
      communication_pref: "Email + Video Call",
      ai_summary: "High-priority corporate document AI automation lead. Clear scope, realistic budget, well-defined API boundaries.",
      ai_score: 94,
      ai_breakdown: {
        clarity: 95,
        feasibility: 96,
        budget_fit: 92,
        timeline_realism: 93,
        notes: "Excellent technical fit for Baraa's AI Solution & Automation stack. Immediate follow-up recommended."
      },
      priority: "high",
      status: "qualified",
      created_at: "2026-08-17T14:15:00Z",
      updated_at: "2026-08-17T14:20:00Z"
    }
  ],
  knowledge: [
    {
      id: "know-1",
      title: "Baraa Abu Musameh - Profile & Core Expertise",
      source_type: "profile",
      content: "Baraa Abu Musameh is an AI Engineer and Full-Stack Web Developer. He builds modern websites, high-performance web applications, generative AI systems, RAG (Retrieval-Augmented Generation) platforms, and intelligent autonomous agents. Contact email: b.musameh2007@gmail.com. Location: Gaza / Remote Worldwide. Available for freelance projects worldwide.",
      status: "indexed",
      chunks_count: 2,
      last_indexed_at: "2026-08-19T05:00:00Z"
    },
    {
      id: "know-2",
      title: "Services Catalog & Pricing Guide",
      source_type: "service",
      content: "Baraa offers 6 core services: 1. AI Solutions & Custom Agents ($2,800+), 2. Full-Stack Web Applications ($3,200+), 3. Modern E-Commerce Platforms ($2,500+), 4. Business Websites & Landing Pages ($1,400+), 5. Intelligent Workflow Automation ($1,800+), 6. Content Platforms & Custom CMS ($1,900+). All projects include complete source code ownership, testing, and deployment.",
      status: "indexed",
      chunks_count: 2,
      last_indexed_at: "2026-08-19T05:00:00Z"
    },
    {
      id: "know-3",
      title: "Projects & Engineering Portfolio",
      source_type: "project",
      content: "Featured Projects: NeuroDoc (Enterprise RAG system with 99.2% citation precision), OmniStore (Headless AI E-Commerce with visual search), VisionPulse (Real-time edge computer vision safety dashboard), CloudFlow (Visual agent workflow orchestrator), SaaSMetrics Pro (Predictive subscription revenue platform).",
      status: "indexed",
      chunks_count: 3,
      last_indexed_at: "2026-08-19T05:00:00Z"
    }
  ],
  chunks: [],
  conversations: [],
  ai_messages: [],
  events: [],
  insights: [
    {
      id: "ins-1",
      category: "lead_trend",
      title: "High Demand for Enterprise RAG & Document AI",
      description: "68% of recent AI assistant inquiries and project intake leads specifically ask for custom RAG pipelines and proprietary document assistants.",
      confidence: 96,
      actionable_recommendation: "Highlight the NeuroDoc case study prominently on the homepage and consider publishing an in-depth video walkthrough.",
      created_at: "2026-08-18T12:00:00Z"
    },
    {
      id: "ins-2",
      category: "tech_interest",
      title: "High Engagement with Headless E-Commerce Service",
      description: "Visitors spending >2 minutes on the E-Commerce service page have an 18% conversion rate to the Start a Project intake wizard.",
      confidence: 91,
      actionable_recommendation: "Add a 1-click 'Generate E-Commerce Project Estimate' button directly in the hero section.",
      created_at: "2026-08-17T09:30:00Z"
    }
  ],
  settings: {
    site_name: "Baraa Abu Musameh",
    tagline: "AI Engineer & Web Developer",
    meta_description: "Portfolio and freelance engineering platform of Baraa Abu Musameh. High-performance web apps, enterprise RAG, and AI solutions.",
    contact_email: "b.musameh2007@gmail.com",
    phone: "+970 59-123-4567",
    location: "Gaza / Remote Worldwide",
    calendly_url: "https://calendly.com/baraamusameh",
    analytics_enabled: true,
    ai_enabled: true,
    ai_model: "gemini-3.7-flash",
    lead_auto_qualification: true,
    maintenance_mode: false,
    // SEO fields
    seo_title: "Baraa Abu Musameh – AI Engineer & Full-Stack Developer",
    seo_description: "Portfolio and freelance engineering platform of Baraa Abu Musameh. High-performance web apps, enterprise RAG, and AI solutions.",
    og_image: "",
    twitter_title: "",
    twitter_description: "",
    twitter_image: "",
    twitter_card: "summary_large_image" as const,
    canonical_url: "",
    // Footer
    footer_brand_description: "Architecting deterministic AI pipelines, production RAG vector stores, and scalable full-stack web platforms engineered for speed and reliability.",
    footer_tech_stack: "TypeScript • Tailwind • Gemini AI",
    // CTA Banner
    cta_banner_enabled: false,
    cta_banner_title: "Ready to Build Something Exceptional?",
    cta_banner_description: "Let's discuss your project and see how AI-powered engineering can accelerate your goals.",
    cta_banner_primary_label: "Start a Project",
    cta_banner_primary_url: "/start-project",
    cta_banner_secondary_label: "View Portfolio",
    cta_banner_secondary_url: "/projects",
    cta_enabled: false,
    cta_title: "Ready to Build Something Exceptional?",
    cta_description: "Let's discuss your project and see how AI-powered engineering can accelerate your goals.",
    cta_primary_label: "Start a Project",
    cta_primary_url: "/start-project",
    cta_secondary_label: "View Portfolio",
    cta_secondary_url: "/projects",
    // Maintenance
    maintenance_title: "We're improving things",
    maintenance_description: "The site is temporarily offline for scheduled maintenance. We'll be back shortly.",
    // Notification defaults
    enable_email_notifications: true,
    enable_telegram_notifications: true,
    enable_whatsapp_notifications: false,
    notification_email_to: "",
    telegram_chat_id: "",
    // Social links
    social_links: {
      github: "https://github.com/baraamusameh",
      linkedin: "https://linkedin.com/in/baraamusameh",
      twitter: "https://x.com/baraamusameh",
      kaggle: "https://kaggle.com/baraamusameh",
      huggingface: "https://huggingface.co/baraamusameh"
    }
  },
  forms: [
    {
      slug: "contact",
      name: "Contact Me",
      description: "General contact and inquiry form.",
      active: true,
      fields: [
        { key: "name",    label: "Your Name",                   type: "text",     placeholder: "e.g. Alex Miller",                                                         required: true,  enabled: true, order: 1, system: true  },
        { key: "email",   label: "Email Address",               type: "email",    placeholder: "alex@company.com",                                                         required: true,  enabled: true, order: 2, system: true  },
        { key: "subject", label: "Subject / Project Domain",    type: "text",     placeholder: "e.g. RAG Pipeline Architecture Inquiry",                                   required: false, enabled: true, order: 3, system: false },
        { key: "message", label: "Message / Technical Requirements", type: "textarea", placeholder: "Please describe your system goals, target timeline, or tech stack requirements...", required: true, enabled: true, order: 4, system: true  }
      ]
    },
    {
      slug: "lead",
      name: "Start Your Project",
      description: "Project inquiry and lead capture form.",
      active: true,
      fields: [
        { key: "project_type",    label: "Project Type",             type: "select",   options: ["AI & RAG Solutions", "Full-Stack Web Applications", "Modern E-Commerce Platforms", "Intelligent Automation", "Business Websites", "Custom System Architecture"], required: false, enabled: true, order: 1, system: true  },
        { key: "required_features", label: "Required Feature Modules", type: "checkbox", options: ["Vector Search & RAG Knowledge Grounding", "Custom Database Schema & PostgreSQL Setup", "Authentication & Role-Based Access Control", "Payment Gateway / Stripe Integration", "Real-time WebSockets / Live Streaming", "AI Automated Tool Calling & Agents", "Admin CMS & Analytics Dashboard", "Multimodal Image / Document Parsing", "Full TypeScript / Next.js Architecture", "Automated CI/CD & Cloud Deployment"], required: false, enabled: true, order: 2, system: true  },
        { key: "budget_range",    label: "Target Investment Range",  type: "select",   options: ["< $1,500 (Proof of Concept / Sprint)", "$1,500 - $3,000 (Standard MVP)", "$3,000 - $6,000 (Production Solution)", "$6,000 - $12,000 (Full Enterprise Build)", "$12,000+ (Comprehensive Platform)"],                         required: false, enabled: true, order: 3, system: false },
        { key: "deadline",        label: "Desired Timeline",         type: "select",   options: ["Urgent (< 2 Weeks)", "2-4 Weeks", "4-6 Weeks", "2-3 Months", "Flexible / Milestone Based"],                                                                          required: false, enabled: true, order: 4, system: false },
        { key: "description",     label: "System Objectives & Description", type: "textarea", placeholder: "Please describe the core workflow, user roles, external API integrations, or architectural goals...", required: true, enabled: true, order: 5, system: true  },
        { key: "name",            label: "Your Name",                type: "text",     placeholder: "e.g. Sam Altman",                                                      required: true,  enabled: true, order: 6, system: true  },
        { key: "email",           label: "Email Address",            type: "email",    placeholder: "sam@openai.com",                                                       required: true,  enabled: true, order: 7, system: true  },
        { key: "company",         label: "Company / Project",        type: "text",     placeholder: "e.g. Acme AI",                                                         required: false, enabled: true, order: 8, system: false },
        { key: "reference_links", label: "Reference Links / Figma / Repositories (Optional)", type: "url", placeholder: "https://figma.com/... or https://github.com/...",  required: false, enabled: true, order: 9, system: false },
        { key: "communication_pref", label: "Preferred Communication", type: "select", options: ["Email", "Telegram", "WhatsApp", "Calendly"],                              required: false, enabled: true, order: 10, system: false }
      ]
    }
  ],
  methodology_steps: [
    {
      id: "method-1",
      step_number: "01",
      title: "Discovery & Feasibility",
      title_ar: "الاكتشاف ودراسة الجدوى",
      description: "Evaluating core objectives, data schemas, vector embedding models, and API boundaries.",
      description_ar: "تقييم أهداف المشروع، متطلبات البيانات الشعاعية، والمواصفات الفنية.",
      enabled: true,
      order: 1
    },
    {
      id: "method-2",
      step_number: "02",
      title: "System & RAG Architecture",
      title_ar: "معمارية النظام والذكاء الاصطناعي",
      description: "Designing deterministic schemas, vector indices, guardrails, and streaming protocols.",
      description_ar: "هندسة قواعد البيانات pgvector، نماذج الاسترجاع RAG، وفلاتر الأمان.",
      enabled: true,
      order: 2
    },
    {
      id: "method-3",
      step_number: "03",
      title: "Full-Stack Implementation",
      title_ar: "التطوير وتكامل الواجهات",
      description: "Building responsive React UI and high-performance TypeScript backend services.",
      description_ar: "بناء الواجهات التفاعلية بـ Next.js و Tailwind مع خوادم خلفية متوافقة مع TypeScript.",
      enabled: true,
      order: 3
    },
    {
      id: "method-4",
      step_number: "04",
      title: "Cloud Deployment & Telemetry",
      title_ar: "النشر السحابي والمراقبة",
      description: "Deploying to Docker/Cloud Run with automated CI/CD and active observability.",
      description_ar: "النشر بالحاويات مع تكامل مستمر ومراقبة فورية لمعدل الأخطاء والأداء.",
      enabled: true,
      order: 4
    }
  ],
  principles: [
    {
      id: "principle-1",
      title: "Deterministic Engineering",
      title_ar: "الهندسة الحتمية والموثوقية",
      description: "Resilient systems with strict output schemas, grounding guardrails, and automated evaluation suites rather than unconstrained prompt calls.",
      description_ar: "بناء أنظمة ذكية محكومة بقواعد صارمة للتحقق من المخرجات وتقليل نسب الهلوسة للصفر.",
      enabled: true,
      order: 1
    },
    {
      id: "principle-2",
      title: "Low-Latency Architecture",
      title_ar: "معمارية منخفضة زمن الاستجابة",
      description: "Optimizing database indexing, caching embeddings, leveraging edge runtimes, and targeting sub-100ms response times.",
      description_ar: "تحسين استعلامات قواعد البيانات، تخزين التضمينات الشعاعية مؤقتاً، وتصميم واجهات فائقة السرعة.",
      enabled: true,
      order: 2
    },
    {
      id: "principle-3",
      title: "End-to-End Type Safety",
      title_ar: "أمان الأنواع من البداية للنهاية",
      description: "Strict TypeScript from database schemas and API boundaries to client components for bulletproof code safety.",
      description_ar: "استخدام TypeScript الصارم من جداول البيانات وواجهات الـ API وحتى الواجهات التفاعلية.",
      enabled: true,
      order: 3
    },
    {
      id: "principle-4",
      title: "Milestone-Driven Delivery",
      title_ar: "التسليم المعتمد على المراحل",
      description: "Clear sprint deliverables, staging preview deployments, and rapid iteration with transparent technical updates.",
      description_ar: "مخرجات واضحة، نشر بيئات تجريبية فورية، ومراجعات فنية دورية وشفافة.",
      enabled: true,
      order: 4
    }
  ],
  architecture_nodes: [
    {
      id: "input",
      title_en: "Client Request & Context",
      title_ar: "طلب العميل والسياق",
      category_en: "INGRESS LAYER",
      category_ar: "طبقة الدخول",
      tech: ["Next.js 14", "TypeScript", "HTTP/3 / WebSocket"],
      latency: "< 15ms",
      description_en: "Streaming client inputs, query tokenization, session state authentication, and rate limiting validation.",
      description_ar: "معالجة مدخلات المستخدم الفورية، التحقق من جلسة الاتصال، وتنظيم معدل الطلبات.",
      details_en: ["Zero-trust token verification", "Streaming payload chunking", "Bilingual text preprocessing"],
      details_ar: ["تحقق آمن بدون ثقة مسبقة", "تقطيع البيانات المتدفقة", "معالجة مسبقة للنصوص العربية والإنجليزية"],
      enabled: true,
      order: 1
    },
    {
      id: "rag",
      title_en: "Hybrid Vector & RAG Store",
      title_ar: "البحث الشعاعي وذاكرة RAG",
      category_en: "RETRIEVAL ENGINE",
      category_ar: "محرك الاسترجاع",
      tech: ["pgvector", "Cosine Similarity", "PostgreSQL"],
      latency: "< 45ms",
      description_en: "High-precision semantic embeddings with hybrid keyword fallbacks and dynamic similarity thresholding.",
      description_ar: "تضمين شعاعي دقيق مع بحث هجين يضمن استرجاع السياق الموثق بدقة 100%.",
      details_en: ["768-dim embeddings", "Sub-50ms index query", "Deterministic knowledge chunking"],
      details_ar: ["تضمينات بأبعاد 768", "استعلام فهرس بأقل من 50ms", "تقطيع نصوص محدد ومنظم"],
      enabled: true,
      order: 2
    },
    {
      id: "agent",
      title_en: "AI Agent & Guardrails",
      title_ar: "وكيل الذكاء الاصطناعي والأمان",
      category_en: "INTELLIGENCE CORE",
      category_ar: "نواة المعالجة الذكية",
      tech: ["Gemini 3.7", "Typed Tool Calling", "Security Filters"],
      latency: "< 450ms",
      description_en: "Reasoning core with strict prompt injection defenses, structured JSON tool calling, and anti-hallucination bounds.",
      description_ar: "نواة التفكير والاستنتاج مع حماية صارمة ضد حقن التعليمات ومخرجات محددة الأنماط.",
      details_en: ["Anti-injection security boundaries", "Automated lead qualification", "Structured schema output"],
      details_ar: ["فلاتر أمان لمنع تجاوز التعليمات", "تقييم وتأهيل تلقائي للعملاء", "مخرجات متوافقة مع JSON Schema"],
      enabled: true,
      order: 3
    },
    {
      id: "edge",
      title_en: "Edge Delivery & Microservices",
      title_ar: "التسليم السحابي والخدمات",
      category_en: "INFRASTRUCTURE",
      category_ar: "البنية التحتية",
      tech: ["Docker", "Cloud Run", "Redis Cache", "Express"],
      latency: "< 20ms",
      description_en: "Containerized deployment running behind edge reverse proxies with active telemetry observability.",
      description_ar: "نشر سحابي بالحاويات مع تخزين مؤقت ومراقبة مستمرة للأداء.",
      details_en: ["Global CDN edge caching", "Auto-scaling concurrency", "Real-time telemetry logging"],
      details_ar: ["تخزين مؤقت عالمي", "توسع تلقائي مع زيادة الطلب", "تسجيل فوري لمؤشرات الأداء"],
      enabled: true,
      order: 4
    }
  ]
};


class DatabaseManager {
  private data: DatabaseSchema;
  private isPostgresInitialized = false;
  private postgresStartupError: Error | null = null;
  private postgresWriteQueue: Promise<void> = Promise.resolve();
  private postgresRevision = 0;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * PG_SYNC_MODE controls how PostgreSQL relates to db.json:
   *  - load   (default, previous behaviour): on startup, content tables in PG replace the JSON copy
   *            (a snapshot of db.json is written first, see loadFromPostgres).
   *  - mirror : db.json is authoritative; PG only receives writes (seeded when empty).
   *  - off    : PG is not used even if DATABASE_URL is set.
   */
  private static pgSyncMode(): 'load' | 'mirror' | 'off' {
    const v = (process.env.PG_SYNC_MODE || 'load').trim().toLowerCase();
    return v === 'mirror' || v === 'off' ? v : 'load';
  }

  private startupSync: Promise<void>;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
    this.ensureChunks();
    this.startupSync = this.initPostgresIfAvailable();
  }

  /** Resolves when the optional PostgreSQL startup sync has finished (or after timeoutMs). */
  public async waitForStartupSync(timeoutMs = 15_000): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      this.startupSync.catch(() => undefined),
      new Promise<void>((resolve) => { timer = setTimeout(() => { console.warn('[PostgreSQL] Startup sync still running after timeout; serving JSON data.'); resolve(); }, timeoutMs); })
    ]);
    if (timer) clearTimeout(timer);
  }

  /** Never serve the ephemeral JSON cache as production data on Vercel. */
  public isProductionPostgresReady(): boolean {
    return !isVercelProduction() || this.isPostgresInitialized;
  }

  /** Refresh the canonical state so separate Vercel instances do not serve stale JSON snapshots. */
  public async refreshProductionState(): Promise<void> {
    if (!isVercelProduction() || !this.isPostgresInitialized) return;
    const pool = getPostgresPool();
    if (!pool) throw new Error('PostgreSQL pool is unavailable');
    const result = await pool.query('SELECT data, revision FROM portfolio_state WHERE id = $1', ['main']);
    if (!result.rows[0]?.data) throw new Error('PostgreSQL canonical state is missing');
    this.data = this.mergeWithDefaults(result.rows[0].data);
    this.postgresRevision = Number(result.rows[0].revision);
    this.ensureChunks();
  }

  /** Wait until the latest state snapshot has been durably committed. */
  public async flushPostgres(): Promise<void> {
    await this.postgresWriteQueue;
  }

  private async initPostgresIfAvailable() {
    if (!isPostgresConfigured() || DatabaseManager.pgSyncMode() === 'off') return;
    try {
      const initialized = await initializePostgresSchema();
      if (initialized) {
        this.isPostgresInitialized = true;
        await this.syncFromPostgresOrSeed();
      }
    } catch (e) {
      this.postgresStartupError = e instanceof Error ? e : new Error(String(e));
      if (isVercelProduction()) console.error('[PostgreSQL] Vercel startup sync failed; local JSON fallback is disabled.');
      else console.warn('[PostgreSQL] Failed to sync on startup, using local storage:', e);
    }
  }

  private async syncFromPostgresOrSeed() {
    const pool = getPostgresPool();
    if (!pool) return;

    try {
      // Check if projects table has records
      const state = await pool.query('SELECT data, revision FROM portfolio_state WHERE id = $1', ['main']);
      if (state.rows[0]?.data) {
        this.data = this.mergeWithDefaults(state.rows[0].data);
        this.postgresRevision = Number(state.rows[0].revision);
        this.reindexAllKnowledge();
        console.log('[PostgreSQL] Loaded canonical application state.');
        return;
      }

      const res = await pool.query('SELECT COUNT(*) FROM portfolio_projects');
      const count = parseInt(res.rows[0]?.count || '0', 10);

      if (count === 0) {
        console.log('[PostgreSQL] Database tables are empty. Seeding initial data...');
        await this.seedPostgresData();
        await this.persistStateNow(this.data);
      } else if (isVercelProduction()) {
        throw new Error('PostgreSQL has legacy entity rows but no portfolio_state snapshot; run db:migrate against this database before deployment.');
      } else if (DatabaseManager.pgSyncMode() === 'mirror') {
        console.log('[PostgreSQL] PG_SYNC_MODE=mirror: db.json stays authoritative; PostgreSQL receives writes only.');
      } else {
        console.log('[PostgreSQL] Found existing records in PostgreSQL. Syncing to memory state...');
        await this.loadFromPostgres();
        await this.persistStateNow(this.data);
      }
    } catch (e) {
      console.warn('[PostgreSQL] Sync check warning:', e);
    }
  }

  private async seedPostgresData() {
    const pool = getPostgresPool();
    if (!pool) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Profile
      await client.query(
        'INSERT INTO portfolio_profile (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2',
        ['main', JSON.stringify(this.data.profile)]
      );

      // Projects
      for (const p of this.data.projects) {
        await client.query(
          'INSERT INTO portfolio_projects (id, slug, title, category, status, featured, data) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET data = $7',
          [p.id, p.slug, p.title, p.category, p.status, Boolean(p.featured), JSON.stringify(p)]
        );
      }

      // Services
      for (const s of this.data.services) {
        await client.query(
          'INSERT INTO portfolio_services (id, slug, title, category, active, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET data = $6',
          [s.id, s.slug, s.title, s.category, Boolean(s.active), JSON.stringify(s)]
        );
      }

      // Skills
      for (const sk of this.data.skills) {
        await client.query(
          'INSERT INTO portfolio_skills (id, name, category, proficiency, data) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET data = $5',
          [sk.id, sk.name, sk.category, sk.proficiency, JSON.stringify(sk)]
        );
      }

      // Blog
      for (const b of this.data.blog) {
        await client.query(
          'INSERT INTO portfolio_blog (id, slug, title, category, published, views_count, data) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET data = $7',
          [b.id, b.slug, b.title, b.category, Boolean(b.published), b.views_count || 0, JSON.stringify(b)]
        );
      }

      // Settings
      await client.query(
        'INSERT INTO portfolio_settings (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2',
        ['main', JSON.stringify(this.data.settings)]
      );

      await client.query('COMMIT');
      console.log('[PostgreSQL] Initial seed data committed successfully.');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] Seed transaction failed:', e);
    } finally {
      client.release();
    }
  }

  /** Keeps a copy of db.json before PostgreSQL content replaces it (last 5 copies are kept). */
  private snapshotBeforePgLoad() {
    try {
      if (!fs.existsSync(DB_FILE)) return;
      const target = path.join(DATA_DIR, `db.pre-pg-load-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.copyFileSync(DB_FILE, target);
      const old = fs.readdirSync(DATA_DIR).filter((n) => n.startsWith('db.pre-pg-load-')).sort();
      for (const name of old.slice(0, Math.max(0, old.length - 5))) fs.rmSync(path.join(DATA_DIR, name), { force: true });
    } catch (e) {
      console.warn('[PostgreSQL] Could not snapshot db.json before loading from PostgreSQL:', (e as Error).message);
    }
  }

  private async loadFromPostgres() {
    const pool = getPostgresPool();
    if (!pool) return;
    this.snapshotBeforePgLoad();

    try {
      const state = await pool.query('SELECT data, revision FROM portfolio_state WHERE id = $1', ['main']);
      if (state.rows[0]?.data) {
        this.data = this.mergeWithDefaults(state.rows[0].data);
        this.postgresRevision = Number(state.rows[0].revision);
        this.reindexAllKnowledge();
        return;
      }
      // Load Profile
      const profRes = await pool.query('SELECT data FROM portfolio_profile WHERE id = $1', ['main']);
      if (profRes.rows[0]?.data) {
        this.data.profile = profRes.rows[0].data;
      }

      // Load Projects
      const projRes = await pool.query('SELECT data FROM portfolio_projects ORDER BY created_at DESC');
      if (projRes.rows.length > 0) {
        this.data.projects = projRes.rows.map(r => r.data);
      }

      // Load Services
      const srvRes = await pool.query('SELECT data FROM portfolio_services ORDER BY created_at ASC');
      if (srvRes.rows.length > 0) {
        this.data.services = srvRes.rows.map(r => r.data);
      }

      // Load Skills
      const skRes = await pool.query('SELECT data FROM portfolio_skills');
      if (skRes.rows.length > 0) {
        this.data.skills = skRes.rows.map(r => r.data);
      }

      // Load Blog
      const blogRes = await pool.query('SELECT data FROM portfolio_blog ORDER BY created_at DESC');
      if (blogRes.rows.length > 0) {
        this.data.blog = blogRes.rows.map(r => r.data);
      }

      // Load Settings
      const setRes = await pool.query('SELECT data FROM portfolio_settings WHERE id = $1', ['main']);
      if (setRes.rows[0]?.data) {
        this.data.settings = setRes.rows[0].data;
      }

      this.reindexAllKnowledge();
      this.saveData(); // Synchronize local cache file
    } catch (e) {
      console.warn('[PostgreSQL] Error loading data from postgres:', e);
    }
  }

  private async syncMutationToPostgres(table: string, id: string, data: any, op: 'upsert' | 'delete') {
    if (!isPostgresConfigured() || DatabaseManager.pgSyncMode() === 'off') return;
    if (isVercelProduction()) return; // the canonical snapshot is the only Vercel source of truth
    const pool = getPostgresPool();
    if (!pool) return;

    try {
      if (op === 'delete') {
        await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      } else if (table === 'portfolio_projects') {
        await pool.query(
          `INSERT INTO portfolio_projects (id, slug, title, category, status, featured, data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET slug = $2, title = $3, category = $4, status = $5, featured = $6, data = $7, updated_at = CURRENT_TIMESTAMP`,
          [id, data.slug, data.title, data.category, data.status, Boolean(data.featured), JSON.stringify(data)]
        );
      } else if (table === 'portfolio_services') {
        await pool.query(
          `INSERT INTO portfolio_services (id, slug, title, category, active, data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET slug = $2, title = $3, category = $4, active = $5, data = $6, updated_at = CURRENT_TIMESTAMP`,
          [id, data.slug, data.title, data.category, Boolean(data.active), JSON.stringify(data)]
        );
      } else if (table === 'portfolio_blog') {
        await pool.query(
          `INSERT INTO portfolio_blog (id, slug, title, category, published, views_count, data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET slug = $2, title = $3, category = $4, published = $5, views_count = $6, data = $7, updated_at = CURRENT_TIMESTAMP`,
          [id, data.slug, data.title, data.category, Boolean(data.published), data.views_count || 0, JSON.stringify(data)]
        );
      } else if (table === 'portfolio_leads') {
        await pool.query(
          `INSERT INTO portfolio_leads (id, name, email, stage, ai_qualification_score, data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET name = $2, email = $3, stage = $4, ai_qualification_score = $5, data = $6, updated_at = CURRENT_TIMESTAMP`,
          [id, data.name, data.email, data.status || 'new', data.ai_score || 50, JSON.stringify(data)]
        );
      } else if (table === 'portfolio_messages') {
        await pool.query(
          `INSERT INTO portfolio_messages (id, name, email, status, data)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET name = $2, email = $3, status = $4, data = $5`,
          [id, data.name, data.email, data.status || 'new', JSON.stringify(data)]
        );
      } else if (table === 'portfolio_profile') {
        await pool.query(
          `INSERT INTO portfolio_profile (id, data, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP`,
          ['main', JSON.stringify(data)]
        );
      } else if (table === 'portfolio_settings') {
        await pool.query(
          `INSERT INTO portfolio_settings (id, data, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP`,
          ['main', JSON.stringify(data)]
        );
      }
    } catch (e) {
      console.warn(`[PostgreSQL] Sync error for table ${table}:`, e);
    }
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /** Merge a parsed database object with the compiled-in defaults so every key exists. */
  private mergeWithDefaults(parsed: any): DatabaseSchema {
    const allowedSlugs = new Set(['contact', 'lead']);
    const parsedForms = Array.isArray(parsed.forms) ? parsed.forms.filter((f: any) => f && allowedSlugs.has(f.slug)) : [];
    const contactForm = parsedForms.find((f: any) => f.slug === 'contact') || initialData.forms.find((f) => f.slug === 'contact')!;
    const leadForm = parsedForms.find((f: any) => f.slug === 'lead') || initialData.forms.find((f) => f.slug === 'lead')!;
    const nonEmpty = (v: any, fallback: any) => (Array.isArray(v) && v.length > 0 ? v : fallback);
    return {
      ...initialData,
      ...parsed,
      profile: { ...initialData.profile, ...(parsed.profile || {}) },
      settings: { ...initialData.settings, ...(parsed.settings || {}) },
      methodology_steps: nonEmpty(parsed.methodology_steps, initialData.methodology_steps),
      principles: nonEmpty(parsed.principles, initialData.principles),
      architecture_nodes: nonEmpty(parsed.architecture_nodes, initialData.architecture_nodes),
      // Only the system forms ('contact' and 'lead') are supported.
      forms: [contactForm, leadForm]
    };
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      let parsed: any;
      try {
        parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('top-level value is not an object');
      } catch (e) {
        // Never replace an unreadable database with seed data: that silently destroys
        // every real message, lead and edit. Keep a copy and stop instead.
        const quarantine = path.join(DATA_DIR, `db.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        try {
          fs.copyFileSync(DB_FILE, quarantine);
        } catch {
          /* best effort; the original file is left untouched either way */
        }
        console.error(`[DB] ${DB_FILE} could not be parsed (${errorText(e) || e}). A copy was saved to ${quarantine}.`);
        console.error('[DB] Startup aborted to protect existing data. Repair or restore db.json (see BACKUP_RESTORE.md), then restart.');
        throw new Error('Database file is unreadable; startup aborted to protect data.');
      }
      return this.mergeWithDefaults(parsed);
    }

    // First boot: an optional operator-provided seed file (.data/db.seed.json) takes
    // precedence over the compiled-in defaults.
    const SEED_FILE = path.join(DATA_DIR, 'db.seed.json');
    if (fs.existsSync(SEED_FILE)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
        console.log('[DB] Initializing from db.seed.json');
        const seeded = this.mergeWithDefaults(parsed);
        this.saveData(seeded);
        return seeded;
      } catch (e) {
        console.error('[DB] db.seed.json could not be parsed; using built-in defaults instead.', e);
      }
    }
    this.saveData(initialData);
    return JSON.parse(JSON.stringify(initialData));
  }

  public saveData(dataToSave?: DatabaseSchema) {
    if (!dataToSave && this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    let tempFile = '';
    try {
      this.ensureDataDir();
      const payload = dataToSave || this.data;
      const jsonStr = JSON.stringify(payload, null, 2);
      tempFile = path.join(DATA_DIR, `db.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`);
      fs.writeFileSync(tempFile, jsonStr, 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
      if (this.isPostgresInitialized) this.queuePostgresStateWrite(payload);
    } catch (e) {
      console.error("Failed to write to db.json", e);
      if (tempFile) {
        try { fs.rmSync(tempFile, { force: true }); } catch { /* ignore */ }
      }
    }
  }

  private queuePostgresStateWrite(payload: DatabaseSchema): void {
    this.postgresWriteQueue = this.postgresWriteQueue
      .then(() => this.persistStateNow(payload))
      .catch((e) => {
        console.error('[PostgreSQL] Canonical state write failed:', errorText(e) || e);
        if (isVercelProduction()) throw e;
      });
  }

  private async persistStateNow(payload: DatabaseSchema): Promise<void> {
    const pool = getPostgresPool();
    if (!pool) throw new Error('PostgreSQL pool is unavailable');
    if (this.postgresRevision === 0) {
      const inserted = await pool.query(
        `INSERT INTO portfolio_state (id, data, revision, updated_at)
         VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING RETURNING revision`,
        ['main', JSON.stringify(payload)]
      );
      if (inserted.rowCount === 1) {
        this.postgresRevision = Number(inserted.rows[0].revision);
        return;
      }
      const current = await pool.query('SELECT revision FROM portfolio_state WHERE id = $1', ['main']);
      this.postgresRevision = Number(current.rows[0]?.revision || 0);
    }

    const updated = await pool.query(
      `UPDATE portfolio_state
       SET data = $2, revision = revision + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND revision = $3
       RETURNING revision`,
      ['main', JSON.stringify(payload), this.postgresRevision]
    );
    if (updated.rowCount !== 1) {
      throw new Error('PERSISTENCE_CONFLICT: PostgreSQL state changed before this update committed.');
    }
    this.postgresRevision = Number(updated.rows[0].revision);
  }

  /** Coalesces frequent low-value writes (analytics events, view counters) into one write. */
  public scheduleSave(delayMs = 1000) {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveData();
    }, delayMs);
    this.saveTimer.unref?.();
  }

  /** Writes any pending debounced change immediately (called on shutdown and process exit). */
  public flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      this.saveData();
    }
  }

  private ensureChunks() {
    if (!this.data.chunks || this.data.chunks.length === 0) {
      this.reindexAllKnowledge();
    }
  }

  /** Stable content fingerprint used to keep embeddings of unchanged chunks across re-indexing. */
  private static contentHash(content: string): string {
    return crypto.createHash('sha256').update(content || '', 'utf8').digest('hex');
  }

  /**
   * Returns a slug that no other record in the collection uses ("-2", "-3"… appended), so two
   * projects/posts can never shadow each other at the same URL.
   */
  private uniqueSlug(items: { id: string; slug?: string }[], wanted: string | undefined, title: string | undefined, prefix: string, excludeId?: string): string {
    const base = (wanted && String(wanted).trim()) ? slugifyServer(String(wanted), prefix) : slugifyServer(title || '', prefix);
    const taken = new Set(items.filter((i) => i.id !== excludeId).flatMap((i) => [i.slug, i.id]).filter(Boolean));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
      const candidate = `${base}-${n}`;
      if (!taken.has(candidate)) return candidate;
    }
  }

  public reindexAllKnowledge() {
    // Embeddings cost money and quota: re-attach existing vectors to chunks whose text did not change.
    const previousEmbeddings = new Map<string, number[]>();
    for (const c of this.data.chunks || []) {
      if (Array.isArray(c.embedding) && c.embedding.length > 0) {
        previousEmbeddings.set(DatabaseManager.contentHash(c.content), c.embedding);
      }
    }
    const chunks: KnowledgeChunk[] = [];

    // Profile chunks (Bilingual AR + EN)
    const p = this.data.profile;
    const focusAreas = (p.focus_areas || []).join(', ');
    chunks.push({
      id: `chunk-prof-1`,
      document_id: 'know-1',
      // Only facts that exist in the profile are indexed; no invented defaults for experience,
      // project counts or satisfaction (the assistant would otherwise repeat them as facts).
      content: [
        `Profile: ${p.name || ''}, ${p.title || ''}. ${p.headline || ''}. Bio: ${p.bio || ''} About: ${p.about_long || ''}.`,
        p.location ? `Location: ${p.location}.` : '',
        p.email ? `Email: ${p.email}.` : '',
        p.years_experience ? `Experience: ${p.years_experience} years.` : '',
        p.completed_projects ? `Completed projects: ${p.completed_projects}.` : '',
        p.satisfaction_rate || p.client_satisfaction ? `Client satisfaction: ${p.satisfaction_rate || `${p.client_satisfaction}%`}.` : '',
        p.available_for_freelance !== undefined ? `Available for freelance: ${p.available_for_freelance}.` : '',
        focusAreas ? `Focus areas: ${focusAreas}.` : '',
        `
Arabic Profile / نبذة بالعربية: ${p.name || ''}${p.title ? `، ${p.title}` : ''}.`,
        p.location ? `الموقع: ${p.location}.` : '',
        p.email ? `البريد الإلكتروني للتواصل: ${p.email}.` : '',
        p.years_experience ? `الخبرة: ${p.years_experience} سنوات.` : '',
        p.completed_projects ? `عدد المشاريع المنجزة: ${p.completed_projects}.` : '',
        focusAreas ? `مجالات التخصص: ${focusAreas}.` : ''
      ].filter(Boolean).join(' '),
      metadata: { type: 'profile', name: p.name, email: p.email }
    });

    // Services chunks (Bilingual AR + EN)
    for (const s of this.data.services) {
      if (s.active !== false) {
        const features = (s.features || []).join(', ');
        const techs = (s.technologies || []).join(', ');
        const deliverables = (s.deliverables || []).join(', ');
        const processStr = (s.process || []).map(pr => `${pr.step || ''}: ${pr.title || ''} - ${pr.description || ''}`).join('; ');
        const faqStr = (s.faq || []).map(f => `Q: ${f.question || ''} A: ${f.answer || ''}`).join(' ');

        chunks.push({
          id: `chunk-srv-${s.id}`,
          document_id: 'know-2',
          content: `Service: ${s.title || ''} (${s.category || ''}). Short Description: ${s.short_description || ''}. Full Description: ${s.full_description || ''}. Starting Price: ${s.starting_price || ''}. Estimated Timeline: ${s.timeline || ''}. Features: ${features}. Technologies: ${techs}. Deliverables: ${deliverables}. Process: ${processStr}. FAQ: ${faqStr}
خدمة بالعربية: ${s.title}، تصنيف الخدمة: ${s.category}، السعر الابتدائي يبدأ من ${s.starting_price}، المدة الزمنية المتوقعة: ${s.timeline}. تشمل المخرجات: ${deliverables}. تفاصيل الخدمة: ${s.short_description}`,
          metadata: { type: 'service', slug: s.slug || s.id, title: s.title, price: s.starting_price, category: s.category }
        });
      }
    }

    // Projects chunks (Bilingual AR + EN)
    for (const proj of this.data.projects.filter((item) => item.published !== false)) {
      const resultsStr = (proj.results || []).join('. ');
      const techs = (proj.technologies || []).join(', ');
      const features = (proj.features || []).join(', ');
      const challenges = (proj.challenges || []).join('. ');
      const lessons = (proj.lessons_learned || []).join('. ');

      chunks.push({
        id: `chunk-proj-${proj.id}`,
        document_id: 'know-3',
        content: `Project: ${proj.title || ''} (Category: ${proj.category || ''}). Short: ${proj.short_description || ''}. Problem: ${proj.problem || ''}. Solution: ${proj.solution || ''}. Full Description: ${proj.full_description || ''}. Results: ${resultsStr}. Technologies used: ${techs}. Key Features: ${features}. Architecture: ${proj.architecture || ''}. Lead Time: ${proj.lead_time || ''}. Challenges: ${challenges}. Lessons Learned: ${lessons}. Live URL: ${proj.live_url || ''}. GitHub URL: ${proj.github_url || ''}.
مشروع بالعربية: ${proj.title}، التصنيف: ${proj.category}، الوصف: ${proj.short_description}. التقنيات المستخدمة: ${techs}. المشكلة والحل: ${proj.solution}. النتائج المحققة: ${resultsStr}`,
        metadata: { type: 'project', slug: proj.slug || proj.id, title: proj.title, category: proj.category }
      });
    }

    // Skills chunks (Bilingual AR + EN)
    const skillsByCategory: Record<string, string[]> = {};
    for (const sk of this.data.skills) {
      const cat = sk.category || 'General';
      if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
      skillsByCategory[cat].push(`${sk.name}${sk.proficiency ? ` (${sk.proficiency}% proficiency${sk.years_experience ? `, ${sk.years_experience} yrs` : ''})` : sk.years_experience ? ` (${sk.years_experience} yrs)` : ''}`);
    }
    for (const [cat, skList] of Object.entries(skillsByCategory)) {
      chunks.push({
        id: `chunk-skill-${cat.replace(/\s+/g, '-').toLowerCase()}`,
        document_id: 'know-1',
        content: `Skills in ${cat}: ${skList.join(', ')}.
مهارات براء في تصنيف ${cat}: ${skList.join(', ')}.`,
        metadata: { type: 'skill', category: cat }
      });
    }

    // Blog chunks
    for (const post of this.data.blog) {
      if (post.published !== false) {
        const titleStr = typeof post.title === 'string' ? post.title : (post.title ? JSON.stringify(post.title) : '');
        const excerptStr = typeof post.excerpt === 'string' ? post.excerpt : (post.excerpt ? JSON.stringify(post.excerpt) : '');
        const contentRaw = typeof post.content === 'string' ? post.content : (post.content ? JSON.stringify(post.content) : '');
        const tags = (post.tags || []).join(', ');
        chunks.push({
          id: `chunk-blog-${post.id}`,
          document_id: post.id,
          content: `Blog Post: "${titleStr}". Category: ${post.category || ''}. Excerpt: ${excerptStr}. Content Summary: ${contentRaw.substring(0, 800)}. Tags: ${tags}. Read time: ${post.read_time || '5 min'}.
مقال تقني: "${titleStr}"، تصنيف: ${post.category}، ملخص: ${excerptStr}`,
          metadata: { type: 'blog', slug: post.slug || post.id, title: titleStr }
        });
      }
    }

    // Experience and Education chunks
    for (const exp of this.data.experience.filter((item) => item.published !== false)) {
      const ach = (exp.achievements || []).join('. ');
      const techs = (exp.technologies || []).join(', ');
      chunks.push({
        id: `chunk-exp-${exp.id}`,
        document_id: 'know-1',
        content: `Work Experience: ${exp.role || ''} at ${exp.company || ''} (${exp.start_date || ''} to ${exp.current ? 'Present' : (exp.end_date || '')}). Description: ${exp.description || ''}. Key Achievements: ${ach}. Tech used: ${techs}.
خبرة عملية: ${exp.role} في ${exp.company}، الإنجازات: ${ach}. التقنيات: ${techs}.`,
        metadata: { type: 'experience', company: exp.company }
      });
    }

    for (const edu of this.data.education.filter((item) => item.published !== false)) {
      const ach = (edu.achievements || []).join('. ');
      chunks.push({
        id: `chunk-edu-${edu.id}`,
        document_id: 'know-1',
        content: `Education: ${edu.degree || ''} from ${edu.institution || ''} (${edu.start_year || ''} - ${edu.end_year || ''}). Field: ${edu.field_of_study || ''}. Grade: ${edu.grade || ''}. Achievements: ${ach}.
التعليم والشهادات الأكاديمية: ${edu.degree} من ${edu.institution}، التقدير: ${edu.grade}.`,
        metadata: { type: 'education', institution: edu.institution }
      });
    }

    // Custom knowledge documents are first-class RAG sources.  Retain them
    // across reindexing instead of silently discarding administrator content.
    for (const doc of this.data.knowledge) {
      if (doc.status === 'indexed' && doc.content?.trim()) {
        const paragraphs = doc.content
          .split(/\n\s*\n+/)
          .map(p => p.trim())
          .filter(Boolean);

        const chunksToCreate = paragraphs.length > 0 ? paragraphs : [doc.content.trim()];
        doc.chunks_count = chunksToCreate.length;
        doc.last_indexed_at = new Date().toISOString();

        chunksToCreate.forEach((text, i) => {
          chunks.push({
            id: chunksToCreate.length === 1 ? `chunk-knowledge-${doc.id}` : `chunk-knowledge-${doc.id}-${i}`,
            document_id: doc.id,
            content: text,
            metadata: {
              type: 'custom_knowledge',
              title: doc.title,
              source_type: doc.source_type,
              chunk_index: i,
              total_chunks: chunksToCreate.length
            }
          });
        });
      } else {
        doc.chunks_count = 0;
      }
    }

    for (const c of chunks) {
      const kept = previousEmbeddings.get(DatabaseManager.contentHash(c.content));
      if (kept) c.embedding = kept;
    }

    this.data.chunks = chunks;
    this.saveData();
    return chunks;
  }

  /**
   * Stores an embedding for the chunk that currently has this id AND this exact content.
   * Returns false when the chunk changed or disappeared meanwhile (the vector is then discarded).
   */
  public attachEmbedding(chunkId: string, content: string, embedding: number[]): boolean {
    const chunk = this.data.chunks.find((c) => c.id === chunkId && c.content === content);
    if (!chunk || !Array.isArray(embedding) || embedding.length === 0 || embedding.some((value) => !Number.isFinite(value))) return false;
    chunk.embedding = embedding;
    return true;
  }

  // Profile
  public getProfile(): Profile {
    return this.data.profile;
  }
  public updateProfile(updated: Partial<Profile>): Profile {
    this.data.profile = { ...this.data.profile, ...updated };
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    this.syncMutationToPostgres('portfolio_profile', 'main', this.data.profile, 'upsert');
    return this.data.profile;
  }

  // Projects
  public getProjects(publishedOnly = false): Project[] {
    const projects = publishedOnly ? this.data.projects.filter((project) => project.published !== false) : this.data.projects;
    return [...projects].sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
  }
  public getProjectBySlug(slug: string): Project | undefined {
    return this.data.projects.find(p => p.slug === slug || p.id === slug);
  }
  public createProject(proj: Omit<Project, 'id'> & { id?: string }): Project {
    const id = proj.id || newId('proj');
    const newProj: Project = { ...proj, id, slug: this.uniqueSlug(this.data.projects, proj.slug, proj.title, 'project') };
    this.data.projects.unshift(newProj);
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    this.syncMutationToPostgres('portfolio_projects', id, newProj, 'upsert');
    return newProj;
  }
  public updateProject(id: string, updated: Partial<Project>): Project | undefined {
    const idx = this.data.projects.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    if (updated.slug !== undefined && updated.slug !== (this.data.projects[idx] as any).slug) updated = { ...updated, slug: this.uniqueSlug(this.data.projects, updated.slug, updated.title || this.data.projects[idx].title, 'project', id) };
    this.data.projects[idx] = { ...this.data.projects[idx], ...updated };
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    this.syncMutationToPostgres('portfolio_projects', id, this.data.projects[idx], 'upsert');
    return this.data.projects[idx];
  }
  public deleteProject(id: string): boolean {
    const idx = this.data.projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.projects.splice(idx, 1);
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    this.syncMutationToPostgres('portfolio_projects', id, null, 'delete');
    return true;
  }

  // Services
  public getServices(publicOnly = false): Service[] {
    const services = publicOnly ? this.data.services.filter((service) => service.active !== false) : this.data.services;
    return [...services].sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
  }
  public getServiceBySlug(slug: string): Service | undefined {
    return this.data.services.find(s => s.slug === slug || s.id === slug);
  }
  public createService(srv: Omit<Service, 'id'> & { id?: string }): Service {
    const id = srv.id || newId('srv');
    const newSrv: Service = { ...srv, id, slug: this.uniqueSlug(this.data.services, srv.slug, srv.title, 'service') };
    this.data.services.push(newSrv);
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    this.syncMutationToPostgres('portfolio_services', id, newSrv, 'upsert');
    return newSrv;
  }
  public updateService(id: string, updated: Partial<Service>): Service | undefined {
    const idx = this.data.services.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    if (updated.slug !== undefined && updated.slug !== (this.data.services[idx] as any).slug) updated = { ...updated, slug: this.uniqueSlug(this.data.services, updated.slug, updated.title || this.data.services[idx].title, 'service', id) };
    this.data.services[idx] = { ...this.data.services[idx], ...updated };
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    this.syncMutationToPostgres('portfolio_services', id, this.data.services[idx], 'upsert');
    return this.data.services[idx];
  }
  public deleteService(id: string): boolean {
    const idx = this.data.services.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.data.services.splice(idx, 1);
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    this.syncMutationToPostgres('portfolio_services', id, null, 'delete');
    return true;
  }

  // Skills
  public getSkills(): Skill[] {
    return [...this.data.skills].sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
  }
  public createSkill(sk: Omit<Skill, 'id'> & { id?: string }): Skill {
    const id = sk.id || newId('sk');
    const newSk: Skill = { ...sk, id };
    this.data.skills.push(newSk);
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    return newSk;
  }
  public updateSkill(id: string, updated: Partial<Skill>): Skill | undefined {
    const idx = this.data.skills.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.data.skills[idx] = { ...this.data.skills[idx], ...updated };
    this.saveData();
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    return this.data.skills[idx];
  }
  public deleteSkill(id: string): boolean {
    const idx = this.data.skills.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.data.skills.splice(idx, 1);
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    return true;
  }

  // Blog
  public getBlogPosts(publishedOnly = false): BlogPost[] {
    if (publishedOnly) {
      return this.data.blog.filter(b => b.published);
    }
    return this.data.blog;
  }
  public getBlogPostBySlug(slug: string): BlogPost | undefined {
    return this.data.blog.find(b => b.slug === slug || b.id === slug);
  }
  public incrementBlogView(slug: string) {
    const post = this.data.blog.find(b => b.slug === slug || b.id === slug);
    if (post) {
      post.views_count = (post.views_count || 0) + 1;
      this.scheduleSave();
    }
  }
  public createBlogPost(post: Omit<BlogPost, 'id'> & { id?: string }): BlogPost {
    const id = post.id || newId('post');
    const newPost: BlogPost = { ...post, id, views_count: 0, slug: this.uniqueSlug(this.data.blog as any, post.slug, typeof post.title === 'string' ? post.title : '', 'post') };
    this.data.blog.unshift(newPost);
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    this.syncMutationToPostgres('portfolio_blog', id, newPost, 'upsert');
    return newPost;
  }
  public updateBlogPost(id: string, updated: Partial<BlogPost>): BlogPost | undefined {
    const idx = this.data.blog.findIndex(b => b.id === id);
    if (idx === -1) return undefined;
    if (updated.slug !== undefined && updated.slug !== (this.data.blog[idx] as any).slug) updated = { ...updated, slug: this.uniqueSlug(this.data.blog as any, updated.slug, typeof updated.title === 'string' ? updated.title : '', 'post', id) };
    this.data.blog[idx] = { ...this.data.blog[idx], ...updated };
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    this.syncMutationToPostgres('portfolio_blog', id, this.data.blog[idx], 'upsert');
    return this.data.blog[idx];
  }
  public deleteBlogPost(id: string): boolean {
    const idx = this.data.blog.findIndex(b => b.id === id);
    if (idx === -1) return false;
    this.data.blog.splice(idx, 1);
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    this.syncMutationToPostgres('portfolio_blog', id, null, 'delete');
    return true;
  }

  // Experience, Education, Certificates, Testimonials
  public getExperience(publicOnly = false): Experience[] {
    const items = publicOnly ? this.data.experience.filter((item) => item.published !== false) : this.data.experience;
    return [...items].sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
  }
  public updateExperience(list: Experience[]): Experience[] {
    this.data.experience = list;
    this.saveData();
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    return this.data.experience;
  }

  public getEducation(publicOnly = false): Education[] {
    const items = publicOnly ? this.data.education.filter((item) => item.published !== false) : this.data.education;
    return [...items].sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
  }
  public updateEducation(list: Education[]): Education[] {
    this.data.education = list;
    this.saveData();
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    return this.data.education;
  }

  public getCertificates(publicOnly = false): Certificate[] {
    const items = publicOnly ? this.data.certificates.filter((item) => item.published !== false) : this.data.certificates;
    return [...items].sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
  }
  public updateCertificates(list: Certificate[]): Certificate[] {
    this.data.certificates = list;
    this.saveData();
    return this.data.certificates;
  }

  public getCourses(): Course[] { return this.data.courses || []; }
  public updateCourses(list: Course[]): Course[] {
    this.data.courses = list;
    this.saveData();
    return this.data.courses;
  }

  public getTestimonials(publishedOnly = true): Testimonial[] {
    if (publishedOnly) {
      return this.data.testimonials.filter(t => t.published);
    }
    return this.data.testimonials;
  }
  public createTestimonial(t: Omit<Testimonial, 'id'> & { id?: string }): Testimonial {
    const id = t.id || newId('test');
    const newTest: Testimonial = { ...t, id };
    this.data.testimonials.unshift(newTest);
    this.saveData();
    return newTest;
  }
  public updateTestimonial(id: string, updated: Partial<Testimonial>): Testimonial | undefined {
    const idx = this.data.testimonials.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    this.data.testimonials[idx] = { ...this.data.testimonials[idx], ...updated };
    this.saveData();
    return this.data.testimonials[idx];
  }
  public deleteTestimonial(id: string): boolean {
    const idx = this.data.testimonials.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.data.testimonials.splice(idx, 1);
    this.saveData();
    return true;
  }

  // Messages
  public getMessages(): ContactMessage[] {
    return this.data.messages;
  }
  public createMessage(msg: Omit<ContactMessage, 'id' | 'created_at' | 'status'>): ContactMessage {
    const newMsg: ContactMessage = {
      ...msg,
      id: newId('msg'),
      status: 'new',
      created_at: new Date().toISOString()
    };
    this.data.messages.unshift(newMsg);
    this.saveData();
    this.syncMutationToPostgres('portfolio_messages', newMsg.id, newMsg, 'upsert');
    return newMsg;
  }
  public updateMessageStatus(id: string, status: ContactMessage['status']): boolean {
    const msg = this.data.messages.find(m => m.id === id);
    if (msg) {
      msg.status = status;
      this.saveData();
      this.syncMutationToPostgres('portfolio_messages', id, msg, 'upsert');
      return true;
    }
    return false;
  }
  public deleteMessage(id: string): boolean {
    const idx = this.data.messages.findIndex(m => m.id === id);
    if (idx === -1) return false;
    this.data.messages.splice(idx, 1);
    this.saveData();
    this.syncMutationToPostgres('portfolio_messages', id, null, 'delete');
    return true;
  }

  // Leads
  public getLeads(): ProjectLead[] {
    return this.data.leads;
  }
  public createLead(lead: Omit<ProjectLead, 'id' | 'created_at' | 'updated_at'>): ProjectLead {
    const now = new Date().toISOString();
    const newLead: ProjectLead = {
      ...lead,
      id: newId('lead'),
      created_at: now,
      updated_at: now
    };
    this.data.leads.unshift(newLead);
    this.saveData();
    this.syncMutationToPostgres('portfolio_leads', newLead.id, newLead, 'upsert');
    return newLead;
  }
  public updateLead(id: string, updated: Partial<ProjectLead>): ProjectLead | undefined {
    const idx = this.data.leads.findIndex(l => l.id === id);
    if (idx === -1) return undefined;
    this.data.leads[idx] = {
      ...this.data.leads[idx],
      ...updated,
      updated_at: new Date().toISOString()
    };
    this.saveData();
    this.syncMutationToPostgres('portfolio_leads', id, this.data.leads[idx], 'upsert');
    return this.data.leads[idx];
  }
  public deleteLead(id: string): boolean {
    const idx = this.data.leads.findIndex(l => l.id === id);
    if (idx === -1) return false;
    this.data.leads.splice(idx, 1);
    this.saveData();
    this.syncMutationToPostgres('portfolio_leads', id, null, 'delete');
    return true;
  }

  // Knowledge & Chunks
  public getKnowledgeDocs(): KnowledgeDocument[] {
    return this.data.knowledge;
  }
  public getChunks(): KnowledgeChunk[] {
    return this.data.chunks;
  }
  public createKnowledgeDoc(doc: Omit<KnowledgeDocument, 'id' | 'chunks_count' | 'last_indexed_at'>): KnowledgeDocument {
    const newDoc: KnowledgeDocument = {
      ...doc,
      id: newId('know'),
      chunks_count: 1,
      last_indexed_at: new Date().toISOString()
    };
    this.data.knowledge.push(newDoc);
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    return newDoc;
  }
  public deleteKnowledgeDoc(id: string): boolean {
    const idx = this.data.knowledge.findIndex(k => k.id === id);
    if (idx === -1) {
      // Even if document entry is already missing, ensure any dangling chunks are cleaned
      const prevChunkCount = this.data.chunks.length;
      this.data.chunks = this.data.chunks.filter(c => c.document_id !== id && !c.id.startsWith(`chunk-knowledge-${id}`));
      if (this.data.chunks.length !== prevChunkCount) {
        this.saveData();
        return true;
      }
      return false;
    }
    this.data.knowledge.splice(idx, 1);
    this.data.chunks = this.data.chunks.filter(c => c.document_id !== id && !c.id.startsWith(`chunk-knowledge-${id}`));
    this.reindexAllKnowledge(); // re-indexes and writes db.json once
    return true;
  }

  // AI Events & Analytics
  public logEvent(event: Omit<AIEvent, 'id' | 'created_at'>): AIEvent {
    const newEvent: AIEvent = {
      ...event,
      id: newId('evt'),
      created_at: new Date().toISOString()
    };
    this.data.events.unshift(newEvent);
    // Keep max 1000 events to prevent unbounded growth
    if (this.data.events.length > 1000) {
      this.data.events = this.data.events.slice(0, 1000);
    }
    this.scheduleSave();
    return newEvent;
  }
  public getEvents(): AIEvent[] {
    return this.data.events;
  }
  public getInsights(): AIInsight[] {
    return this.data.insights;
  }
  public addInsight(insight: Omit<AIInsight, 'id' | 'created_at'>): AIInsight {
    const newIns: AIInsight = {
      ...insight,
      id: newId('ins'),
      created_at: new Date().toISOString()
    };
    this.data.insights.unshift(newIns);
    this.saveData();
    return newIns;
  }

  // Settings
  public getSettings(): SiteSettings {
    return this.data.settings;
  }
  public updateSettings(updated: Partial<SiteSettings>): SiteSettings {
    this.data.settings = { ...this.data.settings, ...updated };
    this.saveData();
    this.syncMutationToPostgres('portfolio_settings', 'main', this.data.settings, 'upsert');
    return this.data.settings;
  }

  // ──────────────────────────────────────────────
  // Form Config CRUD
  // ──────────────────────────────────────────────

  private readonly ALLOWED_FORM_SLUGS = new Set(['contact', 'lead']);

  /** Return all form configs (restricted to system forms 'contact' and 'lead'). */
  public getForms(): FormConfig[] {
    return (this.data.forms || []).filter(f => this.ALLOWED_FORM_SLUGS.has(f.slug));
  }

  /** Return all active form configs (for public consumption). */
  public getActiveForms(): FormConfig[] {
    return (this.data.forms || []).filter(f => f.active && this.ALLOWED_FORM_SLUGS.has(f.slug));
  }

  /** Find a single form config by slug. Returns undefined if not found or restricted. */
  public getFormBySlug(slug: string): FormConfig | undefined {
    if (!this.ALLOWED_FORM_SLUGS.has(slug)) return undefined;
    return (this.data.forms || []).find(f => f.slug === slug);
  }

  /** Create a new form config. Restricted to system forms. */
  public createForm(cfg: FormConfig): FormConfig {
    if (!this.ALLOWED_FORM_SLUGS.has(cfg.slug)) {
      throw new Error(`Creation of arbitrary forms is restricted. Only system forms 'contact' and 'lead' are allowed.`);
    }
    if (!this.data.forms) this.data.forms = [];
    if (this.data.forms.some(f => f.slug === cfg.slug)) {
      throw new Error(`A form with slug "${cfg.slug}" already exists.`);
    }
    this.data.forms.push(cfg);
    this.saveData();
    return cfg;
  }

  /** Update an existing form config. Returns the updated config or undefined if not found. */
  public updateForm(slug: string, updates: Partial<Omit<FormConfig, 'slug'>>): FormConfig | undefined {
    if (!this.ALLOWED_FORM_SLUGS.has(slug)) return undefined;
    if (!this.data.forms) return undefined;
    const idx = this.data.forms.findIndex(f => f.slug === slug);
    if (idx === -1) return undefined;
    this.data.forms[idx] = { ...this.data.forms[idx], ...updates };
    this.saveData();
    return this.data.forms[idx];
  }

  /**
   * Soft-delete a form by setting active=false.
   * System forms 'contact' and 'lead' cannot be deleted.
   */
  public deleteForm(slug: string): boolean {
    if (this.ALLOWED_FORM_SLUGS.has(slug)) {
      throw new Error(`System forms 'contact' and 'lead' cannot be deleted.`);
    }
    return false;
  }

  // Methodology Steps
  public getMethodologySteps(): MethodologyStep[] {
    return this.data.methodology_steps || initialData.methodology_steps || [];
  }
  public updateMethodologySteps(steps: MethodologyStep[]): MethodologyStep[] {
    this.data.methodology_steps = steps;
    this.saveData();
    return this.data.methodology_steps;
  }

  // Engineering Principles
  public getPrinciples(): EngineeringPrinciple[] {
    return this.data.principles || initialData.principles || [];
  }
  public updatePrinciples(principles: EngineeringPrinciple[]): EngineeringPrinciple[] {
    this.data.principles = principles;
    this.saveData();
    return this.data.principles;
  }

  // Architecture Nodes
  public getArchitectureNodes(): ArchitectureNode[] {
    return this.data.architecture_nodes || initialData.architecture_nodes || [];
  }
  public updateArchitectureNodes(nodes: ArchitectureNode[]): ArchitectureNode[] {
    this.data.architecture_nodes = nodes;
    this.saveData();
    return this.data.architecture_nodes;
  }
}


export const db = new DatabaseManager();

// Last-chance write of debounced changes (normal shutdown also calls db.flush()).
process.on('exit', () => db.flush());
