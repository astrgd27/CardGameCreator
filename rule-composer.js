// Visual rules compile to the runtime's existing validated effect instructions.
export const ruleSteps = {
 exhaust: "Exhaust a chosen card",
 ready: "Ready a chosen card",
 draw: "Draw cards",
 restore: "Restore a resource"
};

export function compileWorkshopRules(module) {
 const rules = module.workshopRules;
 if (rules === undefined) return module;
 if (!Array.isArray(rules) || rules.length > 20) throw Error("Use at most 20 composed rules.");
 const seen = new Set();
 for (const rule of rules) {
  if (!rule || typeof rule.id !== "string" || !/^rule-[a-f0-9-]{36}$/.test(rule.id) || seen.has(rule.id)) throw Error("Invalid composed rule.");
  seen.add(rule.id);
  if (typeof rule.name !== "string" || !rule.name.trim() || rule.name.length > 70) throw Error("Each composed rule needs a name.");
  if (!module.definitions.includes(rule.card)) throw Error(rule.name + " needs a source card.");
  if (!Array.isArray(rule.steps) || !rule.steps.length || rule.steps.length > 8) throw Error(rule.name + " needs between one and eight steps.");
  const zones = (module.combat?.zones ?? []).filter(id => module.zones.some(zone => zone.id === id && zone.visibility === "public"));
  if (!zones.length) throw Error(rule.name + " needs a public battlefield.");
  function resource(id) {
   if (!module.resources?.some(r => r.id === id)) throw Error(rule.name + " needs a valid resource.");
   return id;
  }
  if (!Number.isInteger(rule.cost) || rule.cost < 0 || rule.cost > 100) throw Error(rule.name + " has an invalid cost.");
  const costs = rule.cost ? [{resource: resource(rule.resource), kind: "spend", amount: rule.cost}] : [];
  for (const [seat, actor] of module.players.entries()) {
   const id = rule.id + "-" + seat;
   const existing = module.effects[id];
   if (existing && existing.workshopRule !== rule.id) throw Error("A composed rule conflicts with an existing ability.");
   const program = [];

   for (const [index, step] of rule.steps.entries()) {
    if (!step || !Object.hasOwn(ruleSteps, step.type)) throw Error(rule.name + " has an unsupported step.");
    if (step.type === "exhaust" || step.type === "ready") {
     if (!["self","opponent","any"].includes(step.controller)) throw Error(rule.name + " has an invalid target side.");
     const selector = {zones, controller: step.controller, face: "up", orientation: step.type === "exhaust" ? "ready" : "resting"};
     const name = "choose-card-" + (index + 1);
     program.push({type:"target",name,selector}, {type:"orient",choice:name,orientation:step.type === "exhaust" ? "resting" : "ready"});
    } else {
     if (!Number.isInteger(step.amount) || step.amount < 1 || step.amount > 20) throw Error(rule.name + " has an invalid step amount.");
     if (step.type === "draw") {
      const draw = module.drawPolicies?.find(policy => policy.player === actor);
      if (!draw) throw Error(rule.name + " requires a draw pile and hand for every player.");
      program.push({type:"draw",from:draw.deck,to:draw.hand,count:step.amount});
     } else program.push({type:"resource",resource:resource(step.resource),delta:step.amount,overflow:"clamp"});
    }
   }
   module.effects[id] = {
    ...existing, workshopRule:rule.id, label:rule.name.trim(), available:true, activeOnly:true, actors:[actor],
    sourceDefinition:rule.card, sourceZones:zones, windows:["main"], limit:{scope:"turn",count:1},
    costs, program, requireInitialTarget:program[0].type==="target"
   };
  }
 }
 return module;
}
