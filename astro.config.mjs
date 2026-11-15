import { defineConfig } from 'astro/config';
import rehypeTopicNumbers from './src/lib/rehype-topic-numbers.ts';

export default defineConfig({
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
    // "1.3 Thinking in Tradeoffs": topic links get their current number.
    rehypePlugins: [rehypeTopicNumbers],
  },
});
