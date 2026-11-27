import {test,expect} from "@playwright/test";
test("Ironwood hot-seat deployment, attachment, combat and priority",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/duel.html");
 await expect(page.getByRole("heading",{name:"Ironwood Duel"})).toBeVisible();
 await page.getByRole("button",{name:"Deploy from hand"}).click();
 await expect(page.getByText("Stack: musterA",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await expect(page.getByRole("heading",{name:"Actions · Player B"})).toBeVisible();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await expect(page.getByRole("button",{name:"Sentinel c5"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Player A · Energy 1"})).toBeVisible();
 await page.getByRole("button",{name:"Blade c3"}).click();
 await page.getByRole("button",{name:"Attach to sentinel c1"}).click();
 await expect(page.getByText("Attached to c1",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Sentinel c1"}).click();
 await page.getByRole("button",{name:"Attack raider c2"}).click();
 await expect(page.getByRole("button",{name:"Raider c2"})).toContainText("2 HP");
 await expect(page.locator(".duel-error")).toBeEmpty();
 expect(errors).toEqual([]);
});
test("diagnostic arena remains directly accessible",async({page})=>{
 await page.goto("/duel.html");
 await expect(page.locator("#duel")).toBeVisible();
});

test("computer opponent responds and preserves private hand",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/duel.html");
 await page.getByRole("button",{name:"Play vs computer"}).click();
 await page.getByRole("button",{name:"Deploy from hand"}).click();
 await page.getByRole("button",{name:"Pass priority"}).click();
 await expect(page.getByText("Opponent is considering a move…",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Raider c6"})).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Sentinel c5"})).toBeVisible();
 await expect(page.getByText("Stack: empty",{exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});
test("card inspection is readable and closes without changing match",async({page})=>{
 await page.goto("/duel.html");
 const card=page.getByRole("button",{name:"Sentinel c1"});
 await card.click({button:"right"});
 const dialog=page.locator(".duel-inspector");
 await expect(dialog).toBeVisible();
 await expect(dialog).toContainText("2 attack · 5 maximum health");
 await dialog.getByRole("button",{name:"Close inspection"}).click();
 await expect(dialog).not.toBeVisible();
 await expect(card).toContainText("5 HP");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
});
