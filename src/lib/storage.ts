/**
 * Browser storage can throw (Safari private mode, blocked cookies, quota). These helpers
 * never throw, so a storage failure can only lose a preference, never break a page.
 */
type Area = 'local' | 'session';

function area(kind: Area): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function storageGet(kind: Area, key: string): string | null {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function storageSet(kind: Area, key: string, value: string | null): void {
  try {
    const s = area(kind);
    if (!s) return;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Data handed from a project/service/advisor page to the Start Project form. */
export interface ProjectPrefill {
  project_type?: string;
  description?: string;
  budget_range?: string;
  required_features?: string[];
  source?: string;
}

export const PREFILL_KEY = 'baraa_prefill_project';

export function savePrefill(prefill: ProjectPrefill): void {
  storageSet('session', PREFILL_KEY, JSON.stringify(prefill));
}

/** Reads and clears the prefill (one-shot). Returns null when absent or malformed. */
export function takePrefill(): ProjectPrefill | null {
  const raw = storageGet('session', PREFILL_KEY);
  if (!raw) return null;
  storageSet('session', PREFILL_KEY, null);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);
    return {
      project_type: str(parsed.project_type ?? parsed.projectType ?? parsed.service ?? parsed.title, 150),
      description: str(parsed.description ?? parsed.idea ?? parsed.summary, 5000),
      budget_range: str(parsed.budget_range ?? parsed.budgetRange, 100),
      required_features: Array.isArray(parsed.required_features ?? parsed.features)
        ? (parsed.required_features ?? parsed.features).filter((x: unknown) => typeof x === 'string').slice(0, 30)
        : undefined,
      source: str(parsed.source, 100)
    };
  } catch {
    return null;
  }
}
