import {test,expect} from "@playwright/test";
test("v2 graphical editor validates changes and exports a module",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/module-editor.html");
 await page.getByRole("button",{name:"Validate module"}).click();
 await expect(page.locator("#editor-status")).toContainText("passed");
 await page.locator("#editor-fields summary").filter({hasText:/^Resources$/}).click();
 await page.getByLabel("Initial 1",{exact:true}).fill("4");
 await page.getByLabel("Initial 1",{exact:true}).press("Tab");
 await page.locator("#editor-fields summary").filter({hasText:/^Combat$/}).click();
 await page.getByLabel("Attack sentinel",{exact:true}).fill("3");
 await page.getByLabel("Attack sentinel",{exact:true}).press("Tab");
 await page.getByRole("button",{name:"Validate module"}).click();
 await expect(page.locator("#editor-status")).toContainText("passed");
 const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export JSON"}).click();
 expect((await download).suggestedFilename()).toBe("tcg-module-v2.json");
 expect(errors).toEqual([]);
});
test("effect, trigger and victory controls modify module data",async({page})=>{
 await page.goto("/module-editor.html");
 await page.locator("#editor-fields summary").filter({hasText:/^Effects$/}).click();
 await page.getByRole("button",{name:"Add effect",exact:true}).click();
 await expect(page.locator("legend").filter({hasText:/^effect1$/})).toBeVisible();
 await page.locator("#editor-fields summary").filter({hasText:/^Triggers$/}).click();
 await page.getByRole("button",{name:"Add trigger",exact:true}).click();
 await page.locator("#editor-fields summary").filter({hasText:/^Victory conditions$/}).click();
 await page.getByRole("button",{name:"Add condition",exact:true}).click();
 await page.getByLabel("Condition type",{exact:true}).selectOption("resourceAtMost");
 await page.getByRole("button",{name:"Validate module"}).click();
 await expect(page.locator("#editor-status")).toContainText("passed");
 const m=JSON.parse(await page.locator("#source").inputValue());
 expect(m.effects.effect1.program).toEqual([]);
 expect(m.triggers.length).toBe(3);
 expect(m.victory[0].type).toBe("resourceAtMost");
});

test("custom module library survives reload and launches a playable match",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/module-editor.html");
 await page.getByLabel("Module name").fill("Library Test Duel");
 await page.getByRole("button",{name:"Save",exact:true}).click();
 await expect(page.locator("#editor-status")).toContainText("saved locally");
 await page.reload();
 await expect(page.locator("#library option")).toHaveText("Library Test Duel");
 page.once("dialog",d=>d.accept());
 await page.getByRole("button",{name:"Load",exact:true}).click();
 await expect(page.getByLabel("Module name")).toHaveValue("Library Test Duel");
 await page.getByRole("button",{name:"Playtest module"}).click();
 await expect(page.getByRole("heading",{name:"Library Test Duel",exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Sentinel c1",exact:true})).toHaveCount(1);
 await expect(page.getByRole("button",{name:"Raider c6",exact:true})).toHaveCount(0);
 await page.getByRole("button",{name:"musterA",exact:true}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await expect(page.getByRole("heading",{name:"field · 5",exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});
test("workshop exposes generalized module editor",async({page})=>{
 await page.goto("/");
 await page.locator("#modes").getByRole("button",{name:"Play",exact:true}).click();
 await page.getByRole("link",{name:"Generalized module editor",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Generalized module editor"})).toBeVisible();
});

test("card designer and deck builder propagate to a custom match",async({page})=>{
 await page.goto("/module-editor.html");
 await page.locator("#editor-fields summary").filter({hasText:/^Card designer$/}).click();
 await page.getByLabel("Display name sentinel",{exact:true}).fill("Iron Guardian");
 await page.getByLabel("Rules text sentinel",{exact:true}).fill("Protect the gate.");
 await page.locator("#editor-fields summary").filter({hasText:/^Deck construction$/}).click();
 await page.getByRole("button",{name:"Add deck",exact:true}).click();
 await page.getByRole("button",{name:"Add deck card",exact:true}).click();
 await page.getByRole("button",{name:"Validate deck",exact:true}).click();
 await expect(page.getByText("Deck is legal.",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Append deck to starting setup"}).click();
 await expect(page.locator("#editor-status")).toContainText("Deck appended");
 await page.getByRole("button",{name:"Playtest module"}).click();
 const card=page.getByRole("button",{name:"Iron Guardian c1",exact:true});
 await card.click({button:"right"});
 await expect(page.locator(".duel-inspector")).toContainText("Protect the gate.");
});
test("advanced rule controls serialize engine policies",async({page})=>{
 await page.goto("/module-editor.html");
 await page.locator("#editor-fields summary").filter({hasText:/^Attachments$/}).click();
 await page.getByLabel("Maximum attachments",{exact:true}).fill("2");
 await page.locator("#editor-fields summary").filter({hasText:/^Chains$/}).click();
 await page.getByRole("button",{name:"Enable chain",exact:true}).click();
 await page.getByLabel("Maximum chain links",{exact:true}).fill("5");
 await page.locator("#editor-fields summary").filter({hasText:/^Continuous modifiers$/}).click();
 await page.getByRole("button",{name:"Add modifier",exact:true}).click();
 await page.getByLabel("Modifier value",{exact:true}).fill("2");
 await page.locator("#editor-fields summary").filter({hasText:/^Damage replacements$/}).click();
 await page.getByRole("button",{name:"Add replacement",exact:true}).click();
 await page.getByRole("button",{name:"Validate module"}).click();
 await expect(page.locator("#editor-status")).toContainText("passed");
 const m=JSON.parse(await page.locator("#source").inputValue());
 expect(m.attachment.max).toBe(2);expect(m.chain.maxLinks).toBe(5);
 expect(m.combat.modifiers[0].value).toBe(2);expect(m.combat.replacements[0].op).toBe("prevent");
});

test("custom layout and mulligan policy carry into play",async({page})=>{
 await page.goto("/module-editor.html");
 const source=page.locator("#source"),m=JSON.parse(await source.inputValue());
 m.zones.push({id:"deck-a",owner:"a",visibility:"hidden",capacity:10});
 for(const definition of ["sentinel","raider","blade"])m.setup.push({definition,owner:"a",zone:"deck-a"});
 m.drawPolicies=[{player:"a",deck:"deck-a",hand:"hand-a",opening:2,perTurn:1,shuffle:true,mulligans:1,mulliganPenalty:1}];
 await page.locator("summary").filter({hasText:/^Advanced module JSON$/}).click();
 await source.fill(JSON.stringify(m));
 await page.getByRole("button",{name:"Apply JSON changes"}).click();
 await page.locator("#editor-fields summary").filter({hasText:/^Draw and mulligan policies$/}).click();
 await expect(page.getByLabel("Opening hand size",{exact:true})).toHaveValue("2");
 await page.locator("#editor-fields summary").filter({hasText:/^Battlefield layout$/}).click();
 await page.getByRole("button",{name:"Configure battlefield"}).click();
 await page.getByLabel("Zone label",{exact:true}).first().fill("Arena");
 await page.getByRole("button",{name:"Playtest module"}).click();
 await expect(page.getByRole("heading",{name:"Arena · 4",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Mulligan",exact:true}).click();
 await expect(page.getByRole("heading",{name:"hand-a · 2",exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Pass priority"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"deck-a · 2",exact:true})).toBeVisible();
});

test("graphical phase configuration reaches custom gameplay",async({page})=>{
 await page.goto("/module-editor.html");
 await page.locator("#editor-fields summary").filter({hasText:/^Turn phases$/}).click();
 await page.getByRole("button",{name:"Configure turn phases"}).click();
 await page.getByLabel("Phase ID",{exact:true}).fill("prepare");
 await page.getByLabel("Allow attack",{exact:true}).selectOption("no");
 await page.getByRole("button",{name:"Add phase",exact:true}).click();
 await page.getByLabel("Phase ID",{exact:true}).last().fill("battle");
 await page.getByRole("button",{name:"Playtest module"}).click();
 await expect(page.getByText("Phase: prepare",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await page.getByRole("button",{name:"Next phase",exact:true}).click();
 await expect(page.getByText("Phase: battle",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Play vs computer"})).toBeVisible();
});

test("campaign editor launches encounters and persists completion",async({page})=>{
 await page.goto("/module-editor.html");
 await page.locator("#editor-fields summary").filter({hasText:/^Campaign builder$/}).click();
 await page.getByRole("button",{name:"Create campaign",exact:true}).click();
 await page.getByRole("button",{name:"Add encounter",exact:true}).click();
 await page.getByLabel("Encounter name",{exact:true}).fill("The first trial");
 await page.getByLabel("Encounter rule overrides 1").fill(JSON.stringify({victory:[{type:"emptyZone",player:"b",zone:"discard-b"}]}));
 await page.getByRole("button",{name:"Apply encounter overrides"}).click();
 await page.getByRole("button",{name:"Validate campaign"}).click();
 await expect(page.locator("#editor-status")).toContainText("Campaign passed");
 await page.getByRole("button",{name:"Play campaign",exact:true}).click();
 await expect(page.getByRole("heading",{name:"The first trial"})).toBeVisible();
 await page.getByRole("button",{name:"Continue campaign"}).click();
 await expect(page.getByRole("heading",{name:"Campaign complete"})).toBeVisible();
 await page.reload();
 await expect(page.getByRole("heading",{name:"Campaign complete"})).toBeVisible();
});

test("campaign route and reward controls persist a selected branch",async({page})=>{
 await page.goto("/module-editor.html");
 const source=page.locator("#source"),m=JSON.parse(await source.inputValue());
 m.zones.push({id:"deck-a",owner:"a",visibility:"hidden",capacity:10});
 const overrides={victory:[{type:"emptyZone",player:"b",zone:"discard-b"}]};
 m.campaign={id:"branch-test",player:"a",rewardZone:"deck-a",encounters:[{id:"start",name:"Crossroads",overrides,routes:[{to:"left",label:"Left path"},{to:"right",label:"Right path"}],rewards:[{definition:"sentinel",count:1}]},{id:"left",name:"Forest",overrides},{id:"right",name:"Castle",overrides}]};
 await page.locator("summary").filter({hasText:/^Advanced module JSON$/}).click();
 await source.fill(JSON.stringify(m));await page.getByRole("button",{name:"Apply JSON changes"}).click();
 await page.locator("#editor-fields summary").filter({hasText:/^Campaign builder$/}).click();
 await expect(page.getByLabel("Route label",{exact:true}).first()).toHaveValue("Left path");
 await expect(page.getByLabel("Reward copies",{exact:true}).first()).toHaveValue("1");
 await page.getByRole("button",{name:"Play campaign",exact:true}).click();
 await page.getByRole("button",{name:"Right path",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Castle",exact:true})).toBeVisible();
 await expect(page.getByRole("heading",{name:"deck-a · 1",exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole("heading",{name:"Castle",exact:true})).toBeVisible();
});

test("visual deck workshop edits a draft and returns it to the module editor",async({page})=>{
 await page.goto("/module-editor.html");
 await page.getByLabel("Module name").fill("Workshop test");
 await page.locator("#editor-fields summary").filter({hasText:/^Deck construction$/}).click();
 await page.getByRole("button",{name:"Open visual deck workshop"}).click();
 await expect(page.getByRole("heading",{name:"Deck workshop",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"New deck",exact:true}).click();
 await page.getByLabel("Name",{exact:true}).fill("Guardians");
 await page.getByLabel("Search",{exact:true}).fill("sentinel");
 await expect(page.locator("#card-gallery article")).toHaveCount(1);
 await page.getByRole("button",{name:"Add sentinel",exact:true}).click();
 await page.getByRole("button",{name:"Add copy of sentinel",exact:true}).click();
 await expect(page.locator("#deck-stats")).toContainText("2 cards");
 await page.getByRole("button",{name:"Validate deck",exact:true}).click();
 await expect(page.locator("#deck-error")).toHaveText("Deck is legal.");
 await page.getByRole("button",{name:"Apply to module editor"}).click();
 await expect(page.getByLabel("Module name")).toHaveValue("Workshop test");
 const m=JSON.parse(await page.locator("#source").inputValue());
 expect(m.decks[0].name).toBe("Guardians");expect(m.decks[0].cards).toEqual([{definition:"sentinel",count:2}]);
});
test("gameplay announces actions and highlights potential targets",async({page})=>{
 await page.goto("/duel.html");
 await page.getByRole("button",{name:"Sentinel c1",exact:true}).click();
 await expect(page.getByRole("button",{name:"Raider c2",exact:true})).toHaveClass(/potential-target/);
 await page.getByRole("button",{name:"Attack raider c2",exact:true}).click();
 await expect(page.locator(".action-banner")).toContainText("Player A attacked with Sentinel");
});

test("direct targeting and persistent gameplay settings",async({page})=>{
 await page.goto("/duel.html");
 await page.getByRole("button",{name:"Gameplay settings",exact:true}).click();
 await page.getByLabel("Animation speed",{exact:true}).selectOption("off");
 await page.getByLabel("Card scale",{exact:true}).selectOption("large");
 await page.getByRole("button",{name:"Save settings",exact:true}).click();
 await expect(page.locator("#duel")).toHaveAttribute("data-scale","large");
 await page.reload();
 await expect(page.locator("#duel")).toHaveAttribute("data-scale","large");
 await page.getByRole("button",{name:"Sentinel c1",exact:true}).click();
 await expect(page.getByRole("button",{name:"Raider c2",exact:true})).toHaveClass(/legal-target/);
 await page.getByRole("button",{name:"Raider c2",exact:true}).click();
 await expect(page.locator(".action-banner")).toContainText("attacked with Sentinel");
});
test("module card frames and tabletop themes carry into gameplay",async({page})=>{
 await page.goto("/module-editor.html");
 await page.locator("#editor-fields summary").filter({hasText:/^Card designer$/}).click();
 await page.getByLabel("Card frame sentinel",{exact:true}).selectOption("gold");
 await page.locator("#editor-fields summary").filter({hasText:/^Battlefield layout$/}).click();
 await page.getByLabel("Tabletop theme",{exact:true}).selectOption("midnight");
 await page.getByLabel("Card back design",{exact:true}).selectOption("rune");
 await page.getByRole("button",{name:"Playtest module"}).click();
 await expect(page.locator("#duel")).toHaveAttribute("data-theme","midnight");
 await expect(page.locator("#duel")).toHaveAttribute("data-back","rune");
 await expect(page.getByRole("button",{name:"Sentinel c1",exact:true})).toHaveAttribute("data-frame","gold");
});

test("card state effects display counters, statuses and tokens in play",async({page})=>{
 await page.goto("/module-editor.html");
 const source=page.locator("#source"),m=JSON.parse(await source.inputValue());
 m.effects.state={available:true,actors:["a"],program:[{type:"counter",id:"c1",counter:"charge",delta:2},{type:"status",id:"c1",status:"stunned",operation:"add"},{type:"token",definition:"blade",zone:"field",count:1}]};
 await page.locator("summary").filter({hasText:/^Advanced module JSON$/}).click();
 await source.fill(JSON.stringify(m));await page.getByRole("button",{name:"Apply JSON changes"}).click();
 await page.getByRole("button",{name:"Playtest module"}).click();
 await page.getByRole("button",{name:"state",exact:true}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await expect(page.getByRole("button",{name:"Sentinel c1",exact:true})).toContainText("charge ×2");
 await expect(page.getByRole("button",{name:"Sentinel c1",exact:true})).toContainText("stunned");
 await expect(page.getByRole("button",{name:"Blade c7",exact:true})).toContainText("Token");
});

test("alternative card payment and source ability reach gameplay",async({page})=>{
 await page.goto("/module-editor.html");
 const source=page.locator("#source"),m=JSON.parse(await source.inputValue());
 m.effects.power={available:true,sourceDefinition:"sentinel",sourceZones:["field"],limit:{scope:"match",count:1},costs:[{resource:"energy",amount:5,kind:"spend"}],alternatives:[{id:"sacrifice",cardCosts:[{kind:"sacrifice",from:"field",to:"discard-a",count:1}]}],program:[{type:"counter",choice:"source",counter:"power",delta:2}]};
 await page.locator("summary").filter({hasText:/^Advanced module JSON$/}).click();
 await source.fill(JSON.stringify(m));await page.getByRole("button",{name:"Apply JSON changes"}).click();
 await page.getByRole("button",{name:"Playtest module"}).click();
 await page.getByRole("button",{name:"power · Sentinel c1 · sacrifice",exact:true}).click();
 await page.getByLabel("sacrifice 1",{exact:true}).selectOption("c3");
 await page.getByRole("button",{name:"Pay and activate"}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await expect(page.getByRole("button",{name:"Sentinel c1",exact:true})).toContainText("power ×2");
 await expect(page.getByRole("button",{name:"power · Sentinel c1 · sacrifice",exact:true})).toHaveCount(0);
});

test("group combat editor configures direct attacks and blocking",async({page})=>{
 await page.goto("/module-editor.html");
 await page.locator("#editor-fields summary").filter({hasText:/^Combat$/}).click();
 await page.getByLabel("Combat mode",{exact:true}).selectOption("group");
 await page.getByLabel("Direct attack resource",{exact:true}).selectOption("energy");
 await page.getByRole("button",{name:"Playtest module"}).click();
 await page.getByLabel("Attack with Sentinel c1",{exact:true}).selectOption("player:b");
 await page.getByRole("button",{name:"Declare attackers",exact:true}).click();
 await expect(page.getByLabel("Block with Raider c2",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Resolve combat",exact:true}).click();
 await expect(page.locator(".action-banner")).toContainText("assigned 0 blockers");
});

test("AI editor configures profiles and reports bounded simulations",async({page})=>{
 await page.goto("/module-editor.html");
 await page.locator("#editor-fields summary").filter({hasText:/^Opponent AI$/}).click();
 await page.getByLabel("AI difficulty",{exact:true}).selectOption("hard");
 await page.getByLabel("AI personality",{exact:true}).selectOption("aggressive");
 await page.getByRole("button",{name:"Run 3 AI simulations"}).click();
 await expect(page.locator("#editor-fields pre").filter({hasText:"meanActions"})).toBeVisible();
 await page.getByRole("button",{name:"Playtest module"}).click();
 await page.getByRole("button",{name:"Gameplay settings",exact:true}).click();
 await expect(page.getByLabel("Opponent difficulty",{exact:true})).toHaveValue("hard");
 await expect(page.getByLabel("Opponent personality",{exact:true})).toHaveValue("aggressive");
});

test("keyword editor and deck policy authoring serialize to module",async({page})=>{
 await page.goto("/module-editor.html");
 await page.locator("#editor-fields summary").filter({hasText:/^Keywords and passives$/}).click();
 await page.getByRole("button",{name:"Add keyword",exact:true}).click();
 await page.getByLabel("cannotAttack",{exact:true}).selectOption("yes");
 await page.getByLabel("Keywords sentinel",{exact:true}).fill("keyword1");
 await page.getByRole("button",{name:"Add passive",exact:true}).click();
 await page.getByLabel("Aura value",{exact:true}).fill("2");
 await page.locator("#editor-fields summary").filter({hasText:/^Deck construction$/}).click();
 await page.getByLabel("Banned definitions",{exact:true}).fill("raider");
 await page.getByRole("button",{name:"Validate module"}).click();
 await expect(page.locator("#editor-status")).toContainText("passed");
 const m=JSON.parse(await page.locator("#source").inputValue());expect(m.keywordRules.keywords.keyword1.restrictions).toEqual(["cannotAttack"]);expect(m.keywordRules.passives[0].value).toBe(2);expect(m.deckRules.banned).toEqual(["raider"]);
});

test("dynamic payment dialog cancels before resources or cards change",async({page})=>{
 await page.goto("/module-editor.html");
 const source=page.locator("#source"),m=JSON.parse(await source.inputValue());
 m.effects.cast={available:true,sourceDefinition:"sentinel",sourceZones:["hand-a"],dynamicPayment:{modes:["deploy"],variable:{resource:"energy",min:1,max:2}},program:[{type:"move",choice:"source",from:"hand-a",to:"field"}]};
 await page.locator("summary").filter({hasText:/^Advanced module JSON$/}).click();
 await source.fill(JSON.stringify(m));await page.getByRole("button",{name:"Apply JSON changes"}).click();
 await page.getByRole("button",{name:"Playtest module"}).click();
 await page.getByRole("button",{name:"cast · Sentinel c5",exact:true}).click();
 await page.getByLabel("Variable amount",{exact:true}).fill("2");
 await page.getByRole("button",{name:"Cancel",exact:true}).click();
 await expect(page.getByRole("button",{name:"cast · Sentinel c5",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"cast · Sentinel c5",exact:true}).click();
 await page.getByRole("button",{name:"Pay and activate"}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await expect(page.getByRole("button",{name:"cast · Sentinel c5",exact:true})).toHaveCount(0);
});

test("composite recipe appears as a layered card in gameplay",async({page})=>{
 await page.goto("/module-editor.html");
 const source=page.locator("#source"),m=JSON.parse(await source.inputValue());
 m.stackRules=[{id:"evolve",hostDefinition:"sentinel",materialDefinition:"sentinel",hostZones:["field"],materialZones:["hand-a"],resultDefinition:"raider",inherit:true}];
 await page.locator("summary").filter({hasText:/^Advanced module JSON$/}).click();
 await source.fill(JSON.stringify(m));await page.getByRole("button",{name:"Apply JSON changes"}).click();
 await page.getByRole("button",{name:"Playtest module"}).click();
 await page.getByRole("button",{name:"Stack Sentinel c5 on Sentinel c1",exact:true}).click();
 await expect(page.getByRole("button",{name:"Raider c1",exact:true})).toHaveClass(/composite-card/);
 await expect(page.getByRole("button",{name:"Raider c1",exact:true})).toContainText("Stack ×2");
});

test("hidden search offers named cards in private decision interface",async({page})=>{
 await page.goto("/module-editor.html");
 const source=page.locator("#source"),m=JSON.parse(await source.inputValue());
 m.zones.push({id:"deck-a",owner:"a",visibility:"hidden",capacity:10});m.setup.push({definition:"blade",owner:"a",zone:"deck-a",face:"down"});
 m.effects.search={available:true,actors:["a"],program:[{type:"search",name:"found",zone:"deck-a"},{type:"move",choice:"found",from:"deck-a",to:"hand-a"}]};
 await page.locator("summary").filter({hasText:/^Advanced module JSON$/}).click();
 await source.fill(JSON.stringify(m));await page.getByRole("button",{name:"Apply JSON changes"}).click();
 await page.getByRole("button",{name:"Playtest module"}).click();
 await page.getByRole("button",{name:"search",exact:true}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await expect(page.locator(".private-decision")).toBeVisible();
 await page.getByRole("button",{name:/Choose (Blade|blade) c7/}).click();
 await expect(page.locator(".private-decision")).toHaveCount(0);
});

test("turn scheduler editor enables initiative and alternating pass-out",async({page})=>{
 await page.goto("/module-editor.html");
 await page.locator("#editor-fields summary").filter({hasText:/^Turn scheduler$/}).click();
 await page.getByLabel("Turn scheduling mode",{exact:true}).selectOption("alternate");
 await page.getByLabel("Initiative claims",{exact:true}).selectOption("yes");
 await page.getByRole("button",{name:"Playtest module"}).click();
 await page.getByRole("button",{name:"Claim initiative",exact:true}).click();
 await page.getByRole("button",{name:"Pass out",exact:true}).click();
 await expect(page.getByRole("button",{name:"Claim initiative",exact:true})).toBeVisible();
});

test("portable module ZIP export and import preserves original rules",async({page})=>{
 await page.goto("/module-editor.html");
 const expected=JSON.parse(await page.locator("#source").inputValue()).name;
 const download=page.waitForEvent("download");
 await page.getByRole("button",{name:"Export ZIP",exact:true}).click();
 const file=await download;
 await page.locator("#importZip").setInputFiles(await file.path());
 await expect(page.locator("#editor-status")).toContainText("ZIP imported and validated");
 expect(JSON.parse(await page.locator("#source").inputValue()).name).toBe(expected);
});
test("evidence dashboard runs five micro-fixtures without awarding catalog passes",async({page})=>{
 await page.goto("/evidence.html");
 await page.getByRole("button",{name:"Run five ZIP round-trip fixtures"}).click();
 await expect(page.locator("#status")).toContainText("5/5 micro-fixtures passed");
 await expect(page.locator("#status")).toContainText("Catalog scores unchanged");
});
