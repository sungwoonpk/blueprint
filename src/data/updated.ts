import { execSync } from 'node:child_process';

// The date the site was last changed: the last commit's date, or the build
// date when git history is not available (for example a bare source export).
function lastUpdated(): string {
  try {
    return execSync('git log -1 --format=%cs', { encoding: 'utf8' }).trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** ISO date, YYYY-MM-DD. */
export const updatedIso = lastUpdated();

/** For display, e.g. "November 14, 2026". */
export const updatedLabel = new Date(`${updatedIso}T00:00:00Z`).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});
