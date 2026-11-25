import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  User,
  Save,
  CheckCircle2,
  ImagePlus,
  Crop
} from 'lucide-react';
import { Profile } from '../../../types';

interface ProfileTabProps {
  profile: Profile;
  onUpdateProfile: (profile: Partial<Profile>) => Promise<unknown> | void;
}

const AVATAR_SIZE = 512;

const editableUrl = (value?: string) => (value === '#' ? '' : value || '');

const loadImageEl = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  onUpdateProfile
}) => {
  const [form, setForm] = useState<Profile>(profile);
  const [savedNotice, setSavedNotice] = useState(false);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [posY, setPosY] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderCrop = useCallback(async (src: string, z: number, y: number) => {
    try {
      const img = await loadImageEl(src);
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const baseScale = Math.max(AVATAR_SIZE / img.width, AVATAR_SIZE / img.height);
      const scale = baseScale * z;
      const w = img.width * scale;
      const h = img.height * scale;
      const overflowX = Math.max(0, w - AVATAR_SIZE);
      const overflowY = Math.max(0, h - AVATAR_SIZE);
      const dx = -(overflowX / 2);
      const dy = -(overflowY * (y / 100));
      ctx.drawImage(img, dx, dy, w, h);
      const url = canvas.toDataURL('image/webp', 0.9);
      setForm((f) => ({ ...f, avatar_url: url }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!editorSrc) return;
    const id = setTimeout(() => {
      void renderCrop(editorSrc, zoom, posY);
    }, 50);
    return () => clearTimeout(id);
  }, [editorSrc, zoom, posY, renderCrop]);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setZoom(1);
      setPosY(50);
      setEditorSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAdjustCurrent = () => {
    setZoom(1);
    setPosY(50);
    setEditorSrc(form.avatar_url || '/images/baraa-profile.webp');
  };

  // The success notice appears only after the server accepted the update.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateProfile(form);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch {
      setSavedNotice(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <User className="w-5 h-5 text-amber-500" />
            Profile & Developer Persona CMS
          </h2>
          <p className="text-xs text-zinc-500">
            Control the public developer profile, bio, contact channels, and freelance availability status.
          </p>
        </div>

        {savedNotice && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-mono font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Profile Updated & RAG Reindexed
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5 text-xs">
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img
              src={form.avatar_url || '/images/baraa-profile.webp'}
              alt="Avatar preview"
              className="w-28 h-28 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shadow-md shrink-0"
            />
            <div className="flex-1 space-y-2 text-center sm:text-start">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">Profile Picture</label>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-950 font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <ImagePlus className="w-4 h-4" />
                  Upload New Image
                </button>
                <button
                  type="button"
                  onClick={handleAdjustCurrent}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Crop className="w-4 h-4" />
                  Adjust Crop
                </button>
              </div>
              <p className="text-[10px] text-zinc-400">JPG / PNG / WebP — shown as a circle. Use Zoom &amp; Position sliders to pick exactly what part of the photo appears, then Save.</p>
            </div>
          </div>

          {editorSrc && (
            <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-zinc-700 dark:text-zinc-300">
                  <span>Zoom</span>
                  <span className="font-mono text-[10px] text-zinc-400">{zoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-zinc-700 dark:text-zinc-300">
                  <span>Vertical Position</span>
                  <span className="font-mono text-[10px] text-zinc-400">{posY}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={posY}
                  onChange={(e) => setPosY(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>↑ Show more of the top</span>
                  <span>Show more of the bottom ↓</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFile}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Full Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Professional Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-bold text-zinc-700 dark:text-zinc-300">Hero Headline</label>
          <input
            type="text"
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Phone</label>
            <input
              type="text"
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">GitHub URL</label>
            <input type="url" value={editableUrl(form.github_url)} onChange={(e) => setForm({ ...form, github_url: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800" placeholder="https://github.com/..." />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">LinkedIn URL</label>
            <input type="url" value={editableUrl(form.linkedin_url)} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800" placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">X / Twitter URL</label>
            <input type="url" value={editableUrl(form.twitter_url)} onChange={(e) => setForm({ ...form, twitter_url: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800" placeholder="https://x.com/..." />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Resume URL</label>
            <input type="url" value={editableUrl(form.resume_url)} onChange={(e) => setForm({ ...form, resume_url: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800" placeholder="https://..." />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Short Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Long Narrative (About Section)</label>
            <textarea
              rows={3}
              value={form.about_long}
              onChange={(e) => setForm({ ...form, about_long: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Years Experience</label>
            <input
              type="number"
              value={form.years_experience}
              onChange={(e) => setForm({ ...form, years_experience: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0) })}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Completed Projects</label>
            <input
              type="number"
              value={form.completed_projects}
              onChange={(e) => setForm({ ...form, completed_projects: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0) })}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Satisfaction Rate (Badge)</label>
            <input
              type="text"
              value={form.satisfaction_rate ?? ''}
              onChange={(e) => setForm({ ...form, satisfaction_rate: e.target.value })}
              placeholder="100%"
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Target Latency (Badge)</label>
            <input
              type="text"
              value={form.target_latency ?? ''}
              onChange={(e) => setForm({ ...form, target_latency: e.target.value })}
              placeholder="< 50ms"
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-bold text-zinc-700 dark:text-zinc-300">Focus Areas (comma separated)</label>
          <input
            type="text"
            value={form.focus_areas.join(', ')}
            onChange={(e) => setForm({
              ...form,
              focus_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
          />
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.available_for_freelance}
              onChange={(e) => setForm({ ...form, available_for_freelance: e.target.checked })}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
            />
            <span>Available for Freelance & Contract Projects</span>
          </label>
        </div>

        <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
