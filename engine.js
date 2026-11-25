export const effects = {
  strike: "Deal damage",
  mend: "Restore life",
  draw: "Draw cards",
  charge: "Gain energy",
};
export const glyphs = ["✷", "◈", "☾", "✦", "⬡", "✺"];
export const colors = [
  "#973e32",
  "#345c65",
  "#3d6345",
  "#665482",
  "#8d6330",
  "#485d85",
];
export const uid = () => crypto.randomUUID();
export function card(name = "Untitled card", i = 0) {
  return {
    id: uid(),
    name,
    cost: 1,
    copies: 3,
    glyph: i % glyphs.length,
    art: "",
    kind: "event",
    entry: "open",
    guard: false,
    health: 3,
    attacks: [{ name: "Quick hit", cost: 1, power: 2 }],
    timing: "main",
    threshold: 0,
    script: "strike 2",
  };
}
export function moduleData(blank = false) {
  const cards = blank
    ? []
    : [
        "Copper Comet",
        "Night Orchard",
        "Waxwing",
        "Lantern Well",
        "Cinderfall",
        "Silver Current",
      ].map(card);
  cards.forEach((c, i) =>
    Object.assign(c, {
      cost: [1, 1, 1, 0, 3, 2][i],
      script: [
        "strike 2",
        "mend 3",
        "draw 2",
        "charge 2",
        "strike 5",
        "strike 2\ndraw 1",
      ][i],
    }),
  );
  if (cards.length) {
    cards[2].kind = "unit";
    cards[2].name = "Waxwing Scout";
    cards[1].kind = "unit";
    cards[1].entry = "hidden";
    cards[1].guard = true;
    cards[2].attacks.push({ name: "Dive", cost: 2, power: 4 });
  }
  return {
    version: 1,
    id: uid(),
    name: blank ? "Untitled module" : "Lantern Duel",
    cards,
    rules: { life: 14, hand: 4, energy: 3, draw: 1, win: "damage" },
    layout: ["name", "art", "cost", "effect"],
    zones: ["deck", "hand", "discard", "field"],
    fieldArt: "",
    decks: [{}, {}],
  };
}
export function parse(source) {
  const lines = source.trim().split(/\n/);
  if (lines.length > 24) throw Error("Use up to 24 instructions per card.");
  return lines.map((line, i) => {
    const m =
      /^\s*(?:(if_life_below|if_energy_at_least)\s+(\d{1,2})\s+)?(strike|mend|draw|charge)\s+(\d{1,2})\s*$/.exec(
        line,
      );
    if (!m)
      throw Error(
        "Line " + (i + 1) + " needs an effect and an amount from 0 to 99.",
      );
    return { when: m[1], limit: Number(m[2]), op: m[3], n: Number(m[4]) };
  });
}
export function describe(c) {
  return parse(c.script)
    .map(
      (x) =>
        (x.when === "if_life_below"
          ? "If your life is below " + x.limit + ", "
          : x.when
            ? "If your energy is at least " + x.limit + ", "
            : "") +
        effects[x.op] +
        " " +
        x.n +
        ".",
    )
    .join(" ");
}
export function copies(m, p, c) {
  return m.decks[p][c.id] ?? c.copies;
}
function integer(v, lo, hi) {
  return Number.isInteger(v) && v >= lo && v <= hi;
}
export function validate(m) {
  const fail = () => {
    throw Error("Invalid module data or unsupported module version.");
  };
  if (
    !m ||
    m.version !== 1 ||
    typeof m.name !== "string" ||
    !m.name.trim() ||
    typeof m.id !== "string" ||
    !Array.isArray(m.cards) ||
    m.cards.length > 500
  )
    fail();
  const art = (s) =>
    s === "" ||
    (typeof s === "string" &&
      /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(s));
  if (
    !art(m.fieldArt) ||
    !m.rules ||
    !integer(m.rules.life, 1, 99) ||
    !integer(m.rules.energy, 1, 20) ||
    !integer(m.rules.hand, 1, 12) ||
    !integer(m.rules.draw, 1, 6) ||
    !["damage", "survival"].includes(m.rules.win)
  )
    fail();
  for (const [key, items] of [
    ["zones", ["deck", "hand", "discard", "field"]],
    ["layout", ["name", "art", "cost", "effect"]],
  ]) {
    if (
      !Array.isArray(m[key]) ||
      m[key].length !== items.length ||
      !items.every((s) => m[key].includes(s))
    )
      fail();
  }
  const ids = new Set();
  for (const c of m.cards) {
    if (
      !c ||
      typeof c.id !== "string" ||
      !/^[-\w]{1,80}$/.test(c.id) ||
      Object.hasOwn(Object.prototype, c.id) ||
      ids.has(c.id) ||
      typeof c.name !== "string" ||
      !c.name.trim() ||
      !integer(c.glyph, 0, 5) ||
      !integer(c.cost, 0, 20) ||
      !integer(c.copies, 1, 30) ||
      !integer(c.threshold, 0, 20) ||
      !art(c.art) ||
      !["main", "reaction"].includes(c.timing)
    )
      fail();
    if (
      !["unit", "event"].includes(c.kind) ||
      !integer(c.health, 1, 99) ||
      !Array.isArray(c.attacks) ||
      !c.attacks.length ||
      c.attacks.length > 4 ||
      c.attacks.some(
        (a) =>
          typeof a.name !== "string" ||
          !a.name.trim() ||
          !integer(a.cost, 0, 20) ||
          !integer(a.power, 1, 99),
      )
    )
      fail();
    if (c.entry !== undefined && !["open","hidden"].includes(c.entry) || c.guard !== undefined && typeof c.guard !== "boolean") fail();
    ids.add(c.id);
    parse(c.script);
  }
  if (
    !Array.isArray(m.decks) ||
    m.decks.length !== 2 ||
    m.decks.some(
      (d) =>
        !d ||
        typeof d !== "object" ||
        Array.isArray(d) ||
        Object.entries(d).some(([k, v]) => !ids.has(k) || !integer(v, 0, 30)),
    )
  )
    fail();
  return m;
}
function shuffled(deck, rng) {
  for (let i = deck.length - 1; i > 0; i--) {
    let j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
function draw(p, n) {
  p.hand.push(...p.deck.splice(0, n));
}
export function start(m, seed = Date.now()) {
  validate(m);
  let a = seed >>> 0;
  const rng = () =>
    (a = (Math.imul(a, 1664525) + 1013904223) >>> 0) / 4294967296;
  const players = [0, 1].map((i) => {
    const deck = shuffled(
      m.cards.flatMap((c) => Array(copies(m, i, c)).fill(c.id)),
      rng,
    );
    if (!deck.length) throw Error("Add at least one card to each deck first.");
    const p = {
      deck,
      hand: [],
      discard: [],
      field: [],
      life: m.rules.life,
      energy: m.rules.energy,
    };
    draw(p, m.rules.hand);
    return p;
  });
  return {
    players,
    turn: 0,
    round: 1,
    actor: 0,
    pending: null,
    winner: null,
    log: ["Opening hands dealt. You go first."],
  };
}
export function reason(m, s, who, index) {
  if (s.winner !== null) return "Match finished.";
  if (s.actor !== who) return "Wait for priority.";
  const c = m.cards.find((c) => c.id === s.players[who].hand[index]);
  if (!c) return "No card.";
  if ((c.timing === "reaction") !== Boolean(s.pending))
    return s.pending
      ? "Only a reaction can interrupt."
      : "Wait for an opposing card.";
  if (s.players[who].energy < c.threshold)
    return "Requires " + c.threshold + " available energy.";
  if (s.players[who].energy < c.cost) return "Needs " + c.cost + " energy.";
  return "";
}
export function moves(m, s, who) {
  return s.players[who].hand
    .map((_, i) => i)
    .filter((i) => !reason(m, s, who, i));
}
const side = (i) => (i ? "George" : "You");
function applyEffects(m, s, id, who) {
  const c = m.cards.find((c) => c.id === id),
    p = s.players[who],
    q = s.players[1 - who];
  for (const x of parse(c.script)) {
    if (
      (x.when === "if_life_below" && p.life >= x.limit) ||
      (x.when === "if_energy_at_least" && p.energy < x.limit)
    )
      continue;
    if (x.op === "strike") q.life = Math.max(0, q.life - x.n);
    if (x.op === "mend") p.life = Math.min(m.rules.life, p.life + x.n);
    if (x.op === "charge") p.energy += x.n;
    if (x.op === "draw") draw(p, x.n);
    s.log.push(c.name + " · " + effects[x.op] + " " + x.n);
    if (q.life === 0 && m.rules.win === "damage") {
      s.winner = who;
      break;
    }
  }
}
function resolve(m,s,id,who) {
  const c=m.cards.find(c=>c.id===id),p=s.players[who];
  applyEffects(m,s,id,who);
  if (c.kind === "unit") p.field.push({ id, hp: c.health, ready: false });
  else p.discard.push(id);
}
export function act(m, s, who, index) {
  const why = reason(m, s, who, index);
  if (why) throw Error(why);
  const p = s.players[who],
    id = p.hand.splice(index, 1)[0],
    c = m.cards.find((c) => c.id === id);
  p.energy -= c.cost;
  if(c.kind==="unit" && c.entry==="hidden" && c.timing==="main" && !s.pending){
    p.field.push({id,hp:2,ready:false,hidden:true});
    s.visual={type:"set",who,index:p.field.length-1};s.log.push(side(who)+" set a unit face-down.");return;
  }
  s.visual={type:"play",who,id};
  s.log.push(side(who) + " played " + c.name + ".");
  if (s.pending) {
    resolve(m, s, id, who);
    finishPending(m, s);
    return;
  }
  s.pending = { id, who };
  s.actor = 1 - who;
  if (!moves(m, s, s.actor).length) finishPending(m, s);
}
function finishPending(m, s) {
  const { id, who } = s.pending;
  s.pending = null;
  s.actor = s.turn;
  if (s.winner === null) resolve(m, s, id, who);
  else s.players[who].discard.push(id);
}
export function pass(m, s, who) {
  if (s.actor !== who || s.winner !== null) throw Error("Cannot pass now.");
  s.visual={type:"pass",who};
  if (s.pending) {
    finishPending(m, s);
    return;
  }
  s.turn = 1 - who;
  s.actor = s.turn;
  s.round++;
  const p = s.players[s.turn];
  p.energy = m.rules.energy;
  p.field.forEach((unit) => (unit.ready = true));
  if (!p.deck.length) {
    s.winner = who;
    s.log.push(side(s.turn) + " ran out of cards at turn start.");
    return;
  }
  draw(p, m.rules.draw);
  s.log.push(side(s.turn) + " started turn " + s.round + ".");
}
export function reveal(m,s,who,index){
  const u=s.players[who].field[index];
  if(s.actor!==who || s.turn!==who || s.pending || s.winner!==null || !u?.ready || !u.hidden)throw Error("Reveal a ready face-down unit on your turn.");
  const c=m.cards.find(c=>c.id===u.id);
  u.hidden=false;u.hp=Math.max(1,c.health-(2-u.hp));
  s.visual={type:"flip",who,id:c.id,index};s.log.push(side(who)+" revealed "+c.name+".");
  applyEffects(m,s,c.id,who);
}
export function legalTargets(m,s,who){
  const field=s.players[1-who].field;
  const guards=field.flatMap((u,i)=>!u.hidden&&m.cards.find(c=>c.id===u.id).guard?[i]:[]);
  return guards.length?guards:[-1,...field.map((_,i)=>i)];
}
export function attack(m, s, who, index, move, target = -1) {
  const p = s.players[who],
    q = s.players[1 - who],
    u = p.field[index];
  if (
    s.winner !== null ||
    s.actor !== who ||
    s.turn !== who ||
    s.pending ||
    u?.hidden || !u?.ready
  )
    throw Error("Unit must be ready during your main turn.");
  const c = m.cards.find((c) => c.id === u.id),
    a = c.attacks[move];
  if (!a || p.energy < a.cost) throw Error("Insufficient attack energy.");
  if (target !== -1 && !q.field[target])
    throw Error("Select an opposing target.");
  if(!legalTargets(m,s,who).includes(target))throw Error("An opposing Guard must be attacked first.");
  s.visual={type:"attack",who,id:c.id,index,target};p.energy -= a.cost;
  u.ready = false;
  const targetName=target===-1?"":q.field[target].hidden?"a face-down unit":m.cards.find(c=>c.id===q.field[target].id).name;
  if (target === -1) {
    q.life = Math.max(0, q.life - a.power);
    if (q.life === 0 && m.rules.win === "damage") s.winner = who;
  } else {
    const t = q.field[target];
    t.hp -= a.power;
    if (t.hp <= 0) {
      q.discard.push(t.id);
      q.field.splice(target, 1);
    }
  }
  s.log.push(c.name + " used " + a.name + " for " + a.power + " damage to " + (target===-1?(who?"you":"George"):targetName) + ".");
}
export function bot(m, s) {
  const p = s.players[1],
    options = moves(m, s, 1);
  for (const [i, u] of p.field.entries()) {
    if (!u.ready || s.pending) continue;
    if(u.hidden){reveal(m,s,1,i);return}
    const attacks = m.cards.find((c) => c.id === u.id).attacks;
    const best = attacks
      .map((a, j) => ({ a, j }))
      .filter((x) => x.a.cost <= p.energy)
      .sort((a, b) => b.a.power - a.a.power)[0];
    if (best) {
      const q = s.players[0];
      const target =
        q.life <= best.a.power
          ? -1
          : q.field.findIndex((t) => t.hp <= best.a.power);
      const allowed=legalTargets(m,s,1);attack(m, s, 1, i, best.j, allowed.includes(target)?target:allowed[0]);
      return;
    }
  }
  const score = (i) =>
    parse(m.cards.find((c) => c.id === p.hand[i]).script).reduce(
      (v, x) =>
        v +
        (x.op === "strike"
          ? x.n * 2
          : x.op === "mend"
            ? Math.min(m.rules.life - p.life, x.n)
            : x.op === "draw"
              ? Math.min(p.deck.length, x.n)
              : x.n) *
          1,
      0,
    );
  options.sort((a, b) => score(b) - score(a));
  if (
    options.length &&
    (score(options[0]) > 0 ||
      m.cards.find((c) => c.id === p.hand[options[0]]).kind === "unit")
  )
    act(m, s, 1, options[0]);
  else pass(m, s, 1);
}
