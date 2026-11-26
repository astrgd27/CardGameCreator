import {test,expect} from '@playwright/test';
test('workshop, deck editor, duel and ZIP round trip',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('#modes')).toContainText('Modules');
 await page.locator('#modes').getByRole('button',{name:'Modules',exact:true}).click();
 await expect(page.getByText('Module details',{exact:true})).toBeVisible();
 await page.locator('#modes').getByRole('button',{name:'Create',exact:true}).click();
 await expect(page.locator('.createNav')).toContainText('Cards');
 await page.locator('#modes').getByRole('button',{name:'Decks',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Current deck'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Card browser'})).toBeVisible();
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#save').click();
 const download=await downloadPromise;
 const path=testInfo.outputPath('module.zip');await download.saveAs(path);
 await page.locator('#zip').setInputFiles(path);
 await expect(page.locator('#status')).toContainText('Module imported');
 await page.locator('#modes').getByRole('button',{name:'Play',exact:true}).click();
 await page.getByRole('button',{name:'Start duel'}).click();
 await expect(page.locator('.arena')).toBeVisible();
 await expect(page.locator('.cardhand .tablecard').first()).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('arena.png')});
 expect(errors).toEqual([]);
});


test('arena cards are readable and inspection is available',async({page})=>{
 await page.goto('/');
 await page.locator('#modes').getByRole('button',{name:'Play',exact:true}).click();
 await page.getByRole('button',{name:'Start duel'}).click();
 const hand=page.locator('.cardhand .tablecard').first();
 await expect(hand).toBeVisible();
 const size=await hand.boundingBox();expect(size.width).toBeGreaterThanOrEqual(145);
 await hand.click({button:'right'});
 await expect(page.locator('dialog .inspectCard .card')).toBeVisible();
 const inspected=await page.locator('dialog .inspectCard .card').boundingBox();
 expect(inspected.width).toBeGreaterThan(size.width);
 await page.locator('#close').click();
 await expect(page.locator('dialog')).not.toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 expect(overflow).toBe(false);
});

test('transactional gameplay supports play, rewind and stepped opponent',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.locator('#modes').getByRole('button',{name:'Play',exact:true}).click();
 await page.getByRole('button',{name:'Start duel'}).click();
 await page.locator('#pace').selectOption('Step');
 const hand=page.locator('.cardhand .tablecard');
 const before=await hand.evaluateAll(cards=>cards.map(c=>c.dataset.card));
 const playable=page.locator('.cardhand .playable').first();
 await expect(playable).toBeVisible();
 await playable.click();
 await expect(page.getByRole('button',{name:'↶ Rewind'})).toBeVisible();
 await page.getByRole('button',{name:'↶ Rewind'}).click();
 expect(await hand.evaluateAll(cards=>cards.map(c=>c.dataset.card))).toEqual(before);
 await page.getByRole('button',{name:'End turn',exact:true}).click();
 const next=page.getByRole('button',{name:'Next opponent move'});
 await expect(next).toBeVisible();
 await next.click();
 await expect(page.locator('#status')).not.toContainText('Opponent action failed');
 expect(errors).toEqual([]);
});
