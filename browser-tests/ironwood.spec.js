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
test("workshop exposes generalized preview",async({page})=>{
 await page.goto("/");
 await page.locator("#modes").getByRole("button",{name:"Play",exact:true}).click();
 await page.getByRole("link",{name:/Try Ironwood Duel/}).click();
 await expect(page.getByRole("heading",{name:"Ironwood Duel"})).toBeVisible();
});
