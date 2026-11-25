import type { Project, Testimonial, Service } from '../types';

/** Only http(s), mailto and same-origin relative URLs are rendered as links/images. */
export function safeUrl(value: unknown, opts: { allowMailto?: boolean } = {}): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  if (opts.allowMailto && /^mailto:[^\s]+$/i.test(v)) return v;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** URL-safe slug that keeps Arabic and other Unicode letters; never returns an empty string. */
export function slugify(input: string, fallbackPrefix = 'item'): string {
  const slug = (input || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

/** Image src that may also be an inline data:image (cropped avatar uploads). */
export function safeImageSrc(value: unknown): string | undefined {
  if (typeof value === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(value.trim())) return value.trim();
  return safeUrl(value);
}

/**
 * Seed projects store the cover in `cover_image`, the admin form edits `image_url`, many records
 * only have a gallery. The admin value wins, then the seed cover, then the first gallery image.
 */
export function getProjectImage(project: Partial<Project> | null | undefined): string | undefined {
  if (!project) return undefined;
  return safeUrl(project.image_url) || safeUrl(project.cover_image) || safeUrl(project.gallery?.[0]) || safeUrl(project.screenshots?.[0]);
}

export function getProjectGallery(project: Partial<Project> | null | undefined): string[] {
  if (!project) return [];
  const list = [
    ...(project.gallery || []),
    ...(project.gallery && project.gallery.length ? [] : [project.image_url, project.cover_image, ...(project.screenshots || [])])
  ];
  return Array.from(new Set(list.map((u) => safeUrl(u)).filter((u): u is string => Boolean(u))));
}

export function getTestimonialRole(t: Partial<Testimonial> | null | undefined): string {
  if (!t) return '';
  return (t.position || t.role || '').trim();
}

export function isServiceActive(s: Partial<Service> | null | undefined): boolean {
  return Boolean(s) && s!.active !== false;
}

/** Message of an unknown thrown value (catch variables are `unknown` under strict mode). */
export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return typeof e === 'string' ? e : '';
}

/** HTTP-style status attached to a thrown value by SDKs and fetch wrappers, if any. */
export function errorStatus(e: unknown): number | undefined {
  if (e && typeof e === 'object' && 'status' in e) {
    const s = (e as { status: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}
