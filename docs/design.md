# Design

Clean and quiet, but not empty: one accent color, generous spacing, a small architecture sketch on the home page, and numbered monospace labels that give the roadmap a sense of place.

## Tokens

All colors, radii and fonts are CSS custom properties at the top of `src/styles/global.css`. Components only use tokens, never raw colors, so a theme change is one place.

| Token | Use |
| --- | --- |
| `--bg`, `--surface`, `--surface-hover` | Page, cards and rows, hover state. |
| `--border` | Every divider and outline. |
| `--text`, `--muted` | Body text and secondary text. |
| `--accent`, `--accent-soft` | Links, numbers, selected state and its tinted background. |

## Light and dark

- By default the theme follows the operating system (`prefers-color-scheme`).
- The header button overrides it and the choice is saved in `localStorage` under `theme`.
- A tiny inline script in `<head>` applies the saved choice before first paint, so there is no flash.
- The explicit choice is a `data-theme="light|dark"` attribute on `<html>`. Without it, the media query decides.

## Type

System font stack for text (no web font to load) and the system monospace for numbers. Headings use tight letter spacing and heavy weight; the wordmark pairs a bold and a light half.

## Layout

One container (max 1080px, 16px gutters). The roadmap and topic pages add a sticky side column from 900px up and collapse to a single column below.
