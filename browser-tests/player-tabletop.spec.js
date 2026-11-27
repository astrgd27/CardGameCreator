import {test,expect} from "@playwright/test";
for(const name of ["Looboo","Crystal Circuit","Taste Dimension","Ringworld Rumble","Generation Wars"]){
 test(name+" launches dedicated player tabletop",async({page})=>{
  await page.goto("index.html");await page.getByRole("button",{name:"Play "+name,exact:true}).click();
  await expect(page).toHaveURL(/play\.html/);await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  await expect(page.locator("#table")).toBeVisible();await expect(page.locator(".duel-sidebar")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Menu",exact:true})).toBeVisible();
  const card=page.locator(".hand:not(.opponent) button.card").first();await expect(card).toBeVisible();await card.click();await expect(page.locator("footer")).toBeVisible();
 });
}
