# Design

Simple and quiet, in the spirit of Apple's own sites: system font, lots of white space, one blue accent, grouped lists with hairline dividers, and smooth but small motion. Nothing is on the page unless it helps you find or read a topic.

## Pages

- **Roadmap (`/`)** is the front page. A side list of phases (current one highlighted as you scroll) and, for each phase, topics grouped into rounded lists.
- **Topic (`/topics/<slug>`)** is a narrow reading column with a back link, the number, the title, and previous/next links. Until an article exists it says "Coming soon."

## Tokens

All colors and fonts are CSS custom properties at the top of `src/styles/global.css`. Components only use tokens.

| Token | Use |
| --- | --- |
| `--bg`, `--surface`, `--surface-hover` | Page, grouped lists, hover state. |
| `--border` | Hairline dividers. |
| `--text`, `--muted` | Body text and secondary text. |
| `--accent` | Links and the back link. |

## Light and dark

- The theme follows the operating system (`prefers-color-scheme`) by default. Dark uses a true black page with `#1c1c1e` lists.
- The header button overrides it and the choice is saved in `localStorage` under `theme`.
- A tiny inline script in `<head>` applies the saved choice before first paint, so there is no flash.
- The explicit choice is a `data-theme="light|dark"` attribute on `<html>`. Without it, the media query decides.

## Motion

Colors ease over 0.2 to 0.3s, rows nudge their chevron on hover, in-page jumps scroll smoothly, and page-to-page navigation uses the browser's cross-document view transition (no JavaScript). All of it is switched off for `prefers-reduced-motion`.
