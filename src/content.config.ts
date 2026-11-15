// Topic articles, one Markdown file per topic:
// src/content/articles/<subject>/<topic slug>.md, for example
// src/content/articles/system-design/what-is-system-design.md.
// A topic without a file shows "Coming soon."
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
});

export const collections = { articles };
