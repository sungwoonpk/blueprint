// Articles link to other topics by name, for example
// [Thinking in Tradeoffs](/system-design/trade-offs). At build time this puts the
// topic's current number in front of the link text ("1.3 Thinking in Tradeoffs"),
// so numbers stay right when the roadmap is reordered. A link to a topic that
// does not exist fails the build.
import { subjects } from '../data/subjects';

interface Node {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
}

const numbers = new Map<string, string>(subjects.flatMap((s) => s.topics.map((t) => [`${s.path}/${t.slug}`, t.number] as const)));

function walk(node: Node) {
  if (node.type === 'element' && node.tagName === 'a') {
    const href = String(node.properties?.href ?? '').replace(/\/$/, '');
    const subject = subjects.find((s) => href.startsWith(s.path + '/'));
    if (subject) {
      const number = numbers.get(href);
      if (!number) throw new Error(`Link to a topic that does not exist: ${href}`);
      node.children = [{ type: 'text', value: `${number} ` }, ...(node.children ?? [])];
    }
  }
  node.children?.forEach(walk);
}

export default function rehypeTopicNumbers() {
  return (tree: Node) => walk(tree);
}
