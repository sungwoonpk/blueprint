import { numberTopics, type NumberedTopic, type Phase } from '../lib/roadmap';
import { phases as systemDesign } from './system-design';
import { phases as algorithms } from './algorithms';

// Every subject on the site, in the order the header menu and the home page's
// moons list them.
export interface Subject {
  name: string;
  /** URL path, also the folder under src/pages. */
  path: string;
  phases: Phase[];
  topics: NumberedTopic[];
}

const subject = (name: string, path: string, phases: Phase[]): Subject => ({
  name,
  path,
  phases,
  topics: numberTopics(phases),
});

export const subjects: Subject[] = [
  subject('System Design', '/system-design', systemDesign),
  subject('Algorithms', '/algorithms', algorithms),
  subject('Data & AI', '/data-ai', []),
];

export const subjectAt = (path: string): Subject => subjects.find((s) => s.path === path)!;

/** The subject a URL belongs to, if any. */
export const subjectOf = (pathname: string): Subject | undefined =>
  subjects.find((s) => pathname === s.path || pathname.startsWith(s.path + '/'));
