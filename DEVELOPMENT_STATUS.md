# Development status

Updated 2026-11-25 by management bootstrap.
Repository: astrgd27/CardGameCreator; default branch main. Static audit completed, execution pending. No gameplay changes in bootstrap. Nine issues #1–#9 created. Current test suite has 12 declarations, no verified result in this audit. Benchmark catalog 0.2 provisional, coverage unknown. No existing CI workflow found. No pre-existing issues or PRs found in initial search.

Next: review and merge management bootstrap; connect coding agent; execute #1 in a dedicated branch and open PR; manager reviews results; then #2 and #3 subject to dependencies. Coding-agent dispatch and unattended operation are not yet configured. No automatic merging. Record evidence and blockers here after each accepted milestone.

## Milestone report format
Date / issue / PR / status / verified test commands and results / preview and screenshots / regressions or risks / decisions needed / next ready issue.

## Requirements reconciliation
The management PR adds explicit per-game/per-category targets (80% Basic + Advanced; 95% including Script), a versioned benchmark evidence contract, and ten parallel milestones. Catalog 0.2 names all five requested games and uses rules/design/logic categories; no measured scores yet. Next implementation remains #1 (CI and benchmark baseline), with #9 handoff verification. Broader 50-game research corpus not verified in this repository. Management merge is authorized; verify main before starting coding.

## Issue #1 baseline infrastructure
Initial implementation on issue-1-ci-baseline: CI workflow (Node 22, Python 3.12, Chromium and WebKit), benchmark evidence/scoring CLI and regression tests, browser smoke test with ZIP import/export and duel, standalone reproducibility check. All benchmark cases remain pending until verified. CI and browser checks not yet observed; do not claim success. Work is reserved for targeted execution/debugging blockers. Management PR #10 was merged and core documents verified on main.


## 2026-11-26 compatibility review
Verified main: PR #38 squash merge d852a5c45f001db18e12252346e1b0d3682cf616; exact pre-merge CI run 45831065108 succeeded. PR #39 original CI 45831322799 succeeded; reconciled head 719ed6bbd06d90b5d412f5b8c22dd1067a1bc89a requires fresh validation and is not merged. Static review of 25 physical TCGs recorded in docs/TCG_COMPATIBILITY_AUDIT.md; ROADMAP.md amended with priorities and acceptance gates. No new benchmark evidence or measured coverage claimed. Next: general action binding and dynamic payment contracts, then composite cards, authorized hidden decisions and scheduler. Portable v2 module verification remains a parallel foundational gate.

### Specialized summoning and offline distribution (PR #65)
Initial head b378754 passed full CI including browser tests. Subsequent authoring refinements separate scale and linked deployment requirements, expose summon response policies and defense statistics, and add linked deployment regression coverage. Exact-head validation pending. Remaining fidelity work: directional link geometry, nonrefundable cost separation, full reference-module integration and UI position presentation. Offline ZIP is built and uploaded by CI; Python launcher serves loopback only.

## Master Guide product rebuild, 2026-11-27

Main at `922b629` passed the Node baseline. Chromium opened the published Looboo module from the library and reached `duel.html?custom=1`. The locally served PR #79 head at `256e670` opened `play.html` directly from the library. Its browser tests checked launch and card selection. The product rebuild keeps the canonical runtime, projection, payment/combat rules, strategic opponent and portable ZIP format, and replaces the homepage and normal navigation.

Draft PR #80 provides the library, module hubs, match setup, shared Card Battle and the guided Workshop. The first 27 focused browser journeys passed across desktop Chromium and both tablet WebKit viewport presets, including a blank Workshop creation through Victory, return to the draft, checkpoint reload and ZIP import recovery. Looboo attachment and attack, Crystal Circuit priority and resources, and Taste Dimension fusion payments were exercised. Those reference checks cover gameplay interactions, with full match completion still to verify across three reference games. The tablet runs use browser emulation.

The guided workflow currently supports two-seat duels and lanes, card/deck editing, board and setup rules, and a small set of deployment effects. Advanced Workshop still uses the existing structured editor. Comprehensive visual rule composition, the bounded scripting interface and five complete reference games remain release work. The live site still serves main. CI and merge authorization are required before rollout.
