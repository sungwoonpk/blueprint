# Design

Simple and quiet, in the spirit of Apple's own sites: system font, lots of white space, one blue accent, grouped lists with hairline dividers, and smooth but small motion. Nothing is on the page unless it helps you find or read a topic.

## Identity

The header shows the logo and the name, **blueprint** (always lowercase). The front page heading is "System Design", and page titles read `blueprint` or `<topic> · blueprint`.

The logo is the artwork in `docs/assets/logo-source.png`, a transparent PNG, cropped to the shape. It sits directly on the page in both themes.

| File | Use |
| --- | --- |
| `public/logo.png` | Header, shown at 19px next to the name (128px file for sharp high-density screens). Its center sits on the band from the top of the tall letters to the baseline, which is how the eye reads the name. |
| `public/favicon.png` | Browser tab icon, 64px. |
| `public/apple-touch-icon.png` | Home screen icon on iOS, 180px, the logo on white (iOS needs an opaque icon and rounds it). |

## Pages

- **Roadmap (`/`)** is the front page. A side list of phases (always shown, current one highlighted as you scroll) and, for each phase, a rounded list of its groups. A group expands to show its numbered topics.
- **Topic (`/topics/<slug>`)** is a narrow reading column with a back link, the number, the title, and previous/next links. Until an article exists it says "Coming soon."
- **Footer** on every page: the author credit and the last updated date (the last commit's date, or the build date without git history).

## Search

Search covers phase titles and topic titles only. Every term must appear; `-` and `/` count as spaces, so "trade off" finds "Trade-offs". Matches are shown in the accent color.

- **On the roadmap**, the field under the title filters the page in place: phases and topics that match stay, groups with a match open, the rest hides. Enter opens the first matching topic, Esc clears and restores the page as it was.
- **On other pages**, the header icon opens a search dialog with arrow-key navigation.
- `Cmd/Ctrl+K` and `/` start a search: they focus the roadmap field on the roadmap and open the dialog elsewhere.

Matching lives in `src/lib/match.ts` and is shared by both.

## Tokens

All colors and fonts are CSS custom properties at the top of `src/styles/global.css`. Components only use tokens. The header has a hairline under it so content scrolling beneath stays clearly separate, and it stays still during page transitions.

| Token | Use |
| --- | --- |
| `--bg`, `--surface`, `--surface-hover` | Page, grouped lists, hover state. |
| `--border` | Hairline dividers. |
| `--text`, `--muted` | Body text and secondary text. |
| `--accent` | Links and the back link. |

## Light and dark

- Light is the default, whatever the operating system prefers. Dark uses a true black page with `#1c1c1e` lists.
- The header button switches it and the choice is saved in `localStorage` under `theme`.
- A tiny inline script in `<head>` applies the saved choice before first paint, so there is no flash.
- The explicit choice is a `data-theme="light|dark"` attribute on `<html>`. Without it the page is light.

## Motion

Colors ease over 0.2 to 0.3s, rows nudge their chevron on hover, in-page jumps scroll smoothly, and page-to-page navigation uses the browser's cross-document view transition (no JavaScript). On the roadmap, clicking the name scrolls back to the top in under half a second instead of reloading. All of it is switched off for `prefers-reduced-motion`.
