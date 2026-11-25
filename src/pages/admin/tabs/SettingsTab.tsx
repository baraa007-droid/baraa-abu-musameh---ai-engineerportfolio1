import React, { useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Eye,
  Sliders,
  Globe,
  Search,
  Megaphone,
  Wrench,
  Bell
} from 'lucide-react';
import { SiteSettings } from '../../../types';

interface SettingsTabProps {
  settings: SiteSettings;
  onUpdateSettings: (settings: Partial<SiteSettings>) => Promise<unknown> | void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onUpdateSettings }) => {
  const [form, setForm] = useState<SiteSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const [saving, setSaving] = useState(false);

  // "Saved" is shown only after the server accepted the change; errors are reported by the dashboard.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const payload: SiteSettings = {
      ...form,
      cta_enabled: form.cta_banner_enabled,
      cta_title: form.cta_banner_title,
      cta_description: form.cta_banner_description,
      cta_primary_label: form.cta_banner_primary_label,
      cta_primary_url: form.cta_banner_primary_url,
      cta_secondary_label: form.cta_banner_secondary_label,
      cta_secondary_url: form.cta_banner_secondary_url,
    };
    setSaving(true);
    try {
      await onUpdateSettings(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs';
  const ta = inp + ' resize-none';
  const lbl = 'block font-bold text-xs text-zinc-700 dark:text-zinc-300 mb-1';
  const section = 'p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4';
  const heading = 'flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2';

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            Site Settings & CMS Controls
          </h2>
          <p className="text-xs text-zinc-500">Global configuration for SEO, branding, CTA, and maintenance mode.</p>
        </div>
        <button
          onClick={handleSubmit}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save All Settings'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">

        {/* ── Site Basics ── */}
        <div className={section}>
          <h3 className={heading}><Globe className="w-4 h-4 text-amber-500" />Site Basics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Site Name</label>
              <input type="text" className={inp} value={form.site_name || ''} onChange={e => setForm({ ...form, site_name: e.target.value })} placeholder="Baraa Abu Musameh" />
            </div>
            <div>
              <label className={lbl}>Contact Email</label>
              <input type="email" className={inp} value={form.contact_email || ''} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="you@example.com" />
            </div>
            <div>
              <label className={lbl}>Tagline</label>
              <input type="text" className={inp} value={form.tagline || ''} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="AI Engineer & Full-Stack Developer" />
            </div>
            <div>
              <label className={lbl}>Calendly URL</label>
              <input type="url" className={inp} value={form.calendly_url || ''} onChange={e => setForm({ ...form, calendly_url: e.target.value })} placeholder="https://calendly.com/..." />
            </div>
          </div>
        </div>

        {/* ── Global SEO ── */}
        <div className={section}>
          <h3 className={heading}><Search className="w-4 h-4 text-blue-500" />Global SEO</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>SEO Title <span className="font-normal text-zinc-400">(max 70 chars)</span></label>
              <input type="text" maxLength={70} className={inp} value={form.seo_title || ''} onChange={e => setForm({ ...form, seo_title: e.target.value })} placeholder="Baraa Abu Musameh – AI Engineer..." />
              <p className="text-[10px] text-zinc-400 mt-0.5">{(form.seo_title || '').length}/70</p>
            </div>
            <div>
              <label className={lbl}>OG Image URL</label>
              <input type="url" className={inp} value={form.og_image || ''} onChange={e => setForm({ ...form, og_image: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className={lbl}>SEO Description <span className="font-normal text-zinc-400">(max 160 chars)</span></label>
            <textarea rows={2} maxLength={160} className={ta} value={form.seo_description || ''} onChange={e => setForm({ ...form, seo_description: e.target.value })} placeholder="Portfolio of Baraa Abu Musameh..." />
            <p className="text-[10px] text-zinc-400 mt-0.5">{(form.seo_description || '').length}/160</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Twitter / X Title <span className="font-normal text-zinc-400">(falls back to SEO Title)</span></label>
              <input type="text" maxLength={70} className={inp} value={form.twitter_title || ''} onChange={e => setForm({ ...form, twitter_title: e.target.value })} placeholder="Leave blank to use SEO title" />
            </div>
            <div>
              <label className={lbl}>Twitter Card Type</label>
              <select className={inp} value={form.twitter_card || 'summary_large_image'} onChange={e => setForm({ ...form, twitter_card: e.target.value as 'summary' | 'summary_large_image' })}>
                <option value="summary_large_image">summary_large_image (recommended)</option>
                <option value="summary">summary</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Twitter Description <span className="font-normal text-zinc-400">(max 160)</span></label>
              <input type="text" maxLength={160} className={inp} value={form.twitter_description || ''} onChange={e => setForm({ ...form, twitter_description: e.target.value })} placeholder="Leave blank to use SEO description" />
            </div>
            <div>
              <label className={lbl}>Twitter Image URL</label>
              <input type="url" className={inp} value={form.twitter_image || ''} onChange={e => setForm({ ...form, twitter_image: e.target.value })} placeholder="https://... (falls back to OG image)" />
            </div>
          </div>
          <div>
            <label className={lbl}>Canonical Base URL <span className="font-normal text-zinc-400">(leave blank to use window.location.origin)</span></label>
            <input type="url" className={inp} value={form.canonical_url || ''} onChange={e => setForm({ ...form, canonical_url: e.target.value })} placeholder="https://baraamusameh.com" />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className={section}>
          <h3 className={heading}><Eye className="w-4 h-4 text-emerald-500" />Footer</h3>
          <div>
            <label className={lbl}>Tech Stack Line</label>
            <input type="text" className={inp} value={form.footer_tech_stack || ''} onChange={e => setForm({ ...form, footer_tech_stack: e.target.value })} placeholder="TypeScript • Tailwind • Gemini AI" />
          </div>
          <div>
            <label className={lbl}>Brand Description <span className="font-normal text-zinc-400">(plain text, max 300 chars, line breaks allowed)</span></label>
            <textarea rows={3} maxLength={300} className={ta} value={form.footer_brand_description || ''} onChange={e => setForm({ ...form, footer_brand_description: e.target.value })} placeholder="Architecting deterministic AI pipelines..." />
            <p className="text-[10px] text-zinc-400 mt-0.5">{(form.footer_brand_description || '').length}/300</p>
          </div>
        </div>

        {/* ── CTA Banner ── */}
        <div className={section}>
          <h3 className={heading}><Megaphone className="w-4 h-4 text-violet-500" />Global CTA Banner</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500" checked={!!form.cta_banner_enabled} onChange={e => setForm({ ...form, cta_banner_enabled: e.target.checked })} />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">Enable CTA Banner (sticky bottom banner on public site)</span>
          </label>
          {form.cta_banner_enabled && (
            <div className="space-y-4 pl-6 border-l-2 border-violet-500/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Banner Title</label>
                  <input type="text" maxLength={100} className={inp} value={form.cta_banner_title || ''} onChange={e => setForm({ ...form, cta_banner_title: e.target.value })} placeholder="Ready to Build Something Exceptional?" />
                </div>
                <div>
                  <label className={lbl}>Banner Description</label>
                  <input type="text" maxLength={300} className={inp} value={form.cta_banner_description || ''} onChange={e => setForm({ ...form, cta_banner_description: e.target.value })} placeholder="Let's discuss your project..." />
                </div>
                <div>
                  <label className={lbl}>Primary Button Label</label>
                  <input type="text" maxLength={80} className={inp} value={form.cta_banner_primary_label || ''} onChange={e => setForm({ ...form, cta_banner_primary_label: e.target.value })} placeholder="Start a Project" />
                </div>
                <div>
                  <label className={lbl}>Primary Button URL</label>
                  <input type="text" className={inp} value={form.cta_banner_primary_url || ''} onChange={e => setForm({ ...form, cta_banner_primary_url: e.target.value })} placeholder="/start-project or https://..." />
                </div>
                <div>
                  <label className={lbl}>Secondary Button Label <span className="font-normal text-zinc-400">(optional)</span></label>
                  <input type="text" maxLength={80} className={inp} value={form.cta_banner_secondary_label || ''} onChange={e => setForm({ ...form, cta_banner_secondary_label: e.target.value })} placeholder="View Portfolio" />
                </div>
                <div>
                  <label className={lbl}>Secondary Button URL</label>
                  <input type="text" className={inp} value={form.cta_banner_secondary_url || ''} onChange={e => setForm({ ...form, cta_banner_secondary_url: e.target.value })} placeholder="/projects or https://..." />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Maintenance Mode ── */}
        <div className={section}>
          <h3 className={heading}><Wrench className="w-4 h-4 text-rose-500" />Maintenance Mode</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500" checked={!!form.maintenance_mode} onChange={e => setForm({ ...form, maintenance_mode: e.target.checked })} />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">Enable Maintenance Mode</span>
          </label>
          {form.maintenance_mode && (
            <div className="space-y-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">⚠️ Public routes will return 503. Admin, auth and health endpoints remain accessible.</p>
              <div>
                <label className={lbl}>Maintenance Page Title</label>
                <input type="text" maxLength={100} className={inp} value={form.maintenance_title || ''} onChange={e => setForm({ ...form, maintenance_title: e.target.value })} placeholder="We're improving things" />
              </div>
              <div>
                <label className={lbl}>Maintenance Page Description</label>
                <textarea rows={2} maxLength={500} className={ta} value={form.maintenance_description || ''} onChange={e => setForm({ ...form, maintenance_description: e.target.value })} placeholder="The site is temporarily offline for scheduled maintenance..." />
              </div>
            </div>
          )}
        </div>

        {/* ── Feature Switches ── */}
        <div className={section}>
          <h3 className={heading}><Sliders className="w-4 h-4 text-cyan-500" />Feature Switches</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'ai_enabled', label: 'AI Features (master switch)' },
              { key: 'enable_ai_assistant', label: 'AI Chat Assistant' },
              { key: 'enable_project_planner', label: 'AI Project Advisor' },
              { key: 'lead_auto_qualification', label: 'Lead Auto-Qualification' },
              { key: 'analytics_enabled', label: 'Analytics Tracking' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  checked={!!(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.checked } as SiteSettings)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 space-y-1">
            <label htmlFor="ai-model" className="font-bold text-zinc-700 dark:text-zinc-300">AI Model (optional)</label>
            <input
              id="ai-model"
              type="text"
              className={inp}
              value={form.ai_model || ''}
              placeholder="e.g. google/gemini-2.5-flash or gemini-2.5-flash — empty = server defaults"
              onChange={e => setForm({ ...form, ai_model: e.target.value.trim() })}
            />
            <p className="text-[10px] text-zinc-500">
              OpenRouter ids contain a slash; Gemini ids start with "gemini-". If the provider rejects the id, the server falls back to its default model and logs a warning.
            </p>
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className={section}>
          <h3 className={heading}><Bell className="w-4 h-4 text-amber-500" />Notification Channels</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'enable_email_notifications', label: 'Email Notifications' },
              { key: 'enable_visitor_confirmation', label: 'Auto-reply to visitors (1/day per address)' },
              { key: 'enable_telegram_notifications', label: 'Telegram Notifications' },
              { key: 'enable_whatsapp_notifications', label: 'WhatsApp Notifications' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  checked={!!(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.checked } as SiteSettings)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className={lbl}>Notification Email</label>
              <input type="email" className={inp} value={form.notification_email_to || ''} onChange={e => setForm({ ...form, notification_email_to: e.target.value })} placeholder="notifications@you.com" />
            </div>
            <div>
              <label className={lbl}>Telegram Chat ID</label>
              <input type="text" className={inp} value={form.telegram_chat_id || ''} onChange={e => setForm({ ...form, telegram_chat_id: e.target.value })} placeholder="-1001234567890" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-colors">
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Settings Saved!' : 'Save All Settings'}
          </button>
        </div>

      </form>
    </div>
  );
};
