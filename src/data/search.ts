import { subjects, type Subject } from './subjects';

// Search covers phase titles and topic titles of every subject.
export interface SearchEntry {
  kind: 'phase' | 'topic';
  /** "Phase 3" or "3.4". */
  label: string;
  title: string;
  /** Where the entry lives, shown muted next to the title. */
  context: string;
  href: string;
  /** True for entries of the subject the page belongs to. */
  current: boolean;
}

/** Entries for every subject, with the current subject's entries first. */
export function searchEntries(current?: Subject): SearchEntry[] {
  const ordered = current ? [current, ...subjects.filter((s) => s !== current)] : subjects;
  return ordered.flatMap((subject) => {
    const isCurrent = subject === current;
    const where = (phase: string) => (isCurrent ? phase : `${subject.name} · ${phase}`);
    return [
      ...subject.phases.map((p, i) => ({
        kind: 'phase' as const,
        label: `Phase ${i + 1}`,
        title: p.title,
        context: isCurrent ? '' : subject.name,
        href: `${subject.path}#${p.slug}`,
        current: isCurrent,
      })),
      ...subject.topics.map((t) => ({
        kind: 'topic' as const,
        label: t.number,
        title: t.title,
        context: where(t.phase.title),
        href: `${subject.path}/${t.slug}`,
        current: isCurrent,
      })),
    ];
  });
}
