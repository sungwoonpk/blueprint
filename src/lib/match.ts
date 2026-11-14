// Title matching shared by the search dialog and the roadmap filter.

/**
 * Lowercase and treat "-" and "/" as spaces. Length is preserved, so a match
 * position in the normalized text is also a position in the original title.
 */
export const normalize = (s: string) => s.toLowerCase().replace(/[-/]/g, ' ');

/** Split a raw query into normalized terms. Every term must match. */
export const toTerms = (raw: string) => normalize(raw).split(/\s+/).filter(Boolean);

export const matchesAll = (title: string, terms: string[]) => {
  const text = normalize(title);
  return terms.every((t) => text.includes(t));
};

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The title as HTML with every occurrence of every term wrapped in <mark>. */
export function highlight(title: string, terms: string[]): string {
  const norm = normalize(title);
  const marked = new Array<boolean>(title.length).fill(false);
  for (const term of terms) {
    let from = 0;
    let at: number;
    while ((at = norm.indexOf(term, from)) !== -1) {
      for (let i = at; i < at + term.length; i++) marked[i] = true;
      from = at + term.length;
    }
  }
  let html = '';
  let open = false;
  for (let i = 0; i < title.length; i++) {
    if (marked[i] !== open) {
      html += marked[i] ? '<mark>' : '</mark>';
      open = marked[i];
    }
    html += escapeHtml(title[i]);
  }
  return open ? html + '</mark>' : html;
}
