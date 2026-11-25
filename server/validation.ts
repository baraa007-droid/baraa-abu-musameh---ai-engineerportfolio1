import { RequestHandler } from 'express';
import { db } from './db';

type Validator<T> = (value: unknown) => T | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function text(min: number, max: number): Validator<string> {
  return (value) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max
    ? value.trim()
    : null;
}

export function email(value: unknown): string | null {
  return typeof value === 'string' && value.length <= 254 && emailPattern.test(value.trim()) ? value.trim() : null;
}

export function stringArray(value: unknown, maxItems = 30, maxLength = 300): string[] | null {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= maxLength)
    ? value.map((item) => item.trim())
    : null;
}

export function urlArray(value: unknown, maxItems = 15): string[] | null {
  const values = stringArray(value, maxItems, 2048);
  if (!values) return null;
  return values.every((item) => {
    try { return ['http:', 'https:'].includes(new URL(item).protocol); } catch { return false; }
  }) ? values : null;
}

/**
 * Gallery URL validator – allows absolute http(s) URLs or root-relative paths starting with /.
 * Maximum 20 items, each ≤ 2048 chars.
 */
export function galleryUrls(value: unknown): string[] | null {
  if (!Array.isArray(value)) return value === undefined || value === null ? [] : null;
  if (value.length > 20) return null;
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length > 2048) return null;
    const trimmed = item.trim();
    if (trimmed === '') continue;
    // Accept root-relative paths (/...) or absolute http(s) URLs
    if (trimmed.startsWith('/')) {
      result.push(trimmed);
      continue;
    }
    try {
      const u = new URL(trimmed);
      if (!['http:', 'https:'].includes(u.protocol)) return null;
      result.push(trimmed);
    } catch {
      return null;
    }
  }
  return result;
}

/**
 * Validate and sanitize a settings update body.
 * Returns the cleaned object or an error message.
 */
export function validateSettingsBody(body: Record<string, unknown>): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const cleaned: Record<string, unknown> = {};

  // --- String fields with length limits ---
  const strFields: [string, number, number][] = [
    ['site_name', 1, 100],
    ['tagline', 0, 200],
    ['meta_description', 0, 300],
    ['seo_title', 0, 70],
    ['seo_description', 0, 160],
    ['og_image', 0, 2048],
    ['twitter_title', 0, 70],
    ['twitter_description', 0, 160],
    ['twitter_image', 0, 2048],
    ['canonical_url', 0, 2048],
    ['footer_brand_description', 0, 300],
    ['footer_tech_stack', 0, 200],
    ['cta_banner_title', 0, 100],
    ['cta_banner_description', 0, 300],
    ['cta_banner_primary_label', 0, 80],
    ['cta_banner_primary_url', 0, 2048],
    ['cta_banner_secondary_label', 0, 80],
    ['cta_banner_secondary_url', 0, 2048],
    ['cta_title', 0, 100],
    ['cta_description', 0, 300],
    ['cta_primary_label', 0, 80],
    ['cta_primary_url', 0, 2048],
    ['cta_secondary_label', 0, 80],
    ['cta_secondary_url', 0, 2048],
    ['maintenance_title', 0, 100],
    ['maintenance_description', 0, 500],
    ['ai_model', 0, 100],
    ['location', 0, 200],
    ['phone', 0, 40],
    ['calendly_url', 0, 2048],
    ['notification_email_to', 0, 254],
    ['telegram_chat_id', 0, 100],
  ];

  for (const [key, minLen, maxLen] of strFields) {
    if (key in body) {
      const val = body[key];
      if (val === null || val === undefined || val === '') {
        cleaned[key] = '';
      } else {
        const validated = text(minLen, maxLen)(val);
        if (validated === null) {
          return { ok: false, error: `Field "${key}" must be a string between ${minLen} and ${maxLen} characters.` };
        }
        cleaned[key] = validated;
      }
    }
  }

  // --- AI model id: empty = provider defaults; otherwise "provider/name" (OpenRouter) or "gemini-…" ---
  if (typeof cleaned.ai_model === 'string' && cleaned.ai_model !== '') {
    const m = cleaned.ai_model as string;
    if (!/^[a-z0-9][a-z0-9._:/-]{1,99}$/i.test(m) || m.includes('..') || !(m.includes('/') || /^gemini-[a-z0-9.-]+$/i.test(m))) {
      return { ok: false, error: 'ai_model must be an OpenRouter id like "google/gemini-2.5-flash" or a Gemini id like "gemini-2.5-flash" (leave empty for defaults).' };
    }
  }

  // --- email field ---
  if ('contact_email' in body) {
    const v = email(body.contact_email);
    if (!v) return { ok: false, error: 'contact_email must be a valid email address.' };
    cleaned.contact_email = v;
  }

  // --- twitter_card enum ---
  if ('twitter_card' in body) {
    const val = body.twitter_card;
    if (val !== 'summary' && val !== 'summary_large_image') {
      return { ok: false, error: 'twitter_card must be "summary" or "summary_large_image".' };
    }
    cleaned.twitter_card = val;
  }

  // --- boolean fields ---
  const boolFields = [
    'maintenance_mode', 'analytics_enabled', 'enable_analytics', 'ai_enabled',
    'enable_ai_assistant', 'enable_project_planner', 'lead_auto_qualification',
    'enable_email_notifications', 'enable_telegram_notifications', 'enable_whatsapp_notifications',
    'cta_banner_enabled', 'cta_enabled', 'enable_visitor_confirmation',
  ];
  for (const key of boolFields) {
    if (key in body) {
      cleaned[key] = !!body[key];
    }
  }

  // --- social_links (passthrough with basic validation) ---
  if ('social_links' in body) {
    const sl = body.social_links;
    if (sl && typeof sl === 'object' && !Array.isArray(sl)) {
      const slClean: Record<string, string> = {};
      for (const [k, v] of Object.entries(sl as Record<string, unknown>)) {
        if (typeof v === 'string') slClean[k] = v.trim().substring(0, 2048);
      }
      cleaned.social_links = slClean;
    } else if (sl !== null && sl !== undefined) {
      return { ok: false, error: 'social_links must be an object of strings.' };
    }
  }

  return { ok: true, data: cleaned };
}

export const validateSettingsMiddleware: import('express').RequestHandler = (req, res, next) => {
  const body = req.body || {};
  const result = validateSettingsBody(body);
  if (result.ok === false) return res.status(400).json({ error: result.error });
  // Only validated keys are stored; unknown keys are dropped (prevents arbitrary data in settings).
  req.body = result.data;
  next();
};

export const validateContact: RequestHandler = (req, res, next) => {
  const contactForm = db.getFormBySlug('contact');

  if (contactForm && contactForm.active) {
    const dyn = validateDynamicSubmission(contactForm, req.body || {});
    if (dyn.ok === false) {
      return res.status(400).json({ error: dyn.error });
    }

    const name = text(1, 100)(dyn.data.name ?? req.body?.name);
    const contactEmail = email(dyn.data.email ?? req.body?.email);
    const subject = dyn.data.subject ?? req.body?.subject ?? 'General Inquiry';
    const message = text(1, 5000)(dyn.data.message ?? req.body?.message);

    if (!name || !contactEmail || !message) {
      return res.status(400).json({ error: 'Invalid contact submission.' });
    }

    const standardKeys = new Set(['name', 'email', 'subject', 'message']);
    const customFields: Record<string, any> = {};
    for (const [k, v] of Object.entries(dyn.data)) {
      if (!standardKeys.has(k)) {
        customFields[k] = v;
      }
    }

    req.body = {
      name,
      email: contactEmail,
      subject: subject || 'General Inquiry',
      message,
      ...(Object.keys(customFields).length > 0 ? { custom_fields: customFields } : {})
    };
    return next();
  }

  const name = text(1, 100)(req.body?.name);
  const contactEmail = email(req.body?.email);
  const subject = req.body?.subject === undefined || req.body.subject === '' ? 'General Inquiry' : text(1, 200)(req.body.subject);
  const message = text(1, 5000)(req.body?.message);
  if (!name || !contactEmail || !message) {
    return res.status(400).json({ error: 'Invalid contact submission.' });
  }
  req.body = { name, email: contactEmail, subject: subject || 'General Inquiry', message };
  next();
};

export const validateLead: RequestHandler = (req, res, next) => {
  const leadForm = db.getFormBySlug('lead');

  if (leadForm && leadForm.active) {
    const dyn = validateDynamicSubmission(leadForm, req.body || {});
    if (dyn.ok === false) {
      return res.status(400).json({ error: dyn.error });
    }

    const body = req.body || {};
    const name = text(1, 100)(dyn.data.name ?? body.name ?? body.client_name);
    const leadEmail = email(dyn.data.email ?? body.email ?? body.client_email);
    const description = text(1, 5000)(dyn.data.description ?? body.description ?? body.project_description);

    if (body.required_features !== undefined && body.required_features !== null && !Array.isArray(body.required_features)) {
      return res.status(400).json({ error: 'Field "required_features" must be an array of strings.' });
    }
    const requiredFeatures = stringArray(body.required_features ?? dyn.data.required_features ?? [], 30, 300);

    if (body.reference_links !== undefined && body.reference_links !== null && !Array.isArray(body.reference_links)) {
      return res.status(400).json({ error: 'Field "reference_links" must be an array of URLs.' });
    }
    const referenceLinks = urlArray(body.reference_links ?? dyn.data.reference_links ?? [], 15);

    const companyRaw = dyn.data.company ?? body.company ?? body.client_company ?? '';
    const projectTypeRaw = dyn.data.project_type ?? body.project_type ?? body.project_title ?? 'Not specified';
    const budgetRangeRaw = dyn.data.budget_range ?? body.budget_range ?? 'Not specified';
    const deadlineRaw = dyn.data.deadline ?? body.deadline ?? body.timeline ?? 'Not specified';
    const communicationPrefRaw = dyn.data.communication_pref ?? body.communication_pref ?? 'email';

    const companyValidated = text(0, 150)(companyRaw);
    const projectTypeValidated = text(1, 150)(projectTypeRaw);
    const budgetRangeValidated = text(1, 100)(budgetRangeRaw);
    const deadlineValidated = text(1, 100)(deadlineRaw);
    const communicationPrefValidated = text(1, 50)(communicationPrefRaw);

    if (!name || !leadEmail || !description || !requiredFeatures || !referenceLinks ||
        companyValidated === null || !projectTypeValidated || !budgetRangeValidated ||
        !deadlineValidated || !communicationPrefValidated) {
      return res.status(400).json({ error: 'Invalid project lead submission.' });
    }

    const standardKeys = new Set([
      'name', 'client_name', 'email', 'client_email', 'description', 'project_description',
      'required_features', 'reference_links', 'company', 'client_company',
      'project_type', 'project_title', 'budget_range', 'deadline', 'timeline', 'communication_pref'
    ]);
    const customFields: Record<string, any> = {};
    for (const [k, v] of Object.entries(dyn.data)) {
      if (!standardKeys.has(k)) {
        customFields[k] = v;
      }
    }

    req.body = {
      name,
      email: leadEmail,
      description,
      required_features: requiredFeatures,
      reference_links: referenceLinks,
      company: companyValidated.trim(),
      project_type: projectTypeValidated.trim(),
      budget_range: budgetRangeValidated.trim(),
      deadline: deadlineValidated.trim(),
      communication_pref: communicationPrefValidated.trim(),
      ...(Object.keys(customFields).length > 0 ? { custom_fields: customFields } : {})
    };
    return next();
  }

  const body = req.body || {};
  const name = text(1, 100)(body.name ?? body.client_name);
  const leadEmail = email(body.email ?? body.client_email);
  const description = text(1, 5000)(body.description ?? body.project_description);
  const requiredFeatures = stringArray(body.required_features ?? [], 30, 300);
  const referenceLinks = urlArray(body.reference_links ?? [], 15);
  const companyRaw = body.company ?? body.client_company ?? '';
  const projectTypeRaw = body.project_type ?? body.project_title ?? 'Not specified';
  const budgetRangeRaw = body.budget_range ?? 'Not specified';
  const deadlineRaw = body.deadline ?? body.timeline ?? 'Not specified';
  const communicationPrefRaw = body.communication_pref ?? 'email';
  const companyValidated = text(0, 150)(companyRaw);
  const projectTypeValidated = text(1, 150)(projectTypeRaw);
  const budgetRangeValidated = text(1, 100)(budgetRangeRaw);
  const deadlineValidated = text(1, 100)(deadlineRaw);
  const communicationPrefValidated = text(1, 50)(communicationPrefRaw);
  if (!name || !leadEmail || !description || !requiredFeatures || !referenceLinks ||
      companyValidated === null || !projectTypeValidated || !budgetRangeValidated ||
      !deadlineValidated || !communicationPrefValidated) {
    return res.status(400).json({ error: 'Invalid project lead submission.' });
  }
  req.body = {
    name, email: leadEmail, description, required_features: requiredFeatures, reference_links: referenceLinks,
    company: companyValidated.trim(), project_type: projectTypeValidated.trim(), budget_range: budgetRangeValidated.trim(), deadline: deadlineValidated.trim(), communication_pref: communicationPrefValidated.trim()
  };
  next();
};

export function validateDynamicSubmission(formConfig: import('../src/types').FormConfig, body: Record<string, any>): { ok: true; data: Record<string, any> } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be an object.' };
  }

  const enabledFields = (formConfig.fields || []).filter(f => f.enabled);
  const fieldMap = new Map(enabledFields.map(f => [f.key, f]));
  const validatedData: Record<string, any> = {};

  // Check all submitted keys are valid enabled fields (or standard metadata)
  const allowedKeys = new Set([
    ...fieldMap.keys(),
    'client_name', 'client_email', 'client_company', 'project_description',
    'timeline', 'project_title', 'name', 'email', 'subject', 'message',
    'description', 'required_features', 'reference_links', 'company',
    'project_type', 'budget_range', 'deadline', 'communication_pref'
  ]);
  for (const k of Object.keys(body)) {
    if (!allowedKeys.has(k) && !k.startsWith('_')) {
      return { ok: false, error: `Unrecognized or disabled field "${k}".` };
    }
  }

  for (const field of enabledFields) {
    let rawVal = body[field.key];
    if (rawVal === undefined) {
      if (field.key === 'name') rawVal = body.client_name;
      else if (field.key === 'email') rawVal = body.client_email;
      else if (field.key === 'description') rawVal = body.project_description;
      else if (field.key === 'company') rawVal = body.client_company;
      else if (field.key === 'project_type') rawVal = body.project_title;
      else if (field.key === 'deadline') rawVal = body.timeline;
    }

    const isMissing = rawVal === undefined || rawVal === null || (typeof rawVal === 'string' && rawVal.trim() === '') || (Array.isArray(rawVal) && rawVal.length === 0);

    if (field.required && isMissing) {
      return { ok: false, error: `Field "${field.label}" is required.` };
    }

    if (isMissing) {
      continue;
    }

    // Validate by type
    switch (field.type) {
      case 'email': {
        const validated = email(rawVal);
        if (!validated) return { ok: false, error: `Invalid email address for "${field.label}".` };
        validatedData[field.key] = validated;
        break;
      }
      case 'url': {
        if (field.key === 'reference_links' && typeof rawVal === 'string') {
          return { ok: false, error: `Field "${field.label}" must be an array of URLs.` };
        }
        if (Array.isArray(rawVal)) {
          const validatedUrls: string[] = [];
          for (const item of rawVal) {
            if (typeof item !== 'string') return { ok: false, error: `Invalid URL for "${field.label}".` };
            try {
              const u = new URL(item.trim());
              if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
              validatedUrls.push(item.trim());
            } catch {
              return { ok: false, error: `Invalid URL for "${field.label}".` };
            }
          }
          validatedData[field.key] = validatedUrls;
        } else if (typeof rawVal === 'string') {
          try {
            const u = new URL(rawVal.trim());
            if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
            validatedData[field.key] = rawVal.trim();
          } catch {
            return { ok: false, error: `Invalid URL for "${field.label}".` };
          }
        } else {
          return { ok: false, error: `Invalid URL for "${field.label}".` };
        }
        break;
      }
      case 'phone': {
        if (typeof rawVal !== 'string' || rawVal.trim().length < 3 || rawVal.trim().length > 40) {
          return { ok: false, error: `Invalid phone number for "${field.label}".` };
        }
        validatedData[field.key] = rawVal.trim();
        break;
      }
      case 'number': {
        const num = Number(rawVal);
        if (isNaN(num) || typeof rawVal === 'boolean') {
          return { ok: false, error: `Field "${field.label}" must be a valid number.` };
        }
        validatedData[field.key] = num;
        break;
      }
      case 'date': {
        if (typeof rawVal !== 'string' || isNaN(Date.parse(rawVal))) {
          return { ok: false, error: `Field "${field.label}" must be a valid date.` };
        }
        validatedData[field.key] = rawVal.trim();
        break;
      }
      case 'select':
      case 'radio': {
        if (typeof rawVal !== 'string') {
          return { ok: false, error: `Invalid value for "${field.label}".` };
        }
        const valStr = rawVal.trim();
        if (field.options && field.options.length > 0 && !field.options.includes(valStr) && !field.system) {
          return { ok: false, error: `Invalid option "${valStr}" for "${field.label}".` };
        }
        validatedData[field.key] = valStr;
        break;
      }
      case 'checkbox': {
        if (!Array.isArray(rawVal)) {
          return { ok: false, error: `Field "${field.label}" must be an array.` };
        }
        const arr = rawVal.map(String);
        if (field.options && field.options.length > 0 && !field.system) {
          for (const opt of arr) {
            if (!field.options.includes(opt)) {
              return { ok: false, error: `Invalid option "${opt}" for "${field.label}".` };
            }
          }
        }
        validatedData[field.key] = arr;
        break;
      }
      case 'textarea': {
        const validated = text(0, 5000)(rawVal);
        if (validated === null) return { ok: false, error: `Invalid text for "${field.label}".` };
        validatedData[field.key] = validated;
        break;
      }
      case 'text':
      default: {
        const validated = text(0, 500)(rawVal);
        if (validated === null) return { ok: false, error: `Invalid text for "${field.label}".` };
        validatedData[field.key] = validated;
        break;
      }
    }
  }

  return { ok: true, data: validatedData };
}

export function validateAiText(field: string, maxLength = 4000): RequestHandler {
  return (req, res, next) => {
    const value = text(1, maxLength)(req.body?.[field]);
    if (!value) return res.status(400).json({ error: `Invalid ${field}.` });
    req.body[field] = value;
    next();
  };
}

// ---------------------------------------------------------------------------
// Form Config validation
// ---------------------------------------------------------------------------

/** Supported field types. Extend this list when new UI controls are added. */
export const SUPPORTED_FIELD_TYPES = new Set([
  'text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'number', 'date', 'url', 'phone'
]);

/** Validated shape returned after parseFormConfig succeeds. */
export interface ParsedFormField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  order: number;
  system?: boolean;
  options?: string[];
}

export interface ParsedFormConfig {
  slug: string;
  name: string;
  description?: string;
  active: boolean;
  fields: ParsedFormField[];
}

/**
 * Pure validator (no Express dependency).
 * Returns `{ ok: true, data }` or `{ ok: false, error }`.
 * Used by the route handler so it can return the error *before* touching db.
 */
export function parseFormConfig(
  body: unknown,
  opts: { requireSlug?: boolean } = {}
): { ok: true; data: ParsedFormConfig } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const b = body as Record<string, unknown>;

  // slug — required for POST, optional for PUT (caller can omit to leave unchanged)
  let slug: string | undefined;
  if (opts.requireSlug !== false || b.slug !== undefined) {
    const rawSlug = text(1, 80)(b.slug);
    if (!rawSlug) return { ok: false, error: 'Form slug must be a non-empty string (max 80 chars).' };
    if (!/^[a-z0-9_-]+$/.test(rawSlug)) {
      return { ok: false, error: 'Form slug may only contain lowercase letters, digits, hyphens, and underscores.' };
    }
    slug = rawSlug;
  }

  const name = text(1, 120)(b.name);
  if (!name) return { ok: false, error: 'Form name must be a non-empty string (max 120 chars).' };

  const descriptionRaw = b.description;
  const description = descriptionRaw === undefined || descriptionRaw === ''
    ? undefined
    : text(1, 500)(descriptionRaw);
  if (descriptionRaw !== undefined && descriptionRaw !== '' && !description) {
    return { ok: false, error: 'Form description must be a string up to 500 chars.' };
  }

  const active = b.active === undefined ? true : !!b.active;

  // fields array
  if (!Array.isArray(b.fields) || b.fields.length === 0) {
    return { ok: false, error: 'Form must have at least one field (fields must be a non-empty array).' };
  }
  if (b.fields.length > 50) {
    return { ok: false, error: 'A form may not have more than 50 fields.' };
  }

  const fields: ParsedFormField[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < b.fields.length; i++) {
    const f = b.fields[i];
    if (!f || typeof f !== 'object') {
      return { ok: false, error: `Field at index ${i} must be an object.` };
    }
    const fd = f as Record<string, unknown>;

    const key = text(1, 60)(fd.key);
    if (!key) return { ok: false, error: `Field[${i}].key must be a non-empty string (max 60 chars).` };
    if (!/^[a-z0-9_]+$/.test(key)) {
      return { ok: false, error: `Field[${i}].key "${key}" may only contain lowercase letters, digits, and underscores.` };
    }
    if (seenKeys.has(key)) {
      return { ok: false, error: `Duplicate field key "${key}" — each field key must be unique within a form.` };
    }
    seenKeys.add(key);

    const label = text(1, 120)(fd.label);
    if (!label) return { ok: false, error: `Field "${key}".label must be a non-empty string (max 120 chars).` };

    const type = text(1, 30)(fd.type);
    if (!type) return { ok: false, error: `Field "${key}".type is required.` };
    if (!SUPPORTED_FIELD_TYPES.has(type)) {
      return { ok: false, error: `Field "${key}".type "${type}" is not supported. Supported: ${[...SUPPORTED_FIELD_TYPES].join(', ')}.` };
    }

    // required — must be an explicit boolean
    if (typeof fd.required !== 'boolean') {
      return { ok: false, error: `Field "${key}".required must be a boolean (true or false).` };
    }

    const enabled = fd.enabled === undefined ? true : !!fd.enabled;

    const order = typeof fd.order === 'number' && Number.isFinite(fd.order) ? fd.order : i;

    // placeholder — optional string
    const placeholderRaw = fd.placeholder;
    const placeholder = placeholderRaw === undefined || placeholderRaw === ''
      ? undefined
      : text(1, 300)(placeholderRaw);
    if (placeholderRaw !== undefined && placeholderRaw !== '' && !placeholder) {
      return { ok: false, error: `Field "${key}".placeholder must be a string up to 300 chars.` };
    }

    // options — required for select/radio/checkbox
    const needsOptions = ['select', 'radio', 'checkbox'].includes(type);
    if (needsOptions) {
      const opts2 = stringArray(fd.options, 100, 200);
      if (!opts2 || opts2.length === 0) {
        return { ok: false, error: `Field "${key}" of type "${type}" must have a non-empty options array (each option max 200 chars).` };
      }
      const dupeOpt = opts2.find((o, idx) => opts2.indexOf(o) !== idx);
      if (dupeOpt) {
        return { ok: false, error: `Field "${key}" has duplicate option value "${dupeOpt}".` };
      }
      fields.push({ key, label, type, required: fd.required as boolean, enabled, order, system: !!fd.system, options: opts2, ...(placeholder ? { placeholder } : {}) });
    } else {
      fields.push({ key, label, type, required: fd.required as boolean, enabled, order, system: !!fd.system, ...(placeholder ? { placeholder } : {}) });
    }
  }

  return {
    ok: true,
    data: {
      ...(slug ? { slug } : {}),
      name,
      ...(description ? { description } : {}),
      active,
      fields
    } as ParsedFormConfig
  };
}

/**
 * Express middleware that validates an incoming FormConfig body for POST.
 * Attaches `req.body` as a clean `ParsedFormConfig` on success.
 */
export const validateFormConfigBody: RequestHandler = (req, res, next) => {
  const result = parseFormConfig(req.body, { requireSlug: true });
  if (result.ok === false) return res.status(400).json({ error: result.error });
  req.body = result.data;
  next();
};

/**
 * Express middleware that validates an incoming FormConfig body for PUT.
 * slug is NOT required (taken from URL param). Attaches cleaned body.
 */
export const validateFormConfigUpdate: RequestHandler = (req, res, next) => {
  const result = parseFormConfig(req.body, { requireSlug: false });
  if (result.ok === false) return res.status(400).json({ error: result.error });
  req.body = result.data;
  next();
};
