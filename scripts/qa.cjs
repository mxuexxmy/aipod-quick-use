const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base='http://localhost:8765/?mock=1';
for(const route of ['overview','pod','apps','models','verify','docs','endpoints']){
 await page.goto(base+'#/'+route);await page.waitForTimeout(800);
 assert(await page.locator('h1').count()>0,route);
 assert.equal(await page.evaluate(()=>document.querySelector('#page').scrollWidth>document.querySelector('#page').clientWidth),false,route+' overflow');
 await page.screenshot({path:`review/screenshots/${route}-desktop.png`});
}
await page.goto(base+'#/models');await page.waitForTimeout(800);
await page.locator('#modelSearch').fill('nomic');assert.equal(await page.locator('.model-row').count(),1);
await page.getByRole('button',{name:'详情',exact:true}).click();await page.waitForTimeout(450);assert.match(await page.locator('.model-detail').innerText(),/embedding/);
await page.goto(base+'#/verify');await page.waitForTimeout(600);
await page.locator('#verifyMsg').fill('引号 "，单引号 \'，换行\n测试');await page.locator('#chatSend').click();assert(await page.locator('#chatSend').isDisabled());await page.locator('#chatStop').click();await page.waitForTimeout(100);assert(await page.locator('#chatStop').isDisabled());assert.match(await page.locator('#chatStats').innerText(),/停止/);
const curl=await page.locator('#curlBox code').innerText();assert.match(curl,/Content-Type: application\/json/);assert.match(curl,/\\n测试/);
await page.locator('#chatSend').click();await page.waitForTimeout(1300);assert.match(await page.locator('#chatOutput').innerText(),/演示模型/);assert(await page.locator('#chatSend').isEnabled());
await page.locator('#chatSend').click();await page.locator('a.nav-item[data-page="models"]').click();await page.waitForTimeout(600);
for(const scenario of ['empty','offline','pod-none','pod-unknown']){
 await page.goto(`http://localhost:8765/?mock=${scenario}#/overview`);await page.waitForTimeout(800);assert(await page.locator('#overviewRefresh').isEnabled());
 if(scenario==='empty')assert.match(await page.locator('#modelCheck').innerText(),/还没有/);
 if(scenario==='offline')assert.match(await page.locator('#ollamaCheck').innerText(),/不可达/);
}
for(const width of [390,768,1024]){
 await page.setViewportSize({width,height:844});
 for(const route of ['overview','apps','models','verify','docs','endpoints']){
  await page.goto(base+'#/'+route);await page.waitForTimeout(700);
  assert.equal(await page.evaluate(()=>document.querySelector('#page').scrollWidth>document.querySelector('#page').clientWidth),false,`${route} overflow at ${width}`);
 }
}
await page.setViewportSize({width:390,height:844});await page.goto(base);await page.waitForTimeout(800);await page.screenshot({path:'review/screenshots/overview-mobile.png'});
await page.locator('#moreBtn').click();await page.keyboard.press('Shift+Tab');assert(await page.locator('[data-close-sheet]').evaluate(el=>el===document.activeElement));await page.keyboard.press('Escape');assert(await page.locator('#moreSheet').isHidden());
await page.locator('#settingsBtn').click();await page.locator('input[value="custom"]').check();await page.locator('#customBaseInput').fill('javascript:alert(1)');await page.locator('#settingsSave').click();assert(await page.locator('#settingsModal').isVisible());await page.keyboard.press('Escape');
await page.setViewportSize({width:1440,height:1000});await page.goto(base);await page.waitForTimeout(800);await page.locator('#themeBtn').click();await page.locator('#themeBtn').click();await page.waitForTimeout(250);await page.screenshot({path:'review/screenshots/overview-dark.png'});
assert.deepEqual(errors,[]);console.log('PASS: 7 routes, 4 scenarios, 3 responsive widths, model filtering/details, stream complete/cancel/navigation, curl escaping, mobile focus trap, settings validation, dark theme; no page errors');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
