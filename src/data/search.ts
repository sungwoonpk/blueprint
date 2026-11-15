import { phases, numberedTopics } from './roadmap';

// Search covers phase titles and topic titles only.
export interface SearchEntry {
  /** "Phase 3" or "3.4". */
  label: string;
  title: string;
  /** The phase a topic belongs to; empty for phases. */
  context: string;
  href: string;
}

export const searchEntries: SearchEntry[] = [
  ...phases.map((p, i) => ({ label: `Phase ${i + 1}`, title: p.title, context: '', href: `/system-design#${p.slug}` })),
  ...numberedTopics.map((t) => ({
    label: t.number,
    title: t.title,
    context: t.phase.title,
    href: `/system-design/${t.slug}`,
  })),
];
