import { numberTopics, type NumberedTopic, type Phase } from '../lib/roadmap';
import { phases as systemDesign } from './system-design';
import { phases as algorithms } from './algorithms';

// Every subject on the site. The first one is the home page; the header menu
// lists them in this order.
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
];

export const subjectAt = (path: string): Subject => subjects.find((s) => s.path === path)!;

/** The subject a URL belongs to, if any. */
export const subjectOf = (pathname: string): Subject | undefined =>
  subjects.find((s) => pathname === s.path || pathname.startsWith(s.path + '/'));
