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

## Second pass
- Fixed impossible minimum resource quotes and disjoint card-cost feasibility for dynamic plans. The resource estimate is deliberately optimistic: hybrid and generator combination search is not exhaustive; commitment remains authoritative.
- Disallowed token composite hosts, which otherwise could remove consumed physical cards on token cleanup.
- Revoked reveal grants on transform, flip and token removal.
- Added allowlisted viewer event projection for UI history and animations. Internal events remain trusted and unredacted; event type, zone and counts can still convey public consequences. This is not an online security boundary.
- Validate dynamic selector structure and reject conflicting alternate/gauge/auto-phase combinations. These combinations need a defined scheduling contract before being enabled.
- Adjudicate stable victory before automatic handoff; retain invalid-reference exceptions while stale selected targets fizzle.
- Upstream AI branch restored conservative pass policy for occupied stacks to address computer-opponent regression. No tests weakened.
- Six adversarial regression scenarios added. Exact-head CI remains required. General resolution failures after a pending choice, full hybrid affordability, complete event noninterference, and selector validation parity remain open.

## Third pass
Bounded payment witness search enumerates hybrid choices, generator subsets (one rule per physical card), and distinct card assignments, capped at 2048 search nodes. Minimum X and first legal targets/mode are used because they do not change current payment rules. Budget exhaustion is reported as unknown, not impossible. Authorized pending-choice failures discard suspended work while retaining activation costs; unauthorized choices still reject. Composite separation respects the requested face. Added differential hidden-state comparisons and 12 seeded mixed action sequences (up to 420 steps). Remaining: exhaustive generator ordering and target-dependent costs, non-dynamic matching completeness, broad schema fuzzing, pre-choice failure recovery and full cross-module invariant corpus. CI pending.

## Fourth pass
Initial effect failures now fizzle at the match boundary, preserving committed activation costs and releasing priority; low-level interpreter exceptions remain intact. Dynamic payment witnesses search generator permutations inside the existing node budget. Nested malformed schema validation returns errors, and portable archive extraction checks directory counts, declared lengths and UTF-8. Added cross-module seeded invariant tests, malformed schema and archive cases, and differential pending-search privacy tests. Archive checks are not a full ZIP parser security certification; generator search remains bounded; the corpus is small. CI required before certification.
