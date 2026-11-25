import test from "node:test";
import assert from "node:assert/strict";
import {
  moduleData,
  parse,
  start,
  reason,
  act,
  pass,
  bot,
  attack,
  validate,
} from "../engine.js";
test("seed reproduces hands and both deck configurations", () => {
  const m = moduleData();
  m.decks[0][m.cards[0].id] = 0;
  assert.deepEqual(start(m, 77), start(m, 77));
  const p = start(m, 77).players[0];
  assert.ok(!p.hand.concat(p.deck).includes(m.cards[0].id));
});
test("optional reaction resolves before a pending hit", () => {
  const m = moduleData(),
    [a, b] = m.cards;
  a.script = "strike 5";
  b.timing = "reaction";
  b.script = "mend 3";
  const s = start(m, 9);
  s.players[0].hand = [a.id];
  s.players[1].hand = [b.id];
  s.players[1].life = 4;
  act(m, s, 0, 0);
  assert.equal(s.actor, 1);
  assert.equal(s.players[1].life, 4);
  act(m, s, 1, 0);
  assert.equal(s.players[1].life, 2);
  assert.equal(s.actor, 0);
  assert.equal(s.pending, null);
});
test("script conditions check post-payment state; illegal payment has no side effects", () => {
  const m = moduleData(),
    c = m.cards[0];
  c.cost = 2;
  c.script = "if_energy_at_least 2 strike 9\nstrike 1";
  c.threshold = 4;
  const s = start(m, 3);
  s.players[0].hand = [c.id];
  assert.match(reason(m, s, 0, 0), /Requires/);
  const initial = structuredClone(s);
  assert.throws(() => act(m, s, 0, 0));
  assert.deepEqual(s, initial);
  c.threshold = 0;
  act(m, s, 0, 0);
  assert.equal(s.players[1].life, m.rules.life - 1);
});
test("units persist, ready next turn, can knock out another unit", () => {
  const m = moduleData(),
    c = m.cards[2],
    s = start(m, 4);
  s.players[0].hand = [c.id];
  act(m, s, 0, 0);
  assert.equal(s.players[0].field.length, 1);
  assert.throws(() => attack(m, s, 0, 0, 0));
  pass(m, s, 0);
  pass(m, s, 1);
  s.players[1].field.push({ id: c.id, hp: 2, ready: true });
  attack(m, s, 0, 0, 0, 0);
  assert.equal(s.players[1].field.length, 0);
  assert.deepEqual(s.players[1].discard, [c.id]);
  assert.equal(s.players[0].field[0].ready, false);
});
test("bot completes seeded duels without illegal moves", () => {
  for (let i = 0; i < 50; i++) {
    const m = moduleData(),
      s = start(m, i);
    let n = 0;
    while (s.winner === null && n++ < 500) {
      if (s.actor === 1) bot(m, s);
      else {
        const j = s.players[0].hand.findIndex((_, k) => !reason(m, s, 0, k));
        if (j >= 0) act(m, s, 0, j);
        else pass(m, s, 0);
      }
    }
    assert.notEqual(s.winner, null);
  }
});
test("reject unknown instructions, unsupported schemas, malformed deck counts", () => {
  assert.throws(() => parse("eval anything"));
  const m = moduleData();
  m.decks[0][m.cards[0].id] = -3;
  assert.throws(() => validate(m));
  m.version = 7;
  assert.throws(() => validate(m));
});
test("concealed units reveal once, carry damage, and enforce Guard for both seats", async () => {
  const {reveal,legalTargets}=await import("../engine.js");
  const m=moduleData(),c=m.cards[1],s=start(m,12);
  c.script="strike 2";s.players[0].hand=[c.id];act(m,s,0,0);
  assert.equal(s.players[1].life,m.rules.life);
  assert.ok(!JSON.stringify(s.log).includes(c.name));
  assert.throws(()=>reveal(m,s,0,0));
  assert.deepEqual(legalTargets(m,s,1),[-1,0]);
  pass(m,s,0);pass(m,s,1);s.players[0].field[0].hp--;
  reveal(m,s,0,0);assert.equal(s.players[0].field[0].hp,c.health-1);
  assert.equal(s.players[1].life,m.rules.life-2);
  assert.throws(()=>reveal(m,s,0,0));assert.deepEqual(legalTargets(m,s,1),[0]);
  pass(m,s,0);s.players[1].field.push({id:m.cards[2].id,hp:3,ready:true});
  assert.throws(()=>attack(m,s,1,0,0,-1),/Guard/);
  attack(m,s,1,0,0,0);assert.equal(s.players[0].field.length,0);
});
