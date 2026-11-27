# TCG Maker product roadmap

The TCG Maker Master Guide dated 2026-11-27 governs product decisions. GitHub Pages is the acceptance surface. The compatibility and scenario inventories remain available as engineering references.

## A. Audit and salvage

- Compare current main and draft PR #79 in the browser. Record what can be reused, what requires rework and which paths hit real match results.
- Preserve the canonical module schema, deterministic runtime, transactional payments, legal target projection, scheduling, combat, computer-opponent policy and portable ZIP support. Keep legacy diagnostic routes available for engine troubleshooting.
- Carry the useful tabletop ideas forward from PR #79. Replace direct diagnostic launch from the library and surface launch, turn progression and match completion in the shared client.

## B. Library and Card Battle

- Library, module hub, match setup, deck selection, frozen revisions, contextual actions, computer opponent, useful animation feedback, results and rematches.
- One decision descriptor contract for card actions, material and target selections, variable payments, responses, damage assignment, hidden choices and ordered triggers. Test against distinct modules and keyboard, touch and reduced-motion interaction.

## C. Workshop and guided creation

- Creation wizard, approachable card and deck editing, visual board and Basic rules, local drafts and checkpoints, undo/redo, validation, playtest, ZIP import/export.
- Build a complete game from a blank collection in the browser and play it through to a result. Extend the guided authoring vocabulary through accessible controls and editable templates.

## D. Advanced composition and scripting

- Visual event, selector, condition, cost and effect composition with reusable components and plain-language previews.
- Versioned sandboxed scripting API, deterministic execution, completion, examples and fixture support. Verify mixed-level round trips and preservation of custom fields.

## E. Reference games and rollout

- Rework Looboo, Crystal Circuit, Taste Dimension, Ringworld Rumble and Generation Wars into complete original games with coherent deck options and differentiated rules.
- Verify at least three structurally different games and a new user-created game through real matches, plus deterministic replay, illegal action rollback, privacy, invalid ZIP recovery and save/reload. Check desktop Chromium and tablet WebKit in both orientations, inspect screenshots, and verify actual visual and gameplay quality.
- Verify the proposed revision in CI, then merge with authorization and verify GitHub Pages. Measure benchmark coverage only against executed evidence. The Master Guide's 80% visual and 95% total coverage targets remain aspirational.

## Milestone order after the first public release

1. **Composable card abilities.** Author costs, target choices and ordered steps visually. Play the resulting rule through the ordinary Workshop and Card Battle path. Verify ZIP round trips, including the editable rule and its canonical instructions.
2. **Reusable rule components and events.** Add reusable effects and keywords that work on more than one card, triggered rules, conditions, and effect duration controls. Verify a triggered ability with optional choices against the computer opponent.
3. **Bounded scripting.** Expose a versioned API with deterministic queries, explicit execution limits, rollback, completion and examples. Demonstrate a scripted rule from the editor through an actual match and ZIP round trip.
4. **Reference games and release.** Expand coherent decks and complete playable matches, measure supported mechanics from executed evidence, and verify the published site at desktop and tablet sizes.
