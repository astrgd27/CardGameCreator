# Benchmark specification

## Targets
For EACH primary game and EACH applicable category (rules, design, logic): >=80% Basic+Advanced, >=95% including Script. Targets are cumulative, not additive, and must not be averaged to hide weak categories. No measured baseline yet.

| Game | Representative scope (not exhaustive) |
|---|---|
| Pokémon TCG | Active/Bench, evolution, attachment, attack costs, retreat, weakness/resistance, conditions, Prizes, mulligan |
| Magic: The Gathering | mana, priority, stack, triggers, replacement effects, layers, combat, zones, state-based actions |
| Yu-Gi-Oh! | chains, Extra Deck, summons, face-down cards, positions, dedicated zones, link arrows |
| One Piece Card Game | Leaders, DON!! allocation/attachment, Life, Counters, Blockers, Life triggers |
| Riftbound | Main/Rune decks, locations, movement, control, contested objectives, scoring, rune payment |

Catalog 0.2 in benchmarks.js has 60 provisional cases across these games and categories. It is not exhaustive. Secondary reference: earlier research on 50 physical TCGs when retrieved; expand breadth without weakening the primary gates. Use original fixture cards and assets, not commercial card reproductions.

## Measurement protocol
Basic = ordinary visual controls; Advanced = visual/configurable rule builder without code; Script = supported module scripting, not host code changes. Record least complex passing layer. A pass requires authoring at that layer, load/validation, correct automated legal and illegal actions or display behavior as appropriate, ZIP export/import, and repeated verification. For design cases, include visible rendering checks. Preserve fixture/module, catalog version, case ID, steps/commands, expected/actual outcomes, build/commit, evidence links and date. Manual referee intervention, hardcoded game-name branches, partial behavior, unsupported or pending cases do not pass. Manual browser verification is evidence when reproducible and identified as manual; automated fixtures preferred.

For each game/category, denominator = all applicable cases in a frozen catalog version; pending/partial/fail remain in denominator. Basic+Advanced numerator = verified Basic or Advanced passes; all-layer numerator = those plus verified Script passes. Report counts and percentages with version, unknowns and limitations. N/A requires documented rationale and review; empty categories are N/A, never 100%. Do not compare different catalog versions without a mapping. Add missing cases with source/rationale and version bump; do not delete difficult cases to raise scores.

## Baseline assignment
Inventory all current IDs and classify pending, partial, fail or verified pass. Only claim passes with the evidence above. Where no execution evidence exists mark pending, not unsupported by assumption. Identify the missing primitive and linked roadmap milestone for each known gap. Separate current support from target. Issue #1 establishes baseline and CI; #6 grows executable fixtures and dashboard.
