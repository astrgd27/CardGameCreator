# TCG Maker

Play original trading card games against a computer opponent and build your own games in the browser.

Open the [GitHub Pages site](https://astrgd27.github.io/CardGameCreator/) for the published version. To preview this checkout, run `python3 -m http.server 8000` and open `http://localhost:8000`.

The library opens each module’s hub. Choose **Card Battle** to configure a match or **Workshop** to edit a local copy. **New module** starts a guided duel with sample cards or an empty collection. Workshop autosaves draft edits. **Save checkpoint** updates the version used by Card Battle, and **Playtest** freezes the current draft for a match. Portable ZIP files carry rules, cards, decks, board layouts and embedded card artwork.

The guided Workshop currently supports two-player creature duels and two-lane combat, life and energy rules, deck lists and basic deployment effects. Advanced Workshop exposes the existing structured module editor. The reference games are work in progress.

Run `npm test` on Node 22 or later. For the browser suite, install `@playwright/test@1.56.1`, install Chromium and WebKit using Playwright, then run `npx playwright test`. The standalone diagnostic arena remains available at `duel.html`.

See [ROADMAP.md](ROADMAP.md) for the Master Guide implementation sequence and release gates. JSZip and its license are included in `vendor/`.
