# AI audit — milestone 12J

This initial slice replaces legacy easy-mode fallback with one validated candidate pipeline. Easy uses action priors and a 20-candidate budget; normal uses public heuristics and 60 candidates; hard uses 160 candidates. No measured strength ordering is asserted.

| Mechanic | Prior gap | Initial improvement | Remaining |
|---|---|---|---|
| Dynamic payment | Missing choices | Bounded hybrid, mode, target, variable and generator combinations | Complete affordability solver and effect-specific utility |
| Evolution | Not enumerated | Legal stack options and public stat heuristics | Inheritance and future synergies |
| Hidden decisions | Arbitrary choices | Authorized label valuation; no concealed draw outcome scoring | Belief distributions, opponent inference |
| Combat | Reactions ignored | Hand reactions, legal positional blocks, manual assignment baseline | Multi-window tactical search |
| Spatial | No moves | Legal movement and objective capture preference | Path planning over several turns |
| Objectives | Not valued | Public score/team evaluation and capture reward | Strategic race and threat evaluation |

Information set: score only authorized projections and known rule definitions; restrict post-action scoring to conservatively classified public operations. Runtime legality checks still execute against authoritative cloned state; hidden-dependent legality and errors may influence candidate selection, so this is not a formal noninterference guarantee. No sampling of opponent hidden cards or hidden draws for outcome optimization.

Profiling: run `node scripts/ai-profile.mjs [module.json] [games]` for seat-swapped difficulty pairings, action/turn limits, outcomes and decision mean/p95/max latency. Timings are opt-in and machine-dependent. Default demo lacks terminal victory; use a module with explicit victory for strength measurements. No numerical results claimed until execution.

Next: terminal original benchmark modules, stronger public tactical search, privacy differential tests, fair candidate scheduling and calibrated difficulty, then UI accessibility and performance review.

## Second slice
Hard mode adds a bounded public-only next-turn counterattack check on the eight highest-ranked root candidates, with up to twelve replies per root. It deliberately declines speculation across draws, triggered effects and complex timing policies. Two symmetric terminal modules (attrition and score race) support paired comparisons via `node scripts/ai-calibrate.mjs 8`. The script reports wins and terminal rates, not a claimed calibrated strength ordering. UI improvements preserve card focus, expand inspection, scroll hands locally, enlarge touch targets and filter editor sections. Physical iPad verification is still required; browser WebKit is a proxy only.
