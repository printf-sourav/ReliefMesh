/* Dedicated test browser only. No personal profile or user tabs. */
const { chromium } = require(process.env.RELIEFMESH_PLAYWRIGHT_PATH || 'playwright');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');
const output = resolve(process.env.RELIEFMESH_BROWSER_OUTPUT || 'browser-artifacts');
mkdirSync(output, { recursive:true });
const failures = [], results = [], errors = [], consoleErrors = [];
let browser;
async function run(name,work) { try { await work(); results.push({ name,status:'passed' }); } catch(error) { failures.push(name); results.push({ name,status:'failed',error:error.message }); } }
(async () => {
  browser = await chromium.launch({ channel:process.env.RELIEFMESH_BROWSER_CHANNEL || 'msedge',headless:true });
  const context = await browser.newContext({ viewport:{width:1440,height:1000},hasTouch:true });
  const page = await context.newPage(); page.on('pageerror',error => errors.push(error.message));
  page.on('console',entry => { if(entry.type() === 'error') consoleErrors.push(entry.text()); });
  const base = process.env.RELIEFMESH_FIXTURE_URL || 'http://127.0.0.1:5173';
  const citizenBase = process.env.RELIEFMESH_CITIZEN_FIXTURE_URL || 'http://127.0.0.1:5174';
  await page.goto(`${base}/demo-flood.svg`); await page.screenshot({path:join(output,'synthetic-photo.png')});
  await run('fixture dashboard, selection and search',async () => {
    await page.goto(`${base}/#/dashboard`); await page.getByRole('button',{name:/City School.*2? source/}).first().waitFor();
    await page.screenshot({path:join(output,'desktop-dashboard.png'),fullPage:true});
    await page.getByRole('button',{name:/City School/}).first().click(); await page.getByText('ORIGINAL CITIZEN REPORT',{exact:true}).waitFor();
    await page.screenshot({path:join(output,'desktop-detail.png'),fullPage:true});
    await page.getByLabel('Search incidents').fill('Riverside'); assert.equal(await page.locator('.incident-row').count(),1);
    await page.getByLabel('Search incidents').fill('');
  });
  await run('human grouping, correction, verification and separation',async () => {
    await page.getByRole('button',{name:'Confirm grouping'}).click(); await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();
    await page.locator('.detail-heading').getByText('2 sources · 2 photos',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Verify source',exact:true}).click(); await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();
    await page.getByText('Source verified',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Correct fields'}).click(); await page.getByRole('dialog').getByLabel('Summary').fill('Responder corrected flood summary.');
    await page.getByRole('button',{name:'Save correction'}).click(); await page.locator('.analysis-summary').getByText('Responder corrected flood summary.',{exact:true}).waitFor();
    assert.equal(await page.getByText('Source verified',{exact:true}).count(),0);
    await page.getByRole('button',{name:'Keep separate / dismiss'}).click(); await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();
    await page.locator('.detail-heading').getByText('1 sources · 1 photos',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Group with existing incident'}).click();
    await page.getByRole('dialog').getByLabel('Target incident group').selectOption({index:1});
    await page.getByRole('dialog').getByRole('button',{name:'Confirm selected group'}).click();
    await page.locator('.detail-heading').getByText('2 sources · 2 photos',{exact:true}).waitFor();
  });
  for (const width of [320,390,768,1440]) await run(`layouts at ${width}px`,async () => {
    await page.setViewportSize({width,height:1000});
    for (const route of ['dashboard','report','queue']) {
      await page.goto(`${route === 'dashboard' ? base : citizenBase}/#/${route}`); await page.locator('h1').waitFor();
      const dimensions = await page.evaluate(() => ({ content:document.documentElement.scrollWidth,viewport:innerWidth }));
      assert.ok(dimensions.content <= dimensions.viewport,`${route}: ${JSON.stringify(dimensions)}`);
      if(width < 768) {
        for(const button of await page.locator('button:visible').all()) { const box = await button.boundingBox(); assert.ok(box.height >= 44,`Touch target below 44px on ${route}`); }
        if(route !== 'dashboard') {await page.getByRole('link',{name:'My reports',exact:true}).tap(); await page.getByRole('link',{name:route === 'report' ? 'Report' : 'My reports',exact:true}).tap();}
      }
      if (width === 390 || width === 1440) await page.screenshot({path:join(output,`${width}-${route}.png`),fullPage:true});
    }
    if (width < 768) { await page.goto(`${base}/#/dashboard`); await page.getByRole('button',{name:/Riverside Colony/}).first().click(); await page.getByText('ORIGINAL CITIZEN REPORT',{exact:true}).waitFor(); await page.screenshot({path:join(output,`${width}-detail.png`),fullPage:true}); await page.getByRole('button',{name:'Back to incidents'}).click(); }
  });
  await run('fixture form with separate original and citizen edits',async () => {
    await page.setViewportSize({width:390,height:900}); await page.goto(`${citizenBase}/#/report`);
    await page.getByLabel(/What happened?/).fill('Hamare ghar mein paani aa gaya hai. Chaar log hain. Ek elderly person hai aur drinking water chahiye.');
    await page.getByLabel(/Where is it?/).fill('Riverside Colony'); await page.getByLabel('Incident photo',{exact:true}).setInputFiles(join(output,'synthetic-photo.png'));
    await page.getByRole('button',{name:'Help describe this',exact:true}).click(); await page.getByLabel('Summary').waitFor();
    await page.getByLabel('Summary').fill('Citizen correction retained separately.'); await page.screenshot({path:join(output,'390-analysis.png'),fullPage:true});
    await page.getByRole('button',{name:'Send report'}).click(); await page.getByRole('status').filter({hasText:'Sent to the response team'}).waitFor();
  });
  await run('website and citizen preview keep their routes separate',async () => {
    await page.goto(`${base}/#/report`); await page.getByRole('heading',{name:'Every report. A clearer response.'}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Report',exact:true}).count(),0);
    await page.goto(`${citizenBase}/#/dashboard`); await page.getByRole('heading',{name:'Tell us what’s happening.'}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Dashboard',exact:true}).count(),0);
  });
  await run('dialog focus trap and return',async () => {
    await page.getByRole('button',{name:'Connection settings'}).click(); await page.getByRole('dialog').waitFor();
    for(let i=0;i<5;i++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))); }
    await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(),0);
    assert.equal(await page.getByRole('button',{name:'Connection settings'}).evaluate(element => element === document.activeElement),true);
  });
  await run('production unreachable API save survives reload; ack-only reconnect; one UUID',async () => {
    const live = await context.newPage(); await live.setViewportSize({width:390,height:900}); live.on('pageerror',error => errors.push(error.message));
    const realBase = process.env.RELIEFMESH_CITIZEN_PRODUCTION_URL || 'http://127.0.0.1:4174';
    await live.route('**/api/v1/**',route => route.abort('connectionrefused')); await live.goto(`${realBase}/#/report`);
    assert.equal(await live.getByText(/Development fixtures/).count(),0);
    await live.getByLabel(/What happened?/).fill('Floodwater entering home. Four reported people need water.'); await live.getByLabel(/Where is it?/).fill('Offline test location');
    await live.getByLabel('Incident photo',{exact:true}).setInputFiles(join(output,'synthetic-photo.png'));
    await live.getByRole('button',{name:/Send report/}).click(); await live.getByRole('status').filter({hasText:'Saved on this phone.'}).waitFor();
    await live.reload(); await live.goto(`${realBase}/#/queue`); await live.getByText('Offline test location',{exact:true}).waitFor(); assert.equal(await live.locator('.queue-item img').evaluate(image => image.naturalWidth > 0),true);
    await live.screenshot({path:join(output,'390-offline-queue.png'),fullPage:true});
    const uuids = []; let record = null; await live.unroute('**/api/v1/**');
    await live.route('**/api/v1/**',async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/v1/reports' && route.request().method() === 'POST') {
        const body = route.request().postData(); const metadata = JSON.parse(body.match(/name="metadata"\r\n\r\n([^\r]+)/)[1]); uuids.push(metadata.client_report_id);
        assert.equal(metadata.analysis_result,null); record = {id:'00000000-0000-4000-8000-000000000010',client_report_id:metadata.client_report_id};
        return route.fulfill({status:201,json:record});
      }
      if (path === '/api/v1/sync') return route.fulfill({json:{synced_report_ids:[],pending_count:0}});
      return route.fulfill({json:{items:[],total:0,offset:0,limit:100}});
    });
    await live.getByRole('button',{name:'Try sending now'}).click(); await live.getByRole('status').filter({hasText:'1 report sent'}).waitFor(); assert.equal(await live.locator('.queue-item').count(),0);
    assert.equal(await live.getByRole('button',{name:'Try sending now'}).isDisabled(),true); await live.reload(); assert.equal(await live.locator('.queue-item').count(),0); assert.equal(uuids.length,1);
    await live.close();
  });
  assert.equal(errors.length,0,JSON.stringify(errors)); assert.equal(consoleErrors.length,0,JSON.stringify(consoleErrors));
  await browser.close(); writeFileSync(join(output,'results.json'),JSON.stringify({results,pageErrors:errors,fixtureConsoleErrors:consoleErrors},null,2));
  console.log(JSON.stringify({results,pageErrors:errors,fixtureConsoleErrors:consoleErrors},null,2)); if(failures.length) process.exitCode=1;
})().catch(error => { console.error(error); process.exitCode=1; }).finally(async () => { if(browser) await browser.close(); });
