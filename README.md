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
