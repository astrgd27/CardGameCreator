# Card Game Creator

A browser-based TCG workshop. Open the original Lantern Duel starter or make a blank module. Place effects on cards, adjust their timing, build decks, and play George Card. The five reference TCGs have acceptance scenarios in Benchmarks. Their coverage targets are long-term goals.

## Run

Serve this directory with `python3 -m http.server 8000` and open http://localhost:8000. The app runs entirely in the browser with no backend or API key. The root directory can also be served by a static host such as GitHub Pages. Run the engine suite with `npm test` on Node 22 or newer.

## Workshop

- **Place** builds events and units, and sets cost, art, and the initial effect.
- **Customize** edits reaction timing, thresholds, multi-attack units, conditional effects and ordered resolution.
- **Script** edits those effect instructions directly in a bounded language. See [the handbook](help.html).
- **Frame** rearranges the fields shared by cards in a module.
- **Game setup** configures deck composition, victory, turn settings, table order, and field art.
- **Playtest** supports targeting, reactions, seeded deals, individual card practice, and rewind.
- Modules autosave in IndexedDB. ZIP export includes manifest.json, module.json and image files under assets/. Import makes an independent copy.

## Current engine boundaries

Two seats, alternating turns, one response per main card, personal life and energy, one unit field per side, and three rearrangeable deck zones. The engine supports original dueling games within those constraints. Custom zone semantics, general trigger subscriptions, arbitrary payment systems, continuous effects and multi-object stacks remain future work. The initial benchmark catalog contains fifteen pending scenarios and cannot substantiate a coverage percentage yet.

JSZip and its license are included in vendor/.

## Recovered module and deck release

The module home links to Create, Decks and Play. Create includes Cards, Table, Rules, Types & attributes, and Benchmarks.

Decks supports independent named lists, notes, duplication, search, type filters, cost sorting, compact/gallery views, copy controls, cost curves, deck limits and matchup selection. Existing modules migrate their two deck configurations into saved decks. ZIP files include the new settings.

Custom zones support percentage position and size, unit capacity, and setup piles. Piles can be shared or player-owned with public, owner-only or hidden visibility. Shared setup draws from the first player's deck. Unit zones are public and player-owned. Card editors assign unit destinations. Phases independently allow card play and attacks; start-of-turn draw, energy refresh and readying stay automatic.

Custom types use existing unit or event behavior. Custom attributes display on cards and participate in deck search. General triggers, linked locations, resource systems and arbitrary victory conditions remain pending.

Catalog 0.2 contains 60 provisional scenarios with setup, expected outcomes and verification procedures. Coverage remains unmeasured. Tests cover legacy migration, phase restrictions, atomic capacity checks, setup piles and existing duel behavior.
