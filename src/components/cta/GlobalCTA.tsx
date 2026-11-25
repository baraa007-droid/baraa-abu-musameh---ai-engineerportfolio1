import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { SiteSettings } from '../../types';
import { safeUrl } from '../../lib/content';

interface GlobalCTAProps {
  settings: SiteSettings | null;
  navigate: (route: string) => void;
}

export const GlobalCTA: React.FC<GlobalCTAProps> = ({ settings, navigate }) => {
  const [dismissed, setDismissed] = React.useState(false);

  const isEnabled = settings?.cta_enabled !== undefined ? settings.cta_enabled : settings?.cta_banner_enabled;
  if (!isEnabled || dismissed) return null;

  const title = settings?.cta_title || settings?.cta_banner_title || 'Ready to Build Something Exceptional?';
  const description = settings?.cta_description || settings?.cta_banner_description || '';
  const primaryLabel = settings?.cta_primary_label || settings?.cta_banner_primary_label || 'Start a Project';
  const primaryUrl = settings?.cta_primary_url || settings?.cta_banner_primary_url || '/start-project';
  const secondaryLabel = settings?.cta_secondary_label || settings?.cta_banner_secondary_label || '';
  const secondaryUrl = settings?.cta_secondary_url || settings?.cta_banner_secondary_url || '';

  // Only same-site paths, http(s) and mailto: links are followed; anything else (javascript:,
  // data:, malformed) is ignored.
  const handleNav = (url: string) => {
    const safe = safeUrl(url, { allowMailto: true });
    if (!safe) return;
    if (safe.startsWith('/')) navigate(safe);
    else if (safe.startsWith('mailto:')) window.location.href = safe;
    else window.open(safe, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{title}</p>
          {description && <p className="text-xs text-blue-100 mt-0.5 line-clamp-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {primaryLabel && (
            <button
              onClick={() => handleNav(primaryUrl)}
              className="px-4 py-1.5 rounded-xl bg-white text-blue-700 font-bold text-xs flex items-center gap-1.5 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              {primaryLabel}<ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {secondaryLabel && secondaryUrl && (
            <button
              onClick={() => handleNav(secondaryUrl)}
              className="px-4 py-1.5 rounded-xl border border-white/40 text-white font-bold text-xs hover:bg-white/10 transition-colors cursor-pointer"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Dismiss CTA banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
