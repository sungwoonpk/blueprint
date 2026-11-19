# 6. Several subjects, starting with Algorithms

**Decision:** The site holds several subjects, each with its own roadmap, under its own path (`/system-design`, `/algorithms`). A header menu switches between them, search covers all of them, and both subjects are drawn by the same components from their own data files. The Algorithms roadmap has 9 phases and 120 topics.

**Why:** Algorithms is the other half of what an engineer studies alongside system design, and it is what coding problems test. One shared structure keeps both subjects consistent and makes a third subject a data file plus two small pages.

**How the Algorithms roadmap was chosen:** we compared several ways people organize the field (by purpose such as searching, sorting, graphs, strings, math and bits; by design strategy such as brute force, divide and conquer, greedy, backtracking and dynamic programming; and by the problem patterns common in coding interviews) and merged them into one order a learner can follow. No single source's structure was copied.

**Costs:** System Design URLs moved from `/topics/<slug>` to `/system-design/<slug>` (no articles or links existed yet). The home page is now a redirect.

**Alternatives:** A separate site per subject (duplicated code and design), or one combined roadmap (the subjects do not share an order).

**Later:** The Algorithms roadmap was revised in [decision 0007](0007-algorithms-roadmap-revised.md).
