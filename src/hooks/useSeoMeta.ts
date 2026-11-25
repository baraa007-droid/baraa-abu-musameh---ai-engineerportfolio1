import { useEffect } from "react";
import { SiteSettings } from "../types";

export interface SeoMetaOptions {
  /** Entity-level SEO title (project, service, blog). */
  entitySeoTitle?: string;
  /** Entity-level title/name displayed in the UI. */
  entityTitle?: string;
  /** Entity-level SEO description. */
  entitySeoDescription?: string;
  /** Entity-level description/excerpt/summary used as fallback. */
  entityDescription?: string;
  /** Entity-level OG image. */
  entityOgImage?: string;
  /** Global site settings (required for global fallbacks). */
  settings?: SiteSettings | null;
  /** Current URL path for canonical (e.g. "/projects/my-project"). */
  canonicalPath?: string;
}

/**
 * Manages <head> meta tags for SPA pages without SSR.
 *
 * Fallback hierarchy per field:
 *  title:       entitySeoTitle → entityTitle → settings.seo_title
 *  description: entitySeoDescription → entityDescription → settings.seo_description
 *  image:       entityOgImage → settings.og_image
 *  canonical:   settings.canonical_url (base) + canonicalPath  OR  window.location.origin + canonicalPath
 */
export function useSeoMeta(opts: SeoMetaOptions = {}): void {
  const {
    entitySeoTitle,
    entityTitle,
    entitySeoDescription,
    entityDescription,
    entityOgImage,
    settings,
    canonicalPath,
  } = opts;

  useEffect(() => {
    // ── title ──────────────────────────────────────────────────────────────
    const title =
      entitySeoTitle ||
      entityTitle ||
      settings?.seo_title ||
      settings?.site_name ||
      "Baraa Abu Musameh";

    document.title = title;

    // ── description ────────────────────────────────────────────────────────
    const description =
      entitySeoDescription ||
      entityDescription ||
      settings?.seo_description ||
      settings?.meta_description ||
      "";

    // ── image ──────────────────────────────────────────────────────────────
    const ogImage = entityOgImage || settings?.og_image || "";

    // ── canonical ──────────────────────────────────────────────────────────
    let canonical = "";
    if (canonicalPath) {
      const base =
        (settings?.canonical_url && settings.canonical_url.trim())
          ? settings.canonical_url.replace(/\/$/, "")
          : typeof window !== "undefined"
          ? window.location.origin
          : "";
      canonical = `${base}${canonicalPath}`;
    }

    // ── twitter ────────────────────────────────────────────────────────────
    const twitterTitle = settings?.twitter_title || title;
    const twitterDesc = settings?.twitter_description || description;
    const twitterImage = settings?.twitter_image || ogImage;
    const twitterCard = settings?.twitter_card || "summary_large_image";

    // ── helper: upsert a <meta> tag ────────────────────────────────────────
    const setMeta = (attr: string, value: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${value}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = href;
    };

    // ── apply tags ─────────────────────────────────────────────────────────
    setMeta("name", "description", description);

    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    if (ogImage) setMeta("property", "og:image", ogImage);
    setMeta("property", "og:type", "website");
    if (canonical) setMeta("property", "og:url", canonical);

    setMeta("name", "twitter:card", twitterCard);
    setMeta("name", "twitter:title", twitterTitle);
    setMeta("name", "twitter:description", twitterDesc);
    if (twitterImage) setMeta("name", "twitter:image", twitterImage);

    if (canonical) setLink("canonical", canonical);
  }, [
    entitySeoTitle,
    entityTitle,
    entitySeoDescription,
    entityDescription,
    entityOgImage,
    settings,
    canonicalPath,
  ]);
}
