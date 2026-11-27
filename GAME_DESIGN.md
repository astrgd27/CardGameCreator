# Product direction

CardGameCreator is a browser-based creator and fully automated simulator for original trading card games using portable modules. Desktop and iPad are the target; phones are deferred. A module defines cards, rules, layouts, decks, art and eventually campaigns. Lantern Duel is retired; generalized modules are the sole supported product format.

## Experience
Module home separates Create, Decks and Play. Card art and rules are central: large cards in hand and on board, close inspection by right click and touch, clear targeting, action animations for play/set/attack/tap/flip and comprehensible opponent pacing. Preserve player control over reaction windows and step playback; animations must not change legal game state. Make use of available screen space rather than a narrow phone layout.

## Workshop
Author card types, attributes, effects, timing, card frames, table zones, phases, deck constraints and rules without editing the host program where feasible. Support bounded scriptable rules, meaningful diagnostics, import/export and versioned migration. Expand existing deck editor and module navigation rather than duplicate them.

## Long-term scope
Generalize physical TCG mechanics: arbitrary zones, payments, triggers, priority and stacks, continuous/replacement effects, combat models, alternate wins, hidden information and token generation. Support scripted encounters, campaign progression and AI policies. Benchmark against documented mechanics with original test fixtures, not copied commercial card assets. Full coverage is a goal, not a verified capability.

## Original acceptance targets
Primary benchmark games: Pokémon TCG, Magic: The Gathering, Yu-Gi-Oh!, One Piece Card Game, Riftbound. For each game and each applicable category (rules, design, logic), achieve at least 80% via Basic + Advanced visual authoring and at least 95% via all layers including scripting. These are release targets, not current results. See docs/BENCHMARKS.md for measurement. Use the broader research across 50 physical TCGs as secondary coverage input when available; do not assume the research file is in this repository. Fully automated enforcement is mandatory; manual referee workarounds do not count. Modules should be authorable by humans and AI agents, with portable versioned schemas, diagnostics, deterministic tests and scripted campaigns.
