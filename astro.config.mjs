import { defineConfig } from 'astro/config';

export default defineConfig({
  // The site has several subjects; the root opens the first one.
  redirects: { '/': '/system-design' },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
