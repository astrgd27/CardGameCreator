import {upgrade, deckIssues, activateDecks} from "./structure.js";
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
  attack, reveal, legalTargets,
} from "./engine.js";
import { applyTracked, trackedFieldId, trackedBot } from "./kernel/tracked-legacy.js";
import { legacySnapshot } from "./kernel/legacy-adapter.js";
import { collection, saveModule, pack, unpack } from "./storage.js";
import { benchmarks, catalogVersion, benchmarkScope } from "./benchmarks.js";
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
const builtinArt=Array.from({length:6},(_,i)=>"assets/art"+i+".webp");
const options = (a) => a.map((x) => [x, x]);
let m = upgrade(moduleData()),
  selected = m.cards[0].id,
  mode = "Modules",
  tab = "Place",
  s = null,
  tracked = null,
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
  $("saveState").textContent = "Saving…";
  m.updatedAt = new Date().toISOString();
  const snapshot = structuredClone(m);
  saveModule(snapshot).then(() => { $("saveState").textContent = "Saved"; refreshModules(); }).catch(() =>
    status("Browser storage failed. Export ZIP to keep your module."),
  );
  try {
    localStorage.setItem("cgc-current", m.id);
  } catch {}
}
function edited() {
  upgrade(m);
  activateDecks(m);
  validate(m);
  s = null;
  tracked = null;
  history = [];
  dirty = false;
  persist();
  render();
}
function load(x) {
  m = validate(x);
  selected = m.cards[0]?.id;
  tab = "Place";
  editDeck=m.savedDecks[0].id;
  zoneSelected=m.table[0].id;
  mode = "Modules";
  edited();
}
function cardView(c) {
  const parts = {
    name: "<h3>" + esc(c.name) + "</h3>",
    art:
      '<div class="art"><b>' +
      glyphs[c.glyph] +
      "</b>" +
      '<img alt="" src="' + (c.art || builtinArt[c.glyph]) + '">' +
      "</div>",
    cost:
      '<div class="cost">◈ ' + c.cost + " energy · " + esc(m.types.find(t=>t.id===c.type)?.name||c.kind) + (c.timing==="reaction"?" · Reaction":"") + "</div>",
    effect:
      "<p>" +
      m.attributes.filter(a=>c.values?.[a.id]!==undefined).map(a=>"<b>"+esc(a.name)+"</b> "+esc(c.values[a.id])+" · ").join("") +
      (c.guard?"<b>Guard</b> · ":"")+(c.kind==="unit"&&c.entry==="hidden"?"Set face-down. ":"")+esc(describe(c)) +
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
    '<article class="card" data-card="'+esc(c.id)+'" style="--ink:' +
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
        choose("Card type","cardType",m.types.map(t=>[t.id,t.name]),c.type)+
        (c.kind==="unit"?choose("Deploy to zone","zone",m.table.filter(z=>z.kind==="units").map(z=>[z.id,z.name]),c.zone):"")+
        m.attributes.map(a=>a.type==="number"?num(a.name,"value:"+a.id,c.values[a.id]??0,-99999,99999):field(a.name,"value:"+a.id,c.values[a.id]??"")).join("")+
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
          choose("Deployment","entry",[["open","Face-up"],["hidden","Set face-down · reveal next turn"]],c.entry||"open")+
          choose("Defense","guard",[["no","Normal"],["yes","Guard · must be targeted first"]],c.guard?"yes":"no")+
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
          colors[x.glyph] + ';background-image:url('+(x.art||builtinArt[x.glyph])+')' +
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

let editDeck = "", deckSearch = "", deckFilter = "all", deckSort = "name", deckView = "gallery";
let zoneSelected = "field", moduleList = [];
const deckNow = () => m.savedDecks.find(d => d.id === editDeck) || m.savedDecks[0];

function navMode() {
  if (["Workshop","Game setup","Table","Attributes","Benchmarks"].includes(mode)) return "Create";
  return mode === "Playtest" ? "Play" : mode;
}
async function refreshModules() {
  try {
    moduleList = await collection();
    if (mode === "Modules") render();
  } catch {}
}
function moduleHome() {
  return '<section class="moduleHero"><div><small>YOUR WORKSHOP</small><h2>'+esc(m.name)+'</h2><p>'+
    esc(m.description || "Build your cards, shape the rules, and bring your game to the table.")+
    '</p><div class="pieces">'+button("mode","Continue creating","primary","Workshop")+
    button("mode","Build a deck","","Decks")+button("mode","Play","","Playtest")+
    '</div></div><div class="heroCards">'+m.cards.slice(0,3).map(cardView).join("")+
    '</div></section><div class="two"><section class="box"><h2>Module details</h2><p>'+
    m.cards.length+' cards · '+m.savedDecks.length+' decks</p><div class="stack">'+
    field("Module name","module",m.name)+'<label>Description<textarea data-key="description">'+
    esc(m.description)+'</textarea></label></div></section><section class="box"><div class="line"><h2>Your modules</h2>'+
    button("module-new","＋ New")+'</div><div class="stack">'+
    moduleList.map(x=>button("switch",x.name,x.id===m.id?"on":"",x.id)).join("")+'</div></section></div>';
}
function deckBuilder() {
  const d = deckNow(), counts = d.counts;
  const entries = m.cards.filter(c => counts[c.id] > 0);
  const total = entries.reduce((n,c) => n+counts[c.id],0);
  const issues = deckIssues(m,counts);
  const curve = Array.from({length:7},(_,i)=>entries.filter(c=>Math.min(c.cost,6)===i).reduce((n,c)=>n+counts[c.id],0));
  const cards = m.cards.filter(c =>
    (c.name+" "+describe(c)+" "+Object.values(c.values).join(" ")).toLowerCase().includes(deckSearch.toLowerCase()) &&
    (deckFilter==="all" || c.type===deckFilter));
  cards.sort((a,b)=>deckSort==="cost"?a.cost-b.cost||a.name.localeCompare(b.name):a.name.localeCompare(b.name));
  const deckOptions = m.savedDecks.map(d=>[d.id,d.name]);
  const toolbar = '<div class="deckToolbar">'+choose("Editing deck","selectedDeck",deckOptions,d.id)+
    '<div class="pieces">'+button("deck-new","＋ New deck")+button("deck-copy","Duplicate")+
    button("deck-delete-prompt","Delete")+'</div>'+
    choose("Your match deck","active:0",deckOptions,m.activeDecks[0])+
    choose("George’s match deck","active:1",deckOptions,m.activeDecks[1])+button("deck-test","Playtest this deck","primary")+'</div>';
  const browser = '<section class="box"><div class="line"><h2>Card browser</h2><small>'+cards.length+' cards</small></div>'+
    '<div class="deckFilters"><label>Search cards<input id="deckSearch" value="'+esc(deckSearch)+'" placeholder="Name, rules or attributes"></label>'+
    choose("Type","deckFilter",[["all","All types"],...m.types.map(t=>[t.id,t.name])],deckFilter)+
    choose("Sort","deckSort",[["name","Name"],["cost","Energy cost"]],deckSort)+
    button("deck-view",deckView==="gallery"?"Compact view":"Gallery view")+'</div><div class="'+
    (deckView==="gallery"?"deckGallery":"deckCompact")+'">'+cards.map(c=>
      '<div class="deckChoice" draggable="true" data-deckcard="'+c.id+'">'+
      (deckView==="gallery"?cardTile(c,"deck-add",c.id):button("deck-add",c.name+" · "+c.cost+" energy","",c.id))+
      '<div class="line">'+button("inspect","Inspect","chip",c.id)+button("deck-add","＋ Add · "+(counts[c.id]||0),"chip",c.id)+'</div></div>'
    ).join("")+(cards.length?"":'<p class="muted">No matching cards.</p>')+'</div></section>';
  const groups = m.types.map(t=>{
    const group=entries.filter(c=>c.type===t.id);
    return group.length?'<h3>'+esc(t.name)+'</h3>'+group.map(c=>
      '<div class="deckRow">'+button("inspect",c.name,"",c.id)+'<div class="pieces">'+
      button("deck-minus","−","chip",c.id)+'<b>'+counts[c.id]+'</b>'+button("deck-add","+","chip",c.id)+'</div></div>'
    ).join(""):"";
  }).join("");
  const detail = '<aside class="box" id="deckDrop"><div class="line"><h2>Current deck</h2><strong>'+total+
    ' cards</strong></div><div class="stack">'+field("Deck name","deckName",d.name)+
    '<label>Deck notes<textarea data-key="deckNotes">'+esc(d.notes)+'</textarea></label></div><div class="deckList">'+
    (groups||'<p class="muted">Tap cards or drag them here to add copies.</p>')+'</div><h3>Energy curve</h3><div class="curve">'+
    curve.map((n,i)=>'<div><b>'+n+'</b><span style="height:'+Math.max(2,70*n/Math.max(1,...curve))+'px"></span><small>'+i+(i===6?"+":"")+'</small></div>').join("")+
    '</div><p class="muted">'+entries.filter(c=>c.kind==="unit").reduce((n,c)=>n+counts[c.id],0)+' units · '+
    entries.filter(c=>c.kind==="event").reduce((n,c)=>n+counts[c.id],0)+' events</p><div class="'+(issues.length?"issue":"valid")+'">'+
    (issues.length?issues.map(esc).join("<br>"):"✓ Deck meets this module’s limits")+'</div></aside>';
  return toolbar+'<div class="deckWorkspace">'+browser+detail+'</div>';
}
function settings() {
  const phases=m.phases.map((p,i)=>'<fieldset><legend>Phase '+(i+1)+'</legend><div class="stack">'+
    field("Phase name","phase:"+i+":name",p.name)+
    choose("Play cards","phase:"+i+":play",[["yes","Allowed"],["no","Unavailable"]],p.play?"yes":"no")+
    choose("Attack","phase:"+i+":attack",[["yes","Allowed"],["no","Unavailable"]],p.attack?"yes":"no")+
    '<div class="pieces">'+(i?button("phase-up","↑","chip",i):"")+
    (i<m.phases.length-1?button("phase-down","↓","chip",i):"")+
    (m.phases.length>1?button("phase-remove","Remove","chip",i):"")+'</div></div></fieldset>').join("");
  return '<div class="two"><section class="box"><h2>Match rules</h2><div class="stack">'+
    choose("Victory","win",[["damage","Reduce opposing life to zero"],["survival","Outlast opposing deck"]],m.rules.win)+
    num("Starting life","life",m.rules.life,1,99)+num("Opening hand","hand",m.rules.hand,1,12)+
    num("Energy refreshed each turn","energy",m.rules.energy,1,20)+num("Cards drawn each turn","draw",m.rules.draw,1,6)+
    '</div><hr><h2>Deck requirements</h2><div class="stack">'+num("Minimum deck size","limit:min",m.deckRules.min,1,500)+
    num("Maximum deck size","limit:max",m.deckRules.max,1,1500)+num("Maximum copies per card","limit:copies",m.deckRules.copies,1,30)+
    '</div></section><section class="box"><div class="line"><h2>Turn sequence</h2>'+button("phase-add","＋ Phase")+
    '</div><p class="muted">Advance through these phases in order. Energy, readying and drawing occur at the start of each new turn.</p><div class="stack">'+phases+'</div></section></div>';
}
function tableEditor() {
  const z=m.table.find(z=>z.id===zoneSelected)||m.table[0];
  const canvas=m.table.map(z=>'<button class="canvasZone '+(z.id===zoneSelected?"selected":"")+
    '" style="left:'+z.x+'%;top:'+z.y+'%;width:'+z.w+'%;height:'+z.h+
    '%" data-action="zone-select" data-v="'+z.id+'" draggable="true" data-zone="'+z.id+'"><b>'+esc(z.name)+
    '</b><small>'+z.owner+' · '+z.visibility+'</small><span>'+z.kind+' · capacity '+z.capacity+'</span></button>').join("");
  const details=z.kind==="cards"?
    choose("Owner","zone:"+z.id+":owner",[["player","One for each player"],["shared","Shared"]],z.owner)+
    choose("Visibility","zone:"+z.id+":visibility",[["public","Public"],["owner","Owner only"],["hidden","Hidden from both players"]],z.visibility)+
    num("Cards dealt at setup","zone:"+z.id+":start",z.start,0,60):
    '<p class="muted">Unit zones are public and belong to each player. Assign cards to this zone in the card editor.</p>';
  return '<div class="tableWorkspace"><section class="box"><div class="line"><h2>Table layout</h2><div class="pieces">'+
    button("zone-add","＋ Unit zone","","units")+button("zone-add","＋ Card pile","","cards")+
    '</div></div><p class="muted">Drag zones or set coordinates in the inspector. Positions apply to each player’s half.</p><div id="tableCanvas">'+canvas+
    '</div><label>Field artwork<input type="file" data-image="fieldArt" accept="image/png,image/jpeg,image/webp"></label></section>'+
    '<section class="box"><h2>Zone properties</h2><div class="stack">'+field("Zone name","zone:"+z.id+":name",z.name)+
    num("Capacity","zone:"+z.id+":capacity",z.capacity,1,60)+details+'<div class="pair">'+num("Left %","zone:"+z.id+":x",z.x,0,90)+
    num("Top %","zone:"+z.id+":y",z.y,0,90)+'</div><div class="pair">'+num("Width %","zone:"+z.id+":w",z.w,10,100)+
    num("Height %","zone:"+z.id+":h",z.h,10,100)+'</div>'+button("zone-remove","Remove zone","",z.id)+
    '</div><p class="muted">Setup piles draw from their owner’s deck. Shared setup piles draw from your deck.</p></section></div>';
}
function attributeEditor() {
  return '<div class="two"><section class="box"><h2>Card types</h2><p class="muted">Types use unit or event behavior.</p><div class="stack">'+
    m.types.map(t=>'<fieldset>'+field("Type name","type:"+t.id+":name",t.name)+'<p>'+esc(t.behavior)+' behavior</p></fieldset>').join("")+
    button("type-add","＋ Unit type","","unit")+button("type-add","＋ Event type","","event")+
    '</div></section><section class="box"><h2>Custom attributes</h2><p class="muted">Add fields such as faction, level or element. Values appear on cards and are searchable in Decks.</p><div class="stack">'+
    m.attributes.map(a=>'<fieldset>'+field("Attribute name","attribute:"+a.id+":name",a.name)+'<p>'+a.type+'</p></fieldset>').join("")+
    button("attribute-add","＋ Text attribute","","text")+button("attribute-add","＋ Number attribute","","number")+'</div></section></div>';
}

const paceMs = {Slow: 2400, Normal: 1250, Fast: 470, Step: 0};
let pace = "Slow", logOpen=false, botTimer=0, animated=null;
try { const saved=localStorage.getItem("cgc-pace"); if(Object.hasOwn(paceMs,saved))pace=saved; } catch {}
const byId=id=>m.cards.find(c=>c.id===id);
function inspect(id){
  const c=byId(id);if(!c)return;
  modal('<div class="inspectCard">'+cardView(c)+'</div>');
}
function faceBack(label){return '<div class="cardback" aria-label="'+esc(label)+'"><span>✣</span></div>'}
function cardTile(c,action,value,cls="",contents=""){
  return '<button aria-label="'+esc(c.name)+'" class="tablecard '+cls+'" data-action="'+action+'" data-v="'+esc(value)+'" data-card="'+esc(c.id)+'">'+cardView(c)+contents+'</button>';
}
function animateClass(type,who,i){
  const v=s.visual;
  return animated!==v && v?.who===who && v?.index===i && v.type===type?' motion-'+type:'';
}
function rowUnits(p,who,zone){
  return '<div class="fieldcards">'+p.field.map((u,i)=>{
    if((u.zone||'field')!==zone)return '';
    const c=byId(u.id),cls=(u.ready?'':' resting')+['set','flip','attack'].map(t=>animateClass(t,who,i)).join('');
    if(u.hidden)return '<button class="tablecard hiddenunit '+cls+'" data-action="'+(who?'unknown':'unit')+'" data-v="'+i+'" '+(who?'':'data-card="'+c.id+'"')+'>'+faceBack('Face-down unit')+'<b class="unitstat">'+u.hp+' HP · '+(u.ready?'Ready':'Resting')+'</b></button>';
    return cardTile(c,who?'inspect':'unit',who?c.id:i,cls+(animated!==s.visual&&s.visual?.type==="play"&&s.visual.who===who&&s.visual.id===u.id&&i===p.field.length-1?' motion-play':''),'<b class="unitstat">'+u.hp+' HP · '+(u.ready?'Ready':'Resting')+'</b>');
  }).join('')+'</div>';
}
function tableArea(who) {
  return '<div class="liveTable">'+m.table.filter(z=>z.owner==="player"||who===1).map(z=>{
    const owner=z.owner==="shared"?"shared":String(who);
    const inner=z.kind==="units"?rowUnits(s.players[who],who,z.id):button("zone-inspect",String((owner==="shared"?s.shared[z.id]:s.players[who].zones[z.id])?.length||0)+" cards","",owner+":"+z.id);
    return '<section class="liveZone" style="left:'+z.x+'%;top:'+z.y+'%;width:'+z.w+'%;height:'+z.h+'%"><small>'+esc(z.name)+'</small>'+inner+'</section>';
  }).join("")+'</div>';
}
function seat(who){
  const p=s.players[who],rail=m.zones.filter(z=>z!=='field').map(z=>z==='discard'?button('pile','Discard '+p.discard.length,'pile',who):'<span>'+z+' <b>'+p[z].length+'</b></span>').join('');
  return '<div class="seat seat'+who+'"><div class="portrait"><span class="avatar">'+(who?'♜':'✦')+'</span><div><strong>'+(who?'George Card':'You')+'</strong><div class="vitals">♥ '+p.life+' &nbsp; ◈ '+p.energy+'</div></div></div>'+tableArea(who)+'<div class="rail">'+rail+'</div></div>';
}
function syncBot(){
  clearTimeout(botTimer);
  if(mode!=="Playtest"||!s||s.actor!==1||s.winner!==null||pace==="Step"||$("dialog").open)return;
  botTimer=setTimeout(nextBot,paceMs[pace]);
}
function performTracked(action){
  const result=applyTracked(m,tracked,action);
  history.push(tracked);tracked=result.bridge;s=tracked.legacy;
}
function nextBot(){
  if(mode!=="Playtest"||!s||s.actor!==1||s.winner!==null||$("dialog").open)return;
  try {
    tracked=trackedBot(m,tracked,bot).bridge;s=tracked.legacy;render();
  } catch(err){status("Opponent action failed: "+err.message);clearTimeout(botTimer);}

}
$("dialog").addEventListener("close",syncBot);
function battle(){
  if(!s)return '<section class="duelLobby"><div><small>PLAYTEST</small><h2>'+esc(m.name)+'</h2><p>Your deck against George Card.</p>'+choose('Your deck','active:0',m.savedDecks.map(d=>[d.id,d.name]),m.activeDecks[0])+choose('George’s deck','active:1',m.savedDecks.map(d=>[d.id,d.name]),m.activeDecks[1])+button('duel','Start duel','primary')+'</div><div class="lobbyCards">'+m.cards.slice(0,3).map(c=>cardView(c)).join('')+'</div></section>';
  const p=s.players[0],v=s.visual;
  const phase=s.winner!==null?(s.winner===0?'Victory':'Defeat'):s.pending?'Response window':s.actor===1?'George’s turn':'Your turn';
  const recent=s.log.at(-1);
  const spotlight=v?.id?'<div class="spotlight '+(animated!==v?'motion-play':'')+'">'+cardTile(byId(v.id),'inspect',v.id)+'</div>':'';
  const caption=v?.type==='play'?(v.who?'George plays ':'You play ')+byId(v.id).name+' · '+describe(byId(v.id)):recent;
  const styles=m.fieldArt?' style="--field-image:url('+m.fieldArt+')"':'';
  return '<section class="arena"'+styles+'><div class="arenaTools"><div><small>TURN '+s.round+' · '+esc(m.phases[s.phase||0].name)+'</small> <strong>'+phase+'</strong></div><div class="controls"><label>Speed <select id="pace">'+Object.keys(paceMs).map(k=>'<option '+(k===pace?'selected':'')+'>'+k+'</option>').join('')+'</select></label>'+button('log',logOpen?'Hide log':'Match log')+button('replay','Replay deal')+button('duel','New duel')+'</div></div>'+spotlight+seat(1)+'<div class="resolution" aria-live="polite">'+(v?.id?button('inspect',byId(v.id).name,'resolveCard',v.id):'')+'<span>'+esc(caption)+'</span></div>'+seat(0)+'<div class="handbar"><strong>Your hand · '+p.hand.length+'</strong><div>'+ (history.length?button('rewind','↶ Rewind'):'')+(s.winner===null?(s.actor===0?button('pass',s.pending?'Pass reaction':s.phase<m.phases.length-1?'Next phase':'End turn','primary'):pace==='Step'?button('step','Next opponent move','primary'):'<span class="thinking">George is playing…</span>'):'')+'</div></div><div class="cardhand">'+p.hand.map((id,i)=>cardTile(byId(id),'use',i,reason(m,s,0,i)?'unavailable':'playable')).join('')+'</div>'+(logOpen?'<aside class="logDrawer"><div class="line"><h2>Match log</h2>'+button('log','Close')+'</div><ol reversed>'+s.log.slice().reverse().map(l=>'<li>'+esc(l)+'</li>').join('')+'</ol></aside>':'')+'</section>';
}
function launch(practice = false, newSeed = true) {
  if (newSeed) seed = Math.floor(Math.random() * 2 ** 32);
  activateDecks(m);
  const issues=m.decks.flatMap((counts,i)=>deckIssues(m,counts,i).map(x=>(i?"George: ":"You: ")+x));
  if(issues.length)throw Error(issues.join(" "));
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
  tracked={legacy:state,...legacySnapshot(m,state)};
  s = tracked.legacy;
  history = [];
  mode = "Playtest";
  render();
}
function scorecard() {
  const categories={rules:"Game rules",design:"Card design",logic:"Card logic"};
  return '<section class="box"><div class="line"><h2>Compatibility catalog</h2><small>Version '+catalogVersion+' · '+benchmarks.length+
    ' scenarios</small></div><p>'+benchmarkScope+
    '</p><p>Targets apply independently to each game and category. Basic + Advanced ≥80%. Including scripting ≥95%. Coverage remains unmeasured while the catalog is provisional.</p>'+
    [...new Set(benchmarks.map(b=>b.game))].map(game=>'<details><summary>'+game+' · 12 pending</summary>'+
      Object.entries(categories).map(([category,label])=>'<h3>'+label+'</h3>'+
        benchmarks.filter(b=>b.game===game&&b.category===category).map(b=>
          '<details><summary>'+esc(b.title)+' · '+b.status+'</summary><p><b>Setup</b> '+esc(b.setup)+
          '</p><p><b>Expected</b> '+esc(b.expected)+'</p><p class="muted">'+esc(b.verification)+'</p></details>'
        ).join("")
      ).join("")+'</details>'
    ).join("")+'</section>';
}
function render() {
  document.body.dataset.mode=mode;
  $("title").textContent=m.name;
  $("modes").innerHTML=["Modules","Create","Decks","Play"].map(x=>button("mode",x,navMode()===x?"on":"",x==="Create"?"Workshop":x==="Play"?"Playtest":x)).join("");
  const sections=[["Cards","Workshop"],["Table","Table"],["Rules","Game setup"],["Types & attributes","Attributes"],["Benchmarks","Benchmarks"]];
  const tabs=navMode()==="Create"?'<div class="createNav">'+sections.map(([name,key])=>button("mode",name,mode===key?"on":"",key)).join("")+'</div>':"";
  root.innerHTML=tabs+(mode==="Modules"?moduleHome():mode==="Decks"?deckBuilder():mode==="Workshop"?workshop():mode==="Table"?tableEditor():mode==="Attributes"?attributeEditor():mode==="Game setup"?settings():mode==="Benchmarks"?scorecard():battle());
  animated=s?.visual;
  syncBot();
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

    case "module-new": $("new").click(); return;
    case "deck-new":
    case "deck-copy": {
      if (m.savedDecks.length>=100) throw Error("Maximum 100 saved decks.");
      const d=action==="deck-copy"?structuredClone(deckNow()):{name:"New deck",notes:"",counts:{}};
      if(action==="deck-copy") d.name+=" copy";
      d.id=uid();m.savedDecks.push(d);editDeck=d.id;edited();return;
    }
    case "deck-delete-prompt":
      if(m.savedDecks.length===1)throw Error("Keep at least one deck.");
      modal("<h2>Delete "+esc(deckNow().name)+"?</h2><p>This removes the saved deck list.</p>"+button("deck-delete","Delete deck"));return;
    case "deck-delete": {
      const id=deckNow().id;
      m.savedDecks=m.savedDecks.filter(d=>d.id!==id);
      editDeck=m.savedDecks[0].id;
      m.activeDecks=m.activeDecks.map(x=>x===id?editDeck:x);
      $("dialog").close();edited();return;
    }
    case "deck-add":
    case "deck-minus": {
      if(!m.cards.some(c=>c.id===v))throw Error("Card unavailable.");
      const d=deckNow(),n=d.counts[v]||0;
      if(action==="deck-add"&&n>=30)throw Error("Maximum 30 copies in storage.");
      d.counts[v]=Math.max(0,n+(action==="deck-add"?1:-1));edited();return;
    }
    case "deck-view":deckView=deckView==="gallery"?"compact":"gallery";break;
    case "deck-test":m.activeDecks[0]=deckNow().id;activateDecks(m);persist();launch();return;
    case "zone-select":zoneSelected=v;break;
    case "zone-add": {
      if(m.table.length>=20)throw Error("Maximum 20 zones.");
      const z={id:uid(),name:v==="units"?"New unit zone":"New card pile",kind:v,capacity:5,start:0,owner:"player",visibility:"public",x:10,y:10,w:35,h:35};
      m.table.push(z);zoneSelected=z.id;edited();return;
    }
    case "zone-remove": {
      const remaining=m.table.filter(z=>z.id!==v);
      if(!remaining.some(z=>z.kind==="units"))throw Error("Keep at least one unit zone.");
      modal("<h2>Remove zone?</h2><p>Assigned cards will use "+esc(remaining.find(z=>z.kind==="units").name)+".</p>"+button("zone-remove-confirm","Remove zone","",v));return;
    }
    case "zone-remove-confirm":
      m.table=m.table.filter(z=>z.id!==v);
      for(const c of m.cards)if(c.zone===v)c.zone=m.table.find(z=>z.kind==="units").id;
      zoneSelected=m.table[0].id;$("dialog").close();edited();return;
    case "phase-add":
      if(m.phases.length>=12)throw Error("Maximum 12 phases.");
      m.phases.push({id:uid(),name:"New phase",play:true,attack:true});edited();return;
    case "phase-remove":
      if(m.phases.length<2||!m.phases.some((p,i)=>i!==+v&&p.play))throw Error("Keep a phase that permits playing cards.");
      m.phases.splice(+v,1);edited();return;
    case "phase-up":
    case "phase-down": {
      const i=+v,j=i+(action==="phase-up"?-1:1);
      if(j>=0&&j<m.phases.length)m.phases.splice(j,0,m.phases.splice(i,1)[0]);
      edited();return;
    }
    case "type-add":
      if(m.types.length>=30)throw Error("Maximum 30 card types.");
      m.types.push({id:uid(),name:"New "+v+" type",behavior:v});edited();return;
    case "attribute-add":
      if(m.attributes.length>=30)throw Error("Maximum 30 attributes.");
      m.attributes.push({id:uid(),name:"New attribute",type:v});edited();return;
    case "zone-inspect": {
      const [owner,id]=v.split(":"),z=m.table.find(z=>z.id===id);
      const cards=owner==="shared"?s.shared[id]:s.players[+owner].zones[id];
      const visible=z.visibility==="public"||(z.visibility==="owner"&&owner==="0");
      modal("<h2>"+esc(z.name)+" · "+cards.length+"</h2>"+(visible?'<div class="stack">'+cards.map(id=>button("inspect",byId(id).name,"",id)).join("")+"</div>":"<p>These cards are hidden.</p>"));return;
    }

    case "mode":
      mode = v;if(v==="Modules")refreshModules();
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
      x.zone=m.table.find(z=>z.kind==="units").id;
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
      for (const d of m.savedDecks) delete d.counts[selected];
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
    case "inspect":inspect(v);return;
    case "unknown":status("George’s face-down unit has 2 base HP. Its identity is hidden.");return;
    case "log":logOpen=!logOpen;break;
    case "step":nextBot();return;
    case "pile":modal('<h2>Discard pile</h2><div class="stack">'+(s.players[+v].discard.map(id=>button('inspect',byId(id).name,'',id)).join('')||'Empty')+'</div>');return;
    case "unit":{
      const u=s.players[0].field[+v],card=byId(u.id);
      const can=u.ready&&!s.pending&&s.actor===0&&s.turn===0&&s.winner===null;
      modal('<h2>'+esc(card.name)+'</h2><p>'+u.hp+' HP · '+(u.ready?'Ready':'Resting')+'</p><div class="stack">'+button('inspect','Inspect card','',card.id)+(can?(u.hidden?button('flip','Reveal unit','primary',v):(m.phases[s.phase||0].attack?card.attacks:[]).map((a,j)=>button('target',a.name+' · '+a.power+' damage · '+a.cost+' energy','',''+v+':'+j)).join('')):'')+'</div>');return;
    }
    case "flip":{performTracked({type:"reveal",actor:0,id:trackedFieldId(tracked,s,0,+v)});$("dialog").close();break;}
    case "target":{
      const [i,j]=v.split(":").map(Number),a=byId(s.players[0].field[i].id).attacks[j];
      if(a.cost>s.players[0].energy){modal("<h2>Insufficient energy</h2><p>This attack costs "+a.cost+" energy.</p>");return}
      const q=s.players[1],targets=legalTargets(m,s,0);
      modal('<h2>'+esc(a.name)+'</h2><p>Choose a target · '+a.power+' damage</p><div class="stack">'+targets.map(t=>{
        const hp=t===-1?q.life:q.field[t].hp;
        const name=t===-1?"George Card":q.field[t].hidden?"Face-down unit":byId(q.field[t].id).name;
        return button("attack",name+" · "+hp+" → "+Math.max(0,hp-a.power)+(t===-1?" life":" HP"),"",v+":"+t);
      }).join("")+'</div>');return;
    }
    case "attack": {
      const [index,move,target]=v.split(":").map(Number);
      performTracked({type:"attack",actor:0,id:trackedFieldId(tracked,s,0,index),move,target});
      $("dialog").close();

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
      performTracked(action==="use"?{type:"play",actor:0,id:tracked.state.zones["base-0-hand"].cards[+v]}:{type:"pass",actor:0});

      break;
    }
    case "rewind":
      if (history.length){tracked=history.pop();s=tracked.legacy;}
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
let pressTimer=0,suppressClick=0,pressStart=null;
function clearPress(){clearTimeout(pressTimer);pressStart=null}
root.addEventListener("contextmenu",e=>{const el=e.target.closest("[data-card]");if(el){e.preventDefault();inspect(el.dataset.card)}});
root.addEventListener("pointerdown",e=>{const el=e.target.closest("[data-card]");if(!el||e.pointerType==="mouse")return;clearPress();pressStart=[e.clientX,e.clientY];pressTimer=setTimeout(()=>{suppressClick=performance.now()+1000;inspect(el.dataset.card)},500)});
root.addEventListener("pointermove",e=>{if(pressStart&&Math.hypot(e.clientX-pressStart[0],e.clientY-pressStart[1])>10)clearPress()});
for(const event of ["pointerup","pointercancel"])document.addEventListener(event,clearPress);
document.addEventListener("click", (e) => {
  if(performance.now()<suppressClick){e.preventDefault();return}
  const b = e.target.closest("[data-action]");
  if (b) {
    status();
    dispatch(b.dataset.action, b.dataset.v).catch((err) => status(err.message));
  }
});
root.oninput = (e) => {
  if(e.target.id==="deckSearch"){
    const position=e.target.selectionStart;
    deckSearch=e.target.value;render();
    $("deckSearch").focus();$("deckSearch").setSelectionRange(position,position);return;
  }
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
  if(e.target.id==="pace"){pace=e.target.value;try{localStorage.setItem("cgc-pace",pace)}catch{} render();return;}
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
    if(k==="selectedDeck"){editDeck=value;render();return}
    if(k==="deckFilter"||k==="deckSort"){if(k==="deckFilter")deckFilter=value;else deckSort=value;render();return}
    if(k==="deckName")deckNow().name=value;
    else if(k==="deckNotes")deckNow().notes=value;
    else if(k==="description")m.description=value;
    else if(k==="cardType"){c.type=value;c.kind=m.types.find(t=>t.id===value).behavior;}
    else if(k.startsWith("value:"))c.values[k.slice(6)]=value;
    else if(k.startsWith("active:"))m.activeDecks[+k.split(":")[1]]=value;
    else if(k.startsWith("limit:"))m.deckRules[k.split(":")[1]]=value;
    else if(k.startsWith("phase:")){const [,i,prop]=k.split(":");m.phases[i][prop]=prop==="name"?value:value==="yes";}
    else if(k.startsWith("zone:")){const [,id,prop]=k.split(":");m.table.find(z=>z.id===id)[prop]=value;}
    else if(k.startsWith("type:")){const [,id,prop]=k.split(":");m.types.find(t=>t.id===id)[prop]=value;}
    else if(k.startsWith("attribute:")){const [,id,prop]=k.split(":");m.attributes.find(t=>t.id===id)[prop]=value;}
    else if (k === "module") m.name = value;
    else if (Object.hasOwn(m.rules, k)) m.rules[k] = value;
    else if(k==="guard") c.guard=value==="yes";
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
  const deck=e.target.closest("[data-deckcard]"),zone=e.target.closest("[data-zone]");
  if(deck){e.dataTransfer.setData("text/plain",JSON.stringify({card:deck.dataset.deckcard}));return}
  if(zone){e.dataTransfer.setData("text/plain",JSON.stringify({zone:zone.dataset.zone}));return}
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
  if (e.target.closest("#drop,[data-order],#deckDrop,#tableCanvas")) e.preventDefault();
};
root.ondrop = (e) => {
  e.preventDefault();
  try {
    const data = JSON.parse(e.dataTransfer.getData("text/plain")),
      row = e.target.closest("[data-order]");
    if(data.card&&m.cards.some(c=>c.id===data.card)&&e.target.closest("#deckDrop")){
      dispatch("deck-add",data.card).catch(err=>status(err.message));return;
    }
    if(data.zone&&e.target.closest("#tableCanvas")){
      const z=m.table.find(z=>z.id===data.zone),rect=$("tableCanvas").getBoundingClientRect();
      if(z){
        z.x=Math.round(Math.max(0,Math.min(100-z.w,(e.clientX-rect.left)/rect.width*100-z.w/2)));
        z.y=Math.round(Math.max(0,Math.min(100-z.h,(e.clientY-rect.top)/rect.height*100-z.h/2)));
        edited();
      }
      return;
    }
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
upgrade(m);editDeck=m.savedDecks[0].id;
persist();
render();
refreshModules();
