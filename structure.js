export function upgrade(m) {
  m.description ??= "";
  m.savedDecks ??= m.decks.map((counts, i) => ({
    id: crypto.randomUUID(),
    name: i ? "George's deck" : "My deck",
    notes: "",
    counts: Object.fromEntries(m.cards.map(c => [c.id, counts[c.id] ?? c.copies]))
  }));
  m.activeDecks ??= m.savedDecks.slice(0, 2).map(d => d.id);
  m.table ??= [{id:"field", name:"Battlefield", owner:"player", visibility:"public", capacity:30, start:0, kind:"units", x:5, y:8, w:90, h:80}];
  m.phases ??= [{id:"main", name:"Main", play:true, attack:true}];
  m.attributes ??= [];
  m.types ??= [{id:"unit", name:"Unit", behavior:"unit"}, {id:"event", name:"Event", behavior:"event"}];
  m.deckRules ??= {min:1, max:300, copies:30};
  for (const c of m.cards) {
    c.type ??= c.kind;
    c.values ??= {};
    c.zone ??= m.table.find(z => z.kind === "units")?.id || "field";
  }
  return m;
}

export function checkStructure(m) {
  const fail = message => { throw Error(message); };
  const integer = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
  const key = x => typeof x === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(x) && !Object.hasOwn(Object.prototype, x);
  const unique = a => new Set(a.map(x => x.id)).size === a.length && a.every(x => key(x.id));
  const label = x => typeof x === "string" && !!x.trim() && x.length <= 160;
  if (typeof m.description !== "string" || m.description.length > 3000) fail("Description must be under 3,000 characters.");
  if (!Array.isArray(m.types) || !m.types.length || m.types.length > 30 || !unique(m.types) || m.types.some(t => !label(t.name) || !["unit","event"].includes(t.behavior))) fail("Invalid card types.");
  if (!Array.isArray(m.attributes) || m.attributes.length > 30 || !unique(m.attributes) || m.attributes.some(a => !label(a.name) || !["text","number"].includes(a.type))) fail("Invalid card attributes.");
  if (!Array.isArray(m.phases) || !m.phases.length || m.phases.length > 12 || !unique(m.phases) || m.phases.some(p => !label(p.name) || typeof p.play !== "boolean" || typeof p.attack !== "boolean") || !m.phases.some(p => p.play)) fail("Add at least one phase where cards can be played.");
  if (!Array.isArray(m.table) || !m.table.length || m.table.length > 20 || !unique(m.table)) fail("Use between 1 and 20 table zones.");
  for (const z of m.table) {
    if (!label(z.name) || !["player","shared"].includes(z.owner) || !["public","owner","hidden"].includes(z.visibility) || !["units","cards"].includes(z.kind) || !integer(z.capacity,1,60) || !integer(z.start,0,z.capacity) || !integer(z.x,0,90) || !integer(z.y,0,90) || !integer(z.w,10,100) || !integer(z.h,10,100) || z.x+z.w>100 || z.y+z.h>100) fail("Zone positions must fit inside the table. Capacity must cover the starting cards.");
    if (z.kind === "units" && (z.start !== 0 || z.owner !== "player" || z.visibility !== "public")) fail("Unit zones must be public, owned by each player, and start empty.");
  }
  if (!m.table.some(z => z.kind === "units")) fail("Keep at least one unit zone.");
  if (!m.deckRules || !integer(m.deckRules.min,1,500) || !integer(m.deckRules.max,m.deckRules.min,1500) || !integer(m.deckRules.copies,1,30)) fail("Invalid deck size or copy limits.");
  if (!Array.isArray(m.savedDecks) || !m.savedDecks.length || m.savedDecks.length > 100 || !unique(m.savedDecks)) fail("Use between 1 and 100 saved decks.");
  for (const d of m.savedDecks) {
    if (!label(d.name) || typeof d.notes !== "string" || !d.counts || Array.isArray(d.counts) || typeof d.counts !== "object" || Object.entries(d.counts).some(([id,n]) => !m.cards.some(c => c.id === id) || !integer(n,0,30))) fail("Invalid saved deck.");
  }
  if (!Array.isArray(m.activeDecks) || m.activeDecks.length !== 2 || m.activeDecks.some(id => !m.savedDecks.some(d => d.id === id))) fail("Choose a deck for both players.");
  for (const c of m.cards) {
    if (!m.types.some(t => t.id === c.type && t.behavior === c.kind)) fail("Card type does not match its behavior.");
    if (!m.table.some(z => z.id === c.zone && z.kind === "units")) fail("Choose a valid unit destination.");
    if (!c.values || typeof c.values !== "object" || Array.isArray(c.values)) fail("Invalid card attributes.");
    for (const [key,v] of Object.entries(c.values)) {
      const a = m.attributes.find(a => a.id === key);
      if (!a || a.type === "number" && (!Number.isFinite(v) || Math.abs(v)>99999) || a.type === "text" && (typeof v !== "string" || v.length>500)) fail("Invalid attribute value.");
    }
  }
}

export function deckIssues(m, counts, seat = null) {
  const total = Object.values(counts).reduce((n,v) => n+v, 0);
  const issues = [];
  if (total<m.deckRules.min || total>m.deckRules.max) issues.push("Deck needs "+m.deckRules.min+"–"+m.deckRules.max+" cards.");
  for (const c of m.cards) {
    if ((counts[c.id]||0)>m.deckRules.copies) issues.push(c.name+" exceeds the "+m.deckRules.copies+" copy limit.");
  }
  const needed = m.rules.hand + m.table.reduce((n,z) => n+(z.kind==="cards" && (z.owner==="player" || seat===0) ? z.start : 0),0);
  if (total<needed) issues.push("Setup and opening hand require at least "+needed+" cards.");
  return issues;
}

export function activateDecks(m) {
  m.decks = m.activeDecks.map(id => {
    const d = m.savedDecks.find(d => d.id === id);
    return Object.fromEntries(m.cards.map(c => [c.id, d.counts[c.id]||0]));
  });
}
