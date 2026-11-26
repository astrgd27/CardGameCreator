# Roadmap

Priorities P0 (unblock), P1 (next), P2 (core), P3 (advanced). Engine and UI tracks proceed in parallel only when interfaces and files are disjoint. Each milestone requires verified acceptance, not estimates. Existing issues are epics where broad; split into focused tasks before implementation.

| Milestone | Engine / QA | UI / product | Gate |
|---|---|---|---|
| 0 | #1 CI, benchmark baseline; #9 agent handoff | navigation and visual audit | reproducible tests and first reviewed PR |
| 1 | #3 architecture ADR; #5 object identity, zones, actions | #2 full-screen arena, inspection, animations and pacing | compatibility ADR, desktop/tablet evidence |
| 2 | typed resources, payments, attachments, movement (#7/#5) | resource and zone editors | atomic payment, visibility and round-trip fixtures |
| 3 | events/triggers, priority, stacks/chains (#5/#7) | timing editor, response UI | deterministic ordering and legal choices |
| 4 | configurable combat, targeting, setup, victory (#7) | combat editor and feedback | game-specific rules expressible without host forks |
| 5 | continuous/replacement effects and modifiers (#7) | advanced visual rules builder | duration/order/layer fixtures |
| 6 | scripting, diagnostics, automated playtest; #6 executable benchmarks | script editor and evidence dashboard | per-game/category authoring scores |
| 7 | AI policy and module compatibility | #4 advanced deck/workshop and module management | migration, strategy and persistence tests |
| 8 | scripted encounters and campaigns (#8) | campaign/scenario editor | original sample campaign and save/load |
| 9 | coverage verification and optimization | polish and release | >=80% Basic+Advanced and >=95% all layers per game/category |

#1 first coding assignment; #9 verification uses its PR. #2 and #3 follow baseline; #5 requires approved ADR; #6 can start on baseline fixtures without waiting for new mechanics. #4 incremental UX improvements may start earlier where independent. #7 and #8 split before implementation. See docs/BENCHMARKS.md. Review backlog after each milestone; no automatic merges. Major architecture and compatibility changes require product director approval.


## Post-milestone compatibility revision — 2026-11-26
See [25-game audit](docs/TCG_COMPATIBILITY_AUDIT.md). Main includes PR #38; PR #39 is candidate pending reconciled CI. Previous milestones describe delivered primitives, not verified universal compatibility. Retain milestone history and benchmark gates.

| Order | Priority | Engine work | Parallel UI / authoring | Acceptance |
|---|---|---|---|---|
| 10A | P0 | General action/source binding, typed dynamic payment, transactional pre-commit decisions | play/cost builder, payment dialog | original dynamic card fixtures and rollback |
| 10B | P0 | Multi-deck roles, evolution/composite stacks, linked deck rules | multi-deck workshop, stack inspection | setup and stack round-trip |
| 10C | P0 | Authorized hidden reveal/search/reorder and damage-card pipelines | private reveal and selection dialogs | projection privacy and ordered reveal |
| 10D | P0 | Configurable scheduler, initiative, gauge handoff and reaction windows | phase/window policy editor, action timeline | deterministic timing traces |
| 10I | P0 continuous | v2 portable ZIP, schema migration, benchmark fixtures | unified module home and evidence dashboard | export/import/replay, legacy regression |
| 11E | P1 | Extensible combat and typed damage | combat assignment and reaction UI | primary combat fixtures |
| 11F | P1 | Continuous/state-based rules, bounded expressions, event bindings | visual conditions and rule layering | stabilization and effect fizzle fixtures |
| 11G | P1 | Spatial slots, graph/grid movement, occupancy | board layout designer and position interaction | adjacency and local combat fixtures |
| 12H | P2 | Objective scoring, alternate victory, multiplayer | scoring and multiplayer presentation | win/tie/elimination tests |
| 12J | P2 | Policy-aware AI, benchmark tuning, profiling | final card-first presentation, accessibility, docs | measured playtest, browser and device evidence |
| 13 | Gate | Primary catalog evidence audit and secondary fixture expansion | release QA and tutorials | original per-game/category gates unchanged |

Implement A–D and I before broadening keywords. A and I may proceed in parallel only if interfaces and files are disjoint. No host game-name conditionals; use module policies. Each batch must include validation, tests, UI where applicable, and explicit limitations. Full support is not established by green CI alone. No automatic merges.

## Accelerated reference-game program (product-approved)
Replace serial micro-audits with five playable original reference modules. Develop engine, visual authoring and reference content together; certification runs alongside delivery, retaining the frozen 60-case denominator and original thresholds. Start with editable starter modules; expand each into complete games with real decks, end conditions, AI play, UI and ZIP replay. No starter alone establishes full compatibility.

| Track | Next large batch |
|---|---|
| Looboo | Active/Bench exchange, attached energy costs, evolution/attachment budgets, prize events, conditions |
| Crystal Circuit | Stack responses, replacement choices, timing, continuous effects, mana symbols |
| Taste Dimension | Material filters, extra-deck summons, negation, positions, linked destinations |
| Ringworld Rumble | Life trigger decisions, leader restrictions, resource assignment, counter fields |
| Generation Wars | Location showdown, rune exhaust/recycle, battlefield and domain layout |
| Shared authoring | Multiple rules panels, dynamic symbols, conditional fields, independent faces and frame families |

Build substantive related features in larger PRs; use CI and reference matches to uncover defects. Keep workstreams disjoint where practical. No automatic merging without authorization.

### Reference-game fidelity directive
The product owner specifies original themes only: Generation Wars (Riftbound), Crystal Circuit (Magic), Looboo (Pokémon), Ringworld Rumble (One Piece), Taste Dimension (Yu-Gi-Oh!). Reproduce the mechanical architecture of each reference as closely as possible through generalized module policies and visual authoring, using independent names, writing, artwork and graphic identity. A missing or simplified mechanic is a compatibility gap, not an intentional rules redesign. Use independently written rules and original card content. Do not include commercial card images, branding, or copied card text. Current starters are deliberately incomplete.
