# Architecture and audit

## Current baseline (2026-11-25, static audit)
- engine.js: card/module defaults, bounded parser, validation, seeded start, reason/moves, act/pass/reveal/attack/bot, effects and pending response handling.
- structure.js: upgrade/checkStructure/deckIssues/activateDecks; saved deck and custom zone/phase metadata.
- app.js (~1102 lines): creator, decks, table, playtest, modal inspection, bot pacing, visual animation and event dispatch; style.css owns layout.
- storage.js: IndexedDB and ZIP pack/unpack; vendor JSZip. index.html/help.html static entry points. scripts/standalone.py and standalone/CardGameCreator.html support offline distribution.
- tests/engine.test.js: 12 test declarations (not executed in this audit). benchmarks.js catalog 0.2: 60 provisional scenarios per README; coverage unmeasured. package.json: npm test uses node --test tests/*.test.js, npm start uses Python HTTP server. README specifies Node 22+.
- Current rules: two seats, alternating turns, one response per main card, personal life/energy, unit behavior and constrained zone semantics; phase restrictions and setup piles exist. General triggers, arbitrary payments, continuous effects and multi-object stacks remain pending. README has older 15-scenario text alongside newer 60-scenario release notes.

## Proposed target (requires design review, issue #3)
Typed action/choice interfaces, deterministic event queue, explicit timing and priority, extensible zone/ownership/control/visibility policies, declarative payment and effect contracts, replacement/continuous effect ordering, victory and turn policy adapters. Separate rendering and animation from authoritative engine. Provide player-specific state projections, versioned migration, deterministic seeds and replay logs. Keep existing API behind compatibility adapters during migration. No big-bang rewrite. Document ADRs and test fixtures before implementation.

## Validation gates
Engine unit/regression tests; module ZIP round-trip and migration; illegal action atomicity; hidden information checks; browser smoke and responsive checks; reproducible standalone build. Report exact commands and results. Benchmarks count only executed assertions; never advertise theoretical coverage as verified.

## Benchmark-driven contracts
Design independent policies for setup/mulligans, turn/phase/action limits, typed resources and attachment graphs, object identity and zone transitions, visibility projections, priority/chain/stack resolution, configurable combat and targeting, continuous/replacement effects, spatial locations and scoring, and victory. Card frames must bind typed data per card type, including multiple attacks and resource symbols. Rules, design and logic are independent benchmark categories; no game-name conditionals in the host engine. Use the versioned authoring-layer evidence contract in docs/BENCHMARKS.md. Benchmark goals are 80% Basic + Advanced and 95% including Script per game/category, not aggregate averages.
