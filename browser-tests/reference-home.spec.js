import {test,expect} from "@playwright/test";
for(const name of ["Looboo","Crystal Circuit","Taste Dimension","Ringworld Rumble","Generation Wars"]){
 test("homepage opens "+name+" in play and edit and exports ZIP",async({page})=>{
  await page.goto("/index.html");
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export "+name,exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  await page.getByRole("button",{name:"Play "+name,exact:true}).click();await expect(page).toHaveURL(/play\.html/);await expect(page.locator("#match")).toContainText(name);
  await page.goto("/index.html");await page.getByRole("button",{name:"Edit "+name,exact:true}).click();await expect(page).toHaveURL(/module-editor\.html\?resume=1/);await expect(page.locator("#source")).toHaveValue(new RegExp(name));
 });
}
