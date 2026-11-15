// Shared shape and helpers for every subject's roadmap (System Design, Algorithms).
//
// - Display numbers (1.1, 1.2, ...) come from order, so reordering is safe.
// - A topic's slug is stable: it is the topic's URL (/<subject>/<slug>) and will name its article.

export interface Topic {
  slug: string;
  title: string;
  /** Short label that clusters topics inside a phase. */
  group?: string;
}

export interface Phase {
  slug: string;
  title: string;
  topics: Topic[];
}

type Row = [slug: string, title: string, group?: string];

export const topics = (rows: Row[]): Topic[] => rows.map(([slug, title, group]) => ({ slug, title, group }));

export interface NumberedTopic extends Topic {
  /** Display number such as "4.12". */
  number: string;
  phase: Phase;
  phaseNumber: number;
}

export function numberTopics(phases: Phase[]): NumberedTopic[] {
  return phases.flatMap((phase, p) =>
    phase.topics.map((topic, t) => ({ ...topic, number: `${p + 1}.${t + 1}`, phase, phaseNumber: p + 1 })),
  );
}

export interface TopicGroup {
  name: string | undefined;
  topics: NumberedTopic[];
}

/** Topics of one phase, clustered by their group label, in roadmap order. */
export function groupTopics(numbered: NumberedTopic[], phase: Phase): TopicGroup[] {
  const groups: TopicGroup[] = [];
  for (const topic of numbered.filter((t) => t.phase === phase)) {
    const last = groups[groups.length - 1];
    if (last && last.name === topic.group) last.topics.push(topic);
    else groups.push({ name: topic.group, topics: [topic] });
  }
  return groups;
}
