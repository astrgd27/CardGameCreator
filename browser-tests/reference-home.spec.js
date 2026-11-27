import {test,expect} from "@playwright/test";

for(const name of ["Looboo","Crystal Circuit","Taste Dimension","Ringworld Rumble","Generation Wars"]){
 test(name+" opens from the library and launches Card Battle",async({page})=>{
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/index.html");
  await page.getByRole("link",{name:"Open "+name,exact:true}).click();
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  const download=page.waitForEvent("download");
  await page.getByRole("button",{name:"Export ZIP",exact:true}).click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  await page.getByRole("button",{name:"Card Battle"}).click();
  await page.getByLabel("Animation speed").selectOption("reduced");
  await page.getByRole("button",{name:"Start match"}).click();
  await expect(page).toHaveURL(/play\.html/);
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  await expect(page.locator(".hand.opponent .card[data-card-id]")).toHaveCount(0);
  const card=page.locator(".hand:not(.opponent) .card").first();
  await card.click({button:"right"});
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button",{name:"Close",exact:true}).click();
  await page.getByRole("button",{name:"Module hub",exact:true}).click();
  await page.getByRole("button",{name:"Open editable copy"}).click();
  await expect(page.getByRole("heading",{name:"Workshop",exact:true})).toBeVisible();
  expect(errors).toEqual([]);
 });
}

async function start(page,name){
 await page.goto("/index.html");
 await page.getByRole("link",{name:"Open "+name,exact:true}).click();
 await page.getByRole("button",{name:"Card Battle"}).click();
 await page.getByLabel("Animation speed").selectOption("reduced");
 await page.getByRole("button",{name:"Start match"}).click();
}
test("Looboo attaches nutrients and enforces the attack payment",async({page},info)=>{
 await start(page,"Looboo");
 const active=page.locator('[data-zone="active-a"]');
 await active.getByRole("button",{name:"Pufflump",exact:true}).click();
 await expect(page.getByRole("button",{name:/Quick strike/})).toHaveCount(0);
 await active.getByRole("button",{name:"Spore Nutrient",exact:true}).click();
 await active.getByRole("button",{name:"Pufflump",exact:true}).click();
 await active.getByRole("button",{name:"Pufflump",exact:true}).click();
 await expect(page.getByRole("button",{name:/Charged strike/})).toHaveCount(0);
 await page.locator('[data-zone="active-b"]').getByRole("button",{name:"Zibbler",exact:true}).click();
 await expect(page.getByText("Turn 2",{exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath("looboo-table.png")});
});

test("Crystal Circuit channels a resource and passes to the automated opponent",async({page})=>{
 test.setTimeout(45000);
 await start(page,"Crystal Circuit");
 await page.locator("#table").getByRole("button",{name:"Azure Crystal Array",exact:true}).first().click();
 await page.getByRole("button",{name:"Generate azure",exact:true}).click();
 await expect(page.locator(".seat").last()).toContainText("Azure 1");
 await page.getByRole("button",{name:"Next phase",exact:true}).click();
 const decision=page.getByRole("button",{name:/^(Pass response|Next phase)$/});
 for(let i=0;i<24&&await page.locator(".turn").textContent()==="Turn 1 · Main";i++){
  await expect(decision.or(page.getByText("Turn 1 · Combat",{exact:true})).first()).toBeVisible();
  if(await decision.isVisible()&&await page.locator(".turn").textContent()==="Turn 1 · Main")await decision.click();
 }
 await expect(page.locator(".turn")).toHaveText("Turn 1 · Combat");
});

test("Taste Dimension presents fusion material choices and cancels without spending them",async({page})=>{
 await start(page,"Taste Dimension");
 const fusion=page.getByRole("button",{name:"Fusion",exact:true});
 await fusion.click();
 const dialog=page.getByRole("dialog",{name:"Choose payment"});
 await expect(dialog.getByRole("combobox")).toHaveCount(2);
 await dialog.getByRole("button",{name:"Close",exact:true}).click();
 await expect(page.locator(".shared").getByRole("button",{name:"Dumpling Golem",exact:true})).toHaveCount(1);
 await fusion.click();
 await dialog.getByRole("button",{name:"Confirm",exact:true}).click();
 const pass=page.getByRole("button",{name:"Pass response",exact:true});
 if(await pass.isVisible())await pass.click();
 await expect(page.locator(".shared").getByRole("button",{name:"Dumpling Golem",exact:true})).toHaveCount(0);
});
