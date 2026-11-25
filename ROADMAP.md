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
