import {
  effects,
  glyphs,
  colors,
  card,
  moduleData,
  parse,
  describe,
  uid,
  validate,
  copies,
  start,
  reason,
  act,
  pass,
  bot,
  attack,
} from "./engine.js";
import { collection, saveModule, pack, unpack } from "./storage.js";
import { benchmarks } from "./benchmarks.js";
const $ = (id) => document.getElementById(id),
  root = $("root");
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (k) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        k
      ],
  );
const button = (action, label, cls = "", value = "") =>
  '<button data-action="' +
  action +
  '" data-v="' +
  esc(value) +
  '" class="' +
  cls +
  '">' +
  esc(label) +
  "</button>";
const field = (label, key, v, type = "text", attrs = "") =>
  "<label>" +
  label +
  '<input data-key="' +
  key +
  '" type="' +
  type +
  '" value="' +
  esc(v) +
  '" ' +
  attrs +
  "></label>";
const num = (label, key, v, min, max) =>
  field(
    label,
    key,
    v,
    "number",
    'min="' + min + '" max="' + max + '" step="1" required',
  );
const choose = (label, key, options, v) =>
  "<label>" +
  label +
  '<select data-key="' +
  key +
  '">' +
  options
    .map(
      ([id, name]) =>
        '<option value="' +
        esc(id) +
        '" ' +
        (id === v ? "selected" : "") +
        ">" +
        esc(name) +
        "</option>",
    )
    .join("") +
  "</select></label>";
const options = (a) => a.map((x) => [x, x]);
let m = moduleData(),
  selected = m.cards[0].id,
  mode = "Workshop",
  tab = "Place",
  s = null,
  history = [],
  seed = Date.now(),
  guide = true,
  dirty = false;
const current = () => m.cards.find((c) => c.id === selected);
function status(msg = "") {
  $("status").textContent = msg;
}
function modal(html) {
  $("inside").innerHTML = html;
  if (!$("dialog").open) $("dialog").showModal();
}
$("close").onclick = () => $("dialog").close();
function persist() {
  const snapshot = structuredClone(m);
  saveModule(snapshot).catch(() =>
    status("Browser storage failed. Export ZIP to keep your module."),
  );
  try {
    localStorage.setItem("cgc-current", m.id);
  } catch {}
}
function edited() {
  validate(m);
  s = null;
  history = [];
  dirty = false;
  persist();
  render();
}
function load(x) {
  m = validate(x);
  selected = m.cards[0]?.id;
  tab = "Place";
  mode = "Workshop";
  edited();
}
function cardView(c) {
  const parts = {
    name: "<h3>" + esc(c.name) + "</h3>",
    art:
      '<div class="art"><b>' +
      glyphs[c.glyph] +
      "</b>" +
      (c.art ? '<img alt="" src="' + c.art + '">' : "") +
      "</div>",
    cost:
      '<div class="cost">◈ ' + c.cost + " energy · " + esc(c.timing) + "</div>",
    effect:
      "<p>" +
      esc(describe(c)) +
      (c.kind === "unit"
        ? "<br><b>" +
          c.health +
          " HP</b>" +
          c.attacks
            .map(
              (a) => "<br>◈ " + a.cost + " · " + esc(a.name) + " · " + a.power,
            )
            .join("")
        : "") +
      "</p>",
  };
  return (
    '<article class="card" style="--ink:' +
    colors[c.glyph] +
    '">' +
    m.layout.map((k) => parts[k]).join("") +
    "</article>"
  );
}
const tip = (t) =>
  guide
    ? '<div class="guide"><b>George Card</b> &nbsp;' + esc(t) + "</div>"
    : "";
function order(key, items) {
  return (
    '<div class="stack">' +
    items
      .map(
        (item, i) =>
          '<div class="line zone" draggable="true" data-order="' +
          key +
          '" data-index="' +
          i +
          '"><span>' +
          esc(item) +
          "</span><div>" +
          (i ? button("up", "↑", "chip", key + ":" + i) : "") +
          (i < items.length - 1
            ? button("down", "↓", "chip", key + ":" + i)
            : "") +
          "</div></div>",
      )
      .join("") +
    "</div>"
  );
}
function workshop() {
  const c = current(),
    tile = (k) =>
      '<button class="chip" draggable="true" data-effect="' +
      k +
      '" data-action="effect" data-v="' +
      k +
      '">' +
      effects[k] +
      "</button>";
  let panel = "";
  if (c) {
    if (tab === "Place")
      panel =
        field("Card name", "name", c.name) +
        choose(
          "Card type",
          "kind",
          [
            ["event", "Event"],
            ["unit", "Unit"],
          ],
          c.kind,
        ) +
        num("Energy cost", "cost", c.cost, 0, 20) +
        '<fieldset><legend>Drop an effect onto the card</legend><div class="pieces">' +
        Object.keys(effects).map(tile).join("") +
        "</div></fieldset>" +
        choose(
          "Illustration",
          "glyph",
          glyphs.map((g, i) => [
            String(i),
            g +
              "  ·  " +
              ["Ember", "Tide", "Grove", "Dusk", "Ochre", "Slate"][i],
          ]),
          String(c.glyph),
        ) +
        '<label>Upload card art<input type="file" data-image="art" accept="image/png,image/jpeg,image/webp"></label>';
    if (tab === "Customize") {
      panel =
        choose(
          "Play window",
          "timing",
          [
            ["main", "Main turn"],
            ["reaction", "Reaction"],
          ],
          c.timing,
        ) + num("Minimum available energy", "threshold", c.threshold, 0, 20);
      if (c.kind === "unit")
        panel +=
          num("Unit health", "health", c.health, 1, 99) +
          c.attacks
            .map(
              (a, i) =>
                '<fieldset class="stack"><legend>Attack ' +
                (i + 1) +
                "</legend>" +
                field("Attack name", "attack:" + i + ":name", a.name) +
                num("Attack energy", "attack:" + i + ":cost", a.cost, 0, 20) +
                num("Damage", "attack:" + i + ":power", a.power, 1, 99) +
                "</fieldset>",
            )
            .join("") +
          (c.attacks.length < 4 ? button("add-attack", "＋ Add attack") : "");
      panel +=
        parse(c.script)
          .map(
            (x, i) =>
              '<fieldset class="stack"><legend>Instruction ' +
              (i + 1) +
              "</legend>" +
              choose("Effect", "op:" + i, Object.entries(effects), x.op) +
              num("Amount", "n:" + i, x.n, 0, 99) +
              choose(
                "Condition",
                "when:" + i,
                [
                  ["", "Always"],
                  ["if_life_below", "Your life is below"],
                  ["if_energy_at_least", "Your energy is at least"],
                ],
                x.when || "",
              ) +
              (x.when
                ? num("Condition value", "limit:" + i, x.limit, 0, 99)
                : "") +
              (parse(c.script).length > 1
                ? button("remove-line", "Remove instruction", "chip", i)
                : "") +
              "</fieldset>",
          )
          .join("") + button("append", "＋ Add instruction");
    }
    if (tab === "Script")
      panel =
        '<label>Effect script<textarea id="source" spellcheck="false">' +
        esc(c.script) +
        "</textarea></label>" +
        button("apply", "Apply script", "primary") +
        '<p class="muted">One effect per line. For example, <code>if_life_below 5 mend 2</code>.</p><a href="help.html" target="_blank">Command reference ↗</a>';
    if (tab === "Frame")
      panel =
        '<p class="muted">Arrange fields for every card in this module. Drag rows or use the arrows.</p>' +
        order("layout", m.layout);
  }
  return (
    '<div class="work"><aside class="library"><div class="line"><h2>Card catalog</h2><small>' +
    m.cards.length +
    '</small></div><div class="stack">' +
    m.cards
      .map(
        (x) =>
          '<button data-action="select" data-v="' +
          x.id +
          '" class="item ' +
          (x === c ? "on" : "") +
          '"><span class="mini" style="--ink:' +
          colors[x.glyph] +
          '">' +
          glyphs[x.glyph] +
          "</span>" +
          esc(x.name) +
          "</button>",
      )
      .join("") +
    button("add", "＋ Add card") +
    (c
      ? '<div class="pieces">' +
        button("duplicate", "Duplicate", "chip") +
        button("ask-delete", "Remove", "chip") +
        "</div>"
      : "") +
    '</div></aside><section class="stage" id="drop"><small>CARD PREVIEW</small>' +
    (c
      ? cardView(c) + button("try", "▷ Try card", "primary")
      : button("add", "Create your first card", "primary")) +
    '</section><aside class="inspector"><div class="tabs">' +
    ["Place", "Customize", "Script", "Frame"]
      .map((t) => button("tab", t, tab === t ? "on" : "", t))
      .join("") +
    '</div><div class="stack">' +
    panel +
    "</div></aside></div>" +
    tip(
      "Tap an effect to place it. Try card deals it directly into a practice match.",
    ) +
    '<div class="stack">' +
    button("challenges", "◇ Design challenges") +
    "</div>"
  );
}
function setup() {
  return (
    '<div class="two"><section class="box"><h2>Game rules</h2><div class="stack">' +
    field("Module name", "module", m.name) +
    choose(
      "Victory",
      "win",
      [
        ["damage", "Reduce opposing life to zero"],
        ["survival", "Outlast the opposing deck"],
      ],
      m.rules.win,
    ) +
    num("Starting life", "life", m.rules.life, 1, 99) +
    num("Opening hand", "hand", m.rules.hand, 1, 12) +
    num("Energy per turn", "energy", m.rules.energy, 1, 20) +
    num("Draw per turn", "draw", m.rules.draw, 1, 6) +
    "</div><hr><h2>Table layout</h2>" +
    order("zones", m.zones) +
    '<label>Upload field art<input type="file" data-image="fieldArt" accept="image/png,image/jpeg,image/webp"></label></section><section class="box"><h2>Deck builder</h2><div class="stack">' +
    m.cards
      .map(
        (c) =>
          "<fieldset><legend>" +
          esc(c.name) +
          '</legend><div class="pair">' +
          [0, 1]
            .map((i) =>
              num(
                i ? "George" : "You",
                "deck:" + i + ":" + c.id,
                copies(m, i, c),
                0,
                30,
              ),
            )
            .join("") +
          "</div></fieldset>",
      )
      .join("") +
    "</div>" +
    tip(
      "Each deck is shuffled separately. Use zero copies to leave a card out of one deck.",
    ) +
    "</section></div>"
  );
}
function zones(p, enemy) {
  return (
    '<div class="zones">' +
    m.zones
      .map((z) =>
        z === "field"
          ? '<div class="unitzone"><small>UNIT FIELD</small>' +
            units(p, enemy) +
            "</div>"
          : '<span class="zone">' + z + " · " + p[z].length + "</span>",
      )
      .join("") +
    "</div>"
  );
}
function units(p, enemy) {
  return (
    '<div class="hand">' +
    p.field
      .map((u, i) => {
        const c = m.cards.find((c) => c.id === u.id);
        return (
          '<div class="box"><b>' +
          esc(c.name) +
          "</b> · " +
          u.hp +
          ' HP<br><span class="muted">' +
          (u.ready ? "Ready" : "Resting") +
          "</span>" +
          (!enemy && u.ready && !s.pending && s.winner === null
            ? '<div class="pieces">' +
              c.attacks
                .map((a, j) =>
                  button(
                    "target",
                    a.name + " · " + a.cost + " energy",
                    "chip",
                    i + ":" + j,
                  ),
                )
                .join("") +
              "</div>"
            : "") +
          "</div>"
        );
      })
      .join("") +
    "</div>"
  );
}
function runBot() {
  let n = 0;
  while (s.winner === null && s.actor === 1 && n++ < 100) bot(m, s);
  if (s.actor === 1 && s.winner === null) pass(m, s, 1);
}
function launch(practice = false, newSeed = true) {
  if (newSeed) seed = Math.floor(Math.random() * 2 ** 32);
  const state = start(m, seed);
  if (practice) {
    const c = current(),
      p = state.players[0];
    p.hand.unshift(c.id);
    p.energy = Math.max(p.energy, c.cost, c.threshold);
    if (c.timing === "reaction") {
      const other = m.cards.find((x) => x.timing === "main");
      if (!other)
        throw Error("Add a main-turn card for this reaction to interrupt.");
      state.turn = 1;
      state.actor = 1;
      state.players[1].hand.unshift(other.id);
      state.players[1].energy = Math.max(
        state.players[1].energy,
        other.cost,
        other.threshold,
      );
      act(m, state, 1, 0);
    }
    state.log.push("Practice copy of " + c.name + " dealt.");
  }
  s = state;
  history = [];
  mode = "Playtest";
  render();
}
function battle() {
  if (!s)
    return (
      '<div class="box stack"><h2>Playtest your decks</h2><p>Shuffle both decks and face George Card.</p>' +
      button("duel", "Start duel", "primary") +
      "</div>"
    );
  const [p, q] = s.players;
  const awaiting = s.pending
    ? "React to " + m.cards.find((c) => c.id === s.pending.id).name
    : "Your turn";
  return (
    '<section class="battle" ' +
    (m.fieldArt
      ? 'style="background-image:linear-gradient(#edf2e2cc,#edf2e2cc),url(' +
        m.fieldArt +
        ');background-size:cover"'
      : "") +
    '><div class="line"><h2>George Card</h2><b>' +
    q.life +
    " life · " +
    q.energy +
    " energy</b></div>" +
    zones(q, true) +
    "<hr><small>TURN " +
    s.round +
    "</small><h2>" +
    esc(
      s.winner === null ? awaiting : s.winner === 0 ? "You won" : "George won",
    ) +
    '</h2><hr><div class="line"><h2>Your table</h2><b>' +
    p.life +
    " life · " +
    p.energy +
    " energy</b></div>" +
    zones(p, false) +
    '<div class="hand">' +
    p.hand
      .map((id, i) => {
        const c = m.cards.find((x) => x.id === id),
          why = reason(m, s, 0, i);
        return (
          '<button style="--ink:' +
          colors[c.glyph] +
          '" class="' +
          (why ? "dim" : "") +
          '" data-action="use" data-v="' +
          i +
          '">' +
          glyphs[c.glyph] +
          " " +
          esc(c.name) +
          "<span>" +
          c.cost +
          " energy · " +
          esc(describe(c)) +
          "</span></button>"
        );
      })
      .join("") +
    '</div><div class="actions">' +
    (s.winner === null
      ? button("pass", s.pending ? "Pass reaction" : "End turn", "primary")
      : "") +
    (history.length ? button("rewind", "↶ Rewind") : "") +
    button("replay", "Replay deal") +
    button("duel", "New duel") +
    '</div></section><details open><summary>Match log</summary><ol class="log" reversed>' +
    s.log
      .slice()
      .reverse()
      .map((l) => "<li>" + esc(l) + "</li>")
      .join("") +
    "</ol></details>"
  );
}
function scorecard() {
  return (
    '<section class="box"><h2>Compatibility benchmarks</h2><p>Targets for each game and each category: 80% through Place and Customize, 95% including Script. These are initial acceptance scenarios. Coverage percentages require a complete catalog.</p>' +
    benchmarks
      .map(
        ([game, ...cases]) =>
          "<details><summary>" +
          game +
          " · 3 pending</summary>" +
          cases
            .map(
              (c, i) =>
                "<p><b>" +
                ["Game rules", "Card design", "Card logic"][i] +
                "</b> — " +
                c +
                "</p>",
            )
            .join("") +
          "</details>",
      )
      .join("") +
    "</section>"
  );
}
function render() {
  $("title").textContent = m.name;
  $("modes").innerHTML = ["Workshop", "Game setup", "Playtest", "Benchmarks"]
    .map((x) => button("mode", x, mode === x ? "on" : "", x))
    .join("");
  root.innerHTML =
    mode === "Workshop"
      ? workshop()
      : mode === "Game setup"
        ? setup()
        : mode === "Benchmarks"
          ? scorecard()
          : battle();
}
function onboarding() {
  const hasCard = !!m.cards.length,
    hasUnit = m.cards.some((c) => c.kind === "unit"),
    hasReaction = m.cards.some((c) => c.timing === "reaction");
  modal(
    '<h2>George’s design challenges</h2><div class="stack"><p>Try these in a blank module or remix the starter. Each challenge leaves you with something you can use in a duel.</p>' +
      [
        [
          hasCard,
          "Make your first card",
          "Add a card in the catalog. Name it and place an effect on it.",
        ],
        [
          hasUnit,
          "Build a fighter",
          "Choose Unit in Place. Open Customize and give your fighter an attack.",
        ],
        [
          hasReaction,
          "Interrupt a play",
          "Change a card’s play window to Reaction. Choose Try card to deal it during an opposing play.",
        ],
        [
          m.cards.some((c) => c.script.includes("if_")),
          "Make a comeback card",
          "Add a life condition to a healing instruction. Change its threshold and test the result.",
        ],
      ]
        .map(
          ([done, title, task]) =>
            '<div class="zone"><b>' +
            (done ? "✓ " : "◇ ") +
            title +
            "</b><p>" +
            task +
            "</p></div>",
        )
        .join("") +
      "</div>",
  );
}
function move(key, i, j) {
  const a = m[key];
  if (!a || j < 0 || j >= a.length) return;
  a.splice(j, 0, a.splice(i, 1)[0]);
  edited();
}
const linesToScript = (xs) =>
  xs
    .map(
      (x) =>
        (x.when
          ? x.when + " " + (Number.isFinite(x.limit) ? x.limit : 1) + " "
          : "") +
        x.op +
        " " +
        x.n,
    )
    .join("\n");
async function dispatch(action, v) {
  const c = current();
  if (
    dirty &&
    [
      "tab",
      "mode",
      "select",
      "try",
      "add",
      "switch",
      "blank",
      "starter",
      "duplicate",
      "ask-delete",
      "challenges",
    ].includes(action)
  ) {
    status("Apply the script or discard your draft before leaving.");
    return;
  }
  switch (action) {
    case "mode":
      mode = v;
      break;
    case "challenges":
      onboarding();
      return;
    case "tab":
      tab = v;
      break;
    case "select":
      selected = v;
      break;
    case "add": {
      const x = card("New card " + (m.cards.length + 1), m.cards.length);
      if (m.cards.length >= 500) throw Error("Catalog limit reached.");
      m.cards.push(x);
      selected = x.id;
      tab = "Place";
      edited();
      return;
    }
    case "duplicate": {
      if (m.cards.length >= 500) throw Error("Catalog limit reached.");
      const x = structuredClone(c);
      x.id = uid();
      x.name += " copy";
      m.cards.push(x);
      selected = x.id;
      edited();
      return;
    }
    case "ask-delete":
      modal(
        "<h2>Remove this card?</h2><p>" +
          esc(c.name) +
          " will be removed from both decks.</p>" +
          button("delete", "Remove card"),
      );
      return;
    case "delete":
      m.cards = m.cards.filter((x) => x.id !== selected);
      for (const d of m.decks) delete d[selected];
      selected = m.cards[0]?.id;
      $("dialog").close();
      edited();
      return;
    case "effect":
      c.script = v + " " + (v === "draw" ? 1 : 2);
      edited();
      return;
    case "add-attack":
      if (c.attacks.length < 4)
        c.attacks.push({ name: "Heavy hit", cost: 2, power: 4 });
      edited();
      return;
    case "target":
      modal(
        '<h2>Choose attack target</h2><div class="stack">' +
          button("attack", "George Card", "", v + ":-1") +
          s.players[1].field
            .map((u, i) =>
              button(
                "attack",
                m.cards.find((c) => c.id === u.id).name + " · " + u.hp + " HP",
                "",
                v + ":" + i,
              ),
            )
            .join("") +
          "</div>",
      );
      return;
    case "attack": {
      const prev = structuredClone(s);
      $("dialog").close();
      attack(m, s, 0, ...v.split(":").map(Number));
      history.push(prev);
      runBot();
      break;
    }
    case "append":
      if (parse(c.script).length >= 24) throw Error("Maximum 24 instructions.");
      c.script += "\nstrike 1";
      edited();
      return;
    case "remove-line": {
      const xs = parse(c.script);
      xs.splice(Number(v), 1);
      c.script = linesToScript(xs);
      edited();
      return;
    }
    case "apply":
      parse($("source").value);
      c.script = $("source").value.trim();
      edited();
      status("Script applied.");
      return;
    case "discard":
      dirty = false;
      break;
    case "up":
    case "down": {
      const [key, n] = v.split(":");
      move(key, +n, +n + (action === "up" ? -1 : 1));
      return;
    }
    case "duel":
      launch();
      return;
    case "try":
      launch(true);
      return;
    case "replay":
      launch(false, false);
      return;
    case "use":
    case "pass": {
      if (action === "use") {
        const why = reason(m, s, 0, +v);
        if (why) {
          status(why);
          return;
        }
      }
      history.push(structuredClone(s));
      if (action === "use") act(m, s, 0, +v);
      else pass(m, s, 0);
      runBot();
      break;
    }
    case "rewind":
      if (history.length) s = history.pop();
      break;
    case "guide":
      guide = !guide;
      localStorage.setItem("cgc-guide", String(guide));
      $("dialog").close();
      break;
    case "blank":
    case "starter":
      load(moduleData(action === "blank"));
      $("dialog").close();
      return;
    case "switch": {
      const list = await collection();
      load(list.find((x) => x.id === v));
      $("dialog").close();
      return;
    }
  }
  render();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (b) {
    status();
    dispatch(b.dataset.action, b.dataset.v).catch((err) => status(err.message));
  }
});
root.oninput = (e) => {
  if (e.target.id === "source") {
    dirty = true;
    if (!$("discardDraft")) {
      const b = document.createElement("button");
      b.id = "discardDraft";
      b.dataset.action = "discard";
      b.textContent = "Discard script draft";
      e.target.parentNode.after(b);
    }
  }
};
root.onchange = async (e) => {
  const el = e.target,
    k = el.dataset.key,
    backup = structuredClone(m);
  try {
    if (el.dataset.image) {
      const file = el.files[0];
      if (!file) return;
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 2 * 1024 * 1024
      )
        throw Error("Choose a PNG, JPEG or WebP up to 2 MB.");
      const obj = el.dataset.image === "art" ? current() : m,
        original = m;
      const data = await new Promise((ok, no) => {
        const r = new FileReader();
        r.onload = () => ok(r.result);
        r.onerror = no;
        r.readAsDataURL(file);
      });
      if (m !== original) return;
      obj[el.dataset.image] = data;
      edited();
      return;
    }
    if (!k) return;
    if (!el.checkValidity())
      throw Error("Enter a value in the displayed range.");
    const value =
        el.type === "number" || k === "glyph"
          ? Number(el.value)
          : el.value.trim(),
      c = current();
    if (k === "module") m.name = value;
    else if (Object.hasOwn(m.rules, k)) m.rules[k] = value;
    else if (k.startsWith("attack:")) {
      const [, i, prop] = k.split(":");
      c.attacks[i][prop] = value;
    } else if (k.startsWith("deck:")) {
      const [, p, id] = k.split(":");
      m.decks[p][id] = value;
    } else if (k.includes(":")) {
      const [prop, i] = k.split(":"),
        xs = parse(c.script);
      xs[i][prop] = value;
      c.script = linesToScript(xs);
    } else c[k] = value;
    edited();
  } catch (err) {
    m = backup;
    render();
    status(err.message);
  }
};
root.ondragstart = (e) => {
  const el = e.target.closest("[draggable=true]");
  if (el)
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify(
        el.dataset.effect
          ? { effect: el.dataset.effect }
          : { key: el.dataset.order, i: +el.dataset.index },
      ),
    );
};
root.ondragover = (e) => {
  if (e.target.closest("#drop,[data-order]")) e.preventDefault();
};
root.ondrop = (e) => {
  e.preventDefault();
  try {
    const data = JSON.parse(e.dataTransfer.getData("text/plain")),
      row = e.target.closest("[data-order]");
    if (row && data.key === row.dataset.order && Number.isInteger(data.i))
      move(data.key, data.i, +row.dataset.index);
    else if (
      tab === "Place" &&
      e.target.closest("#drop") &&
      Object.hasOwn(effects, data.effect)
    )
      dispatch("effect", data.effect);
  } catch {}
};
$("help").onclick = () =>
  modal(
    '<h2>Workshop help</h2><div class="stack"><p>Place an effect, try the card, then edit the rule and play again.</p><a href="help.html" target="_blank">Open the workshop handbook ↗</a>' +
      button("challenges", "Open design challenges") +
      button("guide", guide ? "Hide George’s hints" : "Show George’s hints") +
      "</div>",
  );
$("new").onclick = async () => {
  if (dirty) {
    status("Apply or discard your script draft first.");
    return;
  }
  let list = [];
  try {
    list = await collection();
  } catch {}
  modal(
    '<h2>Modules</h2><div class="stack">' +
      button("blank", "＋ Blank module", "primary") +
      button("starter", "Create a starter duel") +
      "<h3>Saved in this browser</h3>" +
      list.map((x) => button("switch", x.name, "", x.id)).join("") +
      "</div>",
  );
};
$("open").onclick = () => {
  if (dirty) {
    status("Apply or discard your script draft first.");
    return;
  }
  $("zip").click();
};
$("zip").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (file) {
      const x = await unpack(file);
      x.id = uid();
      load(x);
      status("Module imported as an independent copy.");
    }
  } catch (err) {
    status(err.message);
  } finally {
    e.target.value = "";
  }
};
$("save").onclick = async () => {
  try {
    if (dirty) throw Error("Apply or discard your script draft before export.");
    const blob = await pack(m),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = (m.name.replace(/[^a-z0-9_-]/gi, "-") || "module") + ".zip";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    status(err.message);
  }
};
try {
  guide = localStorage.getItem("cgc-guide") !== "false";
  const list = await collection(),
    saved = list.find((x) => x.id === localStorage.getItem("cgc-current"));
  if (saved) {
    m = validate(saved);
    selected = m.cards[0]?.id;
  }
} catch {
  status("Browser storage unavailable. Use ZIP export to save.");
}
persist();
render();
