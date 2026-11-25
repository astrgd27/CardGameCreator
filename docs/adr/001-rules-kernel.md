# ADR 001 — Deterministic, module-defined rules kernel

Status: proposed; issue #3. No runtime changes. Approval and a green baseline are required before migration.

## Context
The v1 engine uses definition IDs in deck/hand/discard, mutable field entries, a single pending response, fixed two-seat life/energy and four bounded script operations. The editor and bot depend on these interfaces. Preserve Lantern Duel and v1 ZIP imports; do not replace the application wholesale.

## Decision
Introduce a separate pure kernel behind an adapter, with versioned module definitions and serializable state. Keep the legacy path until differential fixtures demonstrate parity. Use stable instance IDs distinct from card definition IDs; assign deterministic IDs at setup and creation from a state-owned counter. Ownership is immutable unless explicitly supported by a rule; control is mutable. Store zone membership once, in ordered lists keyed by zone instance ID; maintain validated lookup indexes as derived data. Card objects hold definition reference, owner, controller, face, orientation, counters, damage, and attributes. A zone transition declares source/destination, insertion order, and a policy for preserving/resetting instance state and attachments. Do not infer all games' policies from one game. Locations are separate entities referenced by zones; shared locations can contain multiple players' objects.

Module schema defines zone types and instances, setup, turn/phase graph, resource types, legal action definitions, selectors, costs, effects, triggers and win policies. Visual Basic/Advanced authoring compiles into the same bounded rule representation as Script. No arbitrary JavaScript execution from imports. Schema validators enforce references, limits and supported instruction versions. Use explicit diagnostics for unsupported features. UI must not determine legality.

## Contracts (proposed, not implemented)
- initialize(module, seed, selectedDecks) -> state; seed and RNG state serialized. All IDs and iteration order deterministic.
- legalActions(module, state, actor) -> descriptors with choice schemas, not private opponent information. Avoid enumerating combinatorial choices; validate selected objects and order at submission.
- applyAction(module, state, action) -> {state, events} or structured rejection; input state unchanged on rejection. Validate actor, timing, target and payment atomically; no hidden information disclosed by rejection.
- project(module, state, viewer) -> player-specific view and redacted events. Hidden card IDs, definitions, order and characteristics omitted except explicit reveal permissions; opaque handles rotate when tracking is forbidden. AI sees its own projection and legal choices.
- replay(moduleVersion, seed, acceptedActions) -> deterministic state; record choices and RNG effects. Rewind uses accepted history/snapshots, not UI state.
- events use typed payloads and deterministic ordering. Later rule policies define replacement, trigger collection, ordering, priority, response stack or chain and state-based checks. A choice suspends resolution in serialized state; no callbacks stored in game state.
- bounded interpreter: typed selectors, predicates, costs and operations; validated schemas, operation/recursion budgets, loop detection and explicit failure. No host eval, network, clock or nondeterministic random. Effects and resource changes use transactions; continuous effects are derived and recalculated at defined boundaries.

## Incremental migration
1. Define instance/zone schema and invariants in isolated kernel; tests for duplicates, ownership, ordered membership, capacity, illegal moves, deterministic IDs and visibility. No editor changes.
2. Implement v1 conversion and explicit mapping of deck/hand/discard/field, setup piles and concealed units. Keep v1 module unchanged; compare seeded legacy outcomes; provide adapter for UI and bot. Do not silently alter saved deck counts or rules.
3. Introduce legal actions and choice transactions; migrate draw/play/move one at a time with regression coverage.
4. Add attachments, typed resources and configurable payment policies; then event/trigger scheduling, priority, chain/stack, combat and victory policies.
5. Add continuous/replacement effects, bounded scripting and authoring editors incrementally; retire old path only after compatibility gates and explicit approval.

## Benchmark mapping (representative, not evidence of support)
| Primitive | Catalog scenarios |
|---|---|
| zones, instance identity, setup | pokmontcg-01/02, yugioh-02/04, riftbound-04/10 |
| ownership, hidden views, faces | yugioh-03, magicthegathering-05, riftbound-11 |
| attachments, payment, resources | pokmontcg-09/10, yugioh-09/12, onepiece-02/09/11, riftbound-09 |
| priority, trigger ordering, chain | magicthegathering-01/11, yugioh-01/10/11, onepiece-01/10, riftbound-03 |
| combat, targeting, victory | pokmontcg-02/03/12, magicthegathering-03/12, onepiece-04, riftbound-01/02 |
| continuous/replacement effects | magicthegathering-09/10, onepiece-12, riftbound-12 |
| typed card properties and frame families | all five games' design cases 05–08 |
| turn/setup/deck policies | pokmontcg-04, magicthegathering-02/04, onepiece-03 |

IDs should be checked against benchmarks.js; generated IDs remove non-ASCII characters. All cases remain pending until actual authoring, play and ZIP round-trip evidence. Targets are per game/category, 80% visual and 95% all layers.

## Acceptance and tradeoffs
Use Node test fixtures for deterministic state, illegal action atomicity, hidden-view leakage and replay; browser fixtures for authoring, inspection and module round-trip. A unified object model introduces migration complexity and possible performance overhead; avoid premature generic abstractions and benchmark real state sizes. A pure kernel makes CI and headless simulations cheaper. Two seats remain the initial supported compatibility scope, but contracts should avoid baking in fixed opponent arithmetic. Multiplayer expansion is not part of this first migration. No commercial rule branches or assets.

## Review questions
Approve incremental kernel/adapter approach, deterministic identity, explicit visibility projection, and bounded declarative rule representation. Detailed schema and legacy adapter implementation belong to separate reviewable tasks after approval. No engine behavior changed by this ADR.
