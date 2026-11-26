# Milestone 13A exit criteria and 13B entry gate

Status: proposed gate; not yet satisfied. Reviewed 2026-11-26.
CI is necessary, not proof of universal correctness.

## Required before starting certification
1. PRs 52–55 merged in dependency order with successful exact-head CI and explicit product approval.
2. Main CI passes Node regression suite, benchmark scorer, standalone byte comparison, desktop Chromium and both tablet WebKit configurations. No skipped or weakened regression to conceal a defect.
3. Seeded invariant corpus passes legal and illegal action sequences, checking identity, zone capacity, attachments, spatial occupancy and input immutability. Current corpus includes demonstration, terminal, spatial and combined scheduler/payment/composite/objective modules; report actual executed steps rather than theoretical maxima.
4. No known unresolved reproducible critical/high defect within the supported local gameplay scope: state corruption, deadlock, unauthorized actions, concealed identity disclosure in viewer projections, loss of physical cards, invalid payment commitment, or incorrect terminal adjudication.
5. Preserve pending or partial benchmark cases. Freeze catalog version 0.2 and its 60 cases; do not award support solely because a primitive or regression passes.
6. Record each case's original fixture, authoring layer, legal/illegal action traces, ZIP roundtrip, replay result, commit and visible design evidence where applicable. Existing 80% Basic+Advanced and 95% all-layer per-game/category targets remain unchanged.

## Known limitations and disposition
| Area | Disposition before certification |
|---|---|
| Payment search budget | Allowed if unknown remains explicit and commitment atomic; no pass for unsupported combination |
| Hidden information | Local projection tests required; online trust boundary out of scope, no security certification |
| Archive safety | Size/path/schema adversarial checks required; full hostile archive sandboxing not claimed |
| Schedulers | Conflicting policies rejected; unsupported combinations remain pending |
| Combat | Two living seats for group combat; multi-defender cases remain pending |
| Spatial | Undirected graph and no area templates; unsupported cases remain pending |
| AI | Bounded heuristics; no calibrated strength claim; stalls are defects when reproducible in supported fixtures |
| UI | Browser emulation only; physical iPad evidence deferred to 13C, not claimed |
| Legacy | Standalone and existing workshop regression must pass |

## Evidence and decision
PR 51 merged after successful run 45861102474. PR 52 run 45860725618, PR 53 run 45861171123, PR 54 run 45861886523 succeeded before reconciliation. PR 52 new head requires fresh CI; PR 55 requires initial CI. No outstanding failure observed in those completed runs. Do not mark the gate complete until merged main validation and remaining defect review are recorded.
