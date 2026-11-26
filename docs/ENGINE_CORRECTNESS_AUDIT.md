# Release correctness audit — 13A, first pass

Source inspection and targeted regressions, not exhaustive certification. Prioritize correctness before expanding compatibility claims.

## Fixed in this branch
- Hidden reveal grants survived departure/return and shuffle: revoke on movement, shuffle and composite changes.
- Activation could reopen a closed priority window: enforce the closed boundary and suppress advertised activations.
- Precommit target instructions could request a duplicate choice: allow explicitly repeated target validation and fizzle stale selections.
- Stale move references could trap a queued resolution: fizzle rather than reject every attempt to resolve.
- Group combat could select allied or eliminated controllers: filter living enemy targets.

## Remaining audit queue
| Area | Required verification |
|---|---|
| 10A payments | Exhaustive affordability, target legality without explicit revalidation, variable X numeric semantics, generator overflow ordering |
| 10B stacks/decks | Physical identity across token cleanup and split, nested attachment capacity, all deck-role import paths |
| 10C privacy | Viewer-scoped event projections, queue metadata, hidden-dependent legality, reveal changes during transform/control; local hotseat not a network security boundary |
| 10D scheduling | Trigger ordering, extra/skip interactions, gauge handoff versus victory, alternating round refresh |
| 10I packages | Archive adversarial tests, image decoding, size accounting, migration compatibility |
| 11E combat | Full replacement coverage, capacity failures, reaction atomicity and damage assignment |
| 11F expressions | Selector validation parity, expression reference visibility, stabilization/trigger cycles |
| 11G spatial | Path occupancy with followers, local range and hidden occupants, all phase permissions |
| 12H multiplayer | Active elimination refresh, team scoring edge cases, capture persistence on contested sites |
| 12J AI | Candidate fairness, concealed-dependent legality, tactical calibration and real-device accessibility |

No benchmark catalog passes awarded. CI must pass on exact head before merge. Further audit required; this PR is a first focused slice, not completion of milestone 13A.
