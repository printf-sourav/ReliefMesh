const { chromium } = require(process.env.RELIEFMESH_PLAYWRIGHT_PATH || 'playwright');
const { spawn } = require('node:child_process');
const { mkdtempSync, readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');
const root = resolve('..');
const python = process.env.RELIEFMESH_PYTHON || join(root,'.venv',process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const storage = mkdtempSync(join(tmpdir(),'reliefmesh-http-'));
const apiPort = process.env.RELIEFMESH_HTTP_PORT || '8002';
const origin = `http://127.0.0.1:${apiPort}`;
const output = resolve(process.env.RELIEFMESH_BROWSER_OUTPUT || 'browser-artifacts'); mkdirSync(output,{recursive:true});
let server, browser, logs = '';
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
async function start() {
  server = spawn(python,['-m','uvicorn','api.main:app','--host','127.0.0.1','--port',apiPort],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,RELIEFMESH_DB_PATH:join(storage,'reports.db'),RELIEFMESH_UPLOAD_DIR:join(storage,'uploads'),RELIEFMESH_AI_MODE:'fixture',RELIEFMESH_EMBEDDING_MODE:'disabled',RELIEFMESH_ALLOWED_ORIGINS:'http://127.0.0.1:4173,http://localhost:4173'}});
  server.stdout.on('data',chunk => { logs += chunk; }); server.stderr.on('data',chunk => { logs += chunk; });
  for(let i=0;i<80;i++) { try { const response = await fetch(`${origin}/api/v1/health`); if(response.ok) return; } catch {} await pause(250); }
  throw new Error(`API failed to start: ${logs}`);
}
async function stop() { if(server && server.exitCode === null) { const exit = new Promise(resolve => server.once('exit',resolve)); server.kill(); await exit; } }
(async () => {
  const samples = JSON.parse(readFileSync(join(root,'sample_data/demo_reports.json'),'utf8')); const sample = samples.find(item => item.case === 'C'); const sampleA = samples.find(item => item.case === 'A'); const sampleB = samples.find(item => item.case === 'B');
  await start(); browser = await chromium.launch({channel:'msedge',headless:true}); const context = await browser.newContext({viewport:{width:390,height:900}}); const page = await context.newPage();
  const errors = []; page.on('pageerror',error => errors.push(error.message)); const base = process.env.RELIEFMESH_PRODUCTION_URL || 'http://127.0.0.1:4173';
  await page.goto(`${base}/demo-flood.svg`); await page.screenshot({path:join(output,'http-synthetic-photo.png')}); await page.goto(`${base}/#/report`);
  await page.getByRole('button',{name:'Connection settings'}).click(); await page.getByLabel('Backend origin').fill(origin); await page.getByRole('button',{name:'Save & test connection'}).click(); await page.getByRole('status').filter({hasText:'API reachable · fixture mode'}).waitFor(); await page.getByRole('button',{name:'Close dialog'}).click();
  await page.getByLabel(/Describe the incident/).fill(sample.original_text); await page.getByLabel(/^Location/).fill(sample.location); await page.getByLabel('Incident photo',{exact:true}).setInputFiles(join(output,'http-synthetic-photo.png'));
  await page.getByRole('button',{name:'Analyze report',exact:true}).click(); await page.getByLabel('Summary').waitFor(); assert.equal(await page.getByLabel('Reported people').inputValue(),'4');
  await page.getByLabel('Summary').fill('Citizen edit over actual multipart HTTP.'); await page.getByRole('button',{name:'Save reviewed report'}).click(); await page.getByRole('status').filter({hasText:'Delivered to the simulated hub'}).waitFor();
  let records = await (await fetch(`${origin}/api/v1/reports`)).json(); assert.equal(records.total,1); const analyzed = records.items[0]; assert.equal(analyzed.analysis.summary,'Citizen edit over actual multipart HTTP.'); assert.equal(analyzed.original_analysis.summary,sample.analysis.summary); assert.equal(analyzed.analysis_mode,'fixture');
  const image = await fetch(`${origin}/api/v1/reports/${analyzed.id}/image`); assert.equal(image.headers.get('content-type'),'image/png'); assert.ok((await image.arrayBuffer()).byteLength > 0);
  await page.getByRole('link',{name:'Dashboard',exact:true}).click(); await page.getByText('Unavailable',{exact:true}).waitFor();
  await page.setViewportSize({width:320,height:900}); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await page.setViewportSize({width:390,height:900});
  await page.getByRole('button',{name:/Riverside Colony/}).click(); await page.getByText('ORIGINAL CITIZEN REPORT',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Verify source',exact:true}).click(); await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click(); await page.getByText('Source verified',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Correct fields'}).click(); await page.getByRole('dialog').getByLabel('Summary').fill('Responder correction over actual HTTP.'); await page.getByRole('button',{name:'Save correction'}).click(); await page.locator('.analysis-summary').getByText('Responder correction over actual HTTP.',{exact:true}).waitFor(); assert.equal(await page.getByText('Source verified',{exact:true}).count(),0);
  await page.getByRole('link',{name:'Report',exact:true}).click();
  // Unreachable API then browser reload: source and image must remain device-owned.
  await page.getByLabel(/Describe the incident/).fill(sampleA.original_text); await page.getByLabel(/^Location/).fill(sampleA.location); await page.getByLabel('Incident photo',{exact:true}).setInputFiles(join(output,'http-synthetic-photo.png'));
  await page.route(`${origin}/api/v1/**`,route => route.abort('connectionrefused'));
  await page.getByRole('button',{name:/Save report · analysis pending/}).click(); await page.getByRole('status').filter({hasText:'Saved on this device; delivery is unconfirmed'}).waitFor(); await page.reload(); await page.goto(`${base}/#/queue`); await page.getByText(sampleA.location,{exact:true}).waitFor(); await page.unroute(`${origin}/api/v1/**`);
  await page.getByRole('button',{name:'Retry device uploads & sync'}).click(); await page.getByRole('status').filter({hasText:'1 device reports acknowledged'}).waitFor();
  records = await (await fetch(`${origin}/api/v1/reports`)).json(); assert.equal(records.total,2); const deferred = records.items.find(item => item.original_text === sampleA.original_text); assert.equal(deferred.analysis_mode,'deferred'); assert.equal(deferred.analysis,null);
  await page.getByRole('button',{name:'Retry device uploads & sync'}).click(); await page.getByRole('status').filter({hasText:'0 device reports acknowledged'}).waitFor(); assert.equal((await (await fetch(`${origin}/api/v1/reports`)).json()).total,2);
  await stop(); await start(); const restarted = await (await fetch(`${origin}/api/v1/reports`)).json(); assert.equal(restarted.total,2); assert.equal(restarted.items.find(item => item.id === deferred.id).client_report_id,deferred.client_report_id);
  assert.equal((await fetch(`${origin}/api/v1/reports/${deferred.id}/verifications`,{method:'POST'})).status,409);
  await page.getByRole('link',{name:'Dashboard',exact:true}).click(); await page.getByRole('button',{name:/City School/}).click(); await page.getByRole('button',{name:'Analyze saved source'}).waitFor(); assert.equal(await page.getByRole('button',{name:'Verify source',exact:true}).count(),0);
  await page.getByRole('button',{name:'Analyze saved source'}).click(); await page.getByRole('button',{name:'Verify source',exact:true}).waitFor();
  await page.getByRole('link',{name:'Queue',exact:true}).click(); await page.getByRole('button',{name:'Set transport offline'}).click(); await page.getByRole('link',{name:'Report',exact:true}).click();
  await page.getByLabel(/Describe the incident/).fill(sampleB.original_text); await page.getByLabel(/^Location/).fill(sampleB.location); await page.getByLabel('Incident photo',{exact:true}).setInputFiles(join(output,'http-synthetic-photo.png')); await page.getByRole('button',{name:/Save report · analysis pending/}).click(); await page.getByRole('status').filter({hasText:'Saved on the backend; waiting for simulated transport sync'}).waitFor();
  assert.equal((await (await fetch(`${origin}/api/v1/queue`)).json()).total,1); await stop(); await start(); assert.equal((await (await fetch(`${origin}/api/v1/queue`)).json()).total,1);
  await page.getByRole('link',{name:'Queue',exact:true}).click(); await page.getByRole('button',{name:'Restore transport'}).click(); await page.getByRole('button',{name:'Retry device uploads & sync'}).click(); await page.getByRole('status').filter({hasText:'1 backend reports newly delivered'}).waitFor();
  await page.getByRole('button',{name:'Retry device uploads & sync'}).click(); await page.getByRole('status').filter({hasText:'0 backend reports newly delivered'}).waitFor(); assert.equal((await (await fetch(`${origin}/api/v1/reports`)).json()).total,3);
  await page.getByRole('link',{name:'Dashboard',exact:true}).click(); await page.getByRole('button',{name:/Cannot cross road/}).click(); await page.getByRole('button',{name:'Analyze saved source'}).click(); await page.getByRole('button',{name:'Group with existing incident'}).click(); await page.getByRole('dialog').getByLabel('Target incident group').selectOption(deferred.cluster_id); await page.getByRole('dialog').getByRole('button',{name:'Confirm selected group'}).click(); await page.locator('.detail-heading').getByText('2 sources · 2 photos',{exact:true}).waitFor();
  await page.screenshot({path:join(output,'390-http-grouped.png'),fullPage:true});
  const receipt = await (await fetch(`${origin}/api/v1/receipts/${deferred.client_report_id}`)).json();
  assert.equal(receipt.report_id,deferred.id);assert.equal(receipt.sync_status,'synced');
  // Import an old persisted invalid item, then recover it through actual 422/UI/new UUID.
  await page.getByRole('link',{name:'Queue',exact:true}).click();
  const legacyId='99999999-9999-4999-8999-999999999999';
  await page.evaluate(async ({id,bytes})=>{
    const request=indexedDB.open('reliefmesh-device',2);const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const tx=db.transaction('reports','readwrite');tx.objectStore('reports').put({client_report_id:id,original_text:'x'.repeat(10001),location:'Legacy rejected source',latitude:null,longitude:null,image:new Blob([new Uint8Array(bytes)],{type:'image/png'}),image_name:'legacy.png',image_mime:'image/png',analysis_result:null,edited_analysis:null,created_at:new Date().toISOString(),attempts:0,last_error:null,server_id:null});
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();
  },{id:legacyId,bytes:Array.from(readFileSync(join(output,'http-synthetic-photo.png')))});
  await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('button',{name:'Retry device uploads & sync'}).click();await page.getByRole('button',{name:'Recover rejected report'}).waitFor();
  await page.getByRole('button',{name:'Recover rejected report'}).click();await page.getByRole('dialog').getByLabel('Recovered description',{exact:true}).fill('Recovered legacy flood source.');await page.getByRole('button',{name:'Save replacement with new ID'}).click();
  await page.getByRole('status').filter({hasText:'Replacement saved; original retained'}).waitFor();await page.getByRole('button',{name:'Close dialog'}).click();
  const saved=await page.evaluate(async()=>{const req=indexedDB.open('reliefmesh-device',2);const db=await new Promise(r=>req.onsuccess=()=>r(req.result));const q=db.transaction('reports').objectStore('reports').getAll();const rows=await new Promise(r=>q.onsuccess=()=>r(q.result));db.close();return rows.map(x=>({id:x.client_report_id,text:x.original_text,size:x.image.size}));});
  assert.equal(saved.length,2);assert.equal(saved.find(x=>x.id===legacyId).text.length,10001);assert.ok(saved.every(x=>x.size>0));
  const replacement=saved.find(x=>x.id!==legacyId);await page.screenshot({path:join(output,'390-rejected-recovery.png'),fullPage:true});
  await page.getByRole('button',{name:'Retry device uploads & sync'}).click();await page.getByRole('status').filter({hasText:'1 device reports acknowledged'}).waitFor();
  const recovered=(await (await fetch(`${origin}/api/v1/reports`)).json()).items.find(x=>x.client_report_id===replacement.id);assert.equal(recovered.original_text,'Recovered legacy flood source.');assert.equal(recovered.analysis_mode,'deferred');
  await page.getByText('No reports waiting on this device.',{exact:true}).waitFor();
  assert.deepEqual(Buffer.from(await (await fetch(`${origin}/api/v1/reports/${recovered.id}/image`)).arrayBuffer()),readFileSync(join(output,'http-synthetic-photo.png')));
  const openapi = await (await fetch(`${origin}/openapi.json`)).json(); const expected = ['/api/v1/receipts/{client_report_id}','/api/v1/clusters','/api/v1/dashboard/metrics','/api/v1/queue','/api/v1/sync','/api/v1/reports/{report_id}/duplicates','/api/v1/reports/{report_id}/analysis','/api/v1/reports/{report_id}/analyses','/api/v1/reports/{report_id}/verifications','/api/v1/reports/{report_id}/cluster-membership'];
  const missing = expected.filter(path => !openapi.paths[path]);
  const result = {status:'passed',mode:'explicit backend fixture; no live inference',multipartOriginalAndEdits:true,imageRetrieval:true,devicePhotoReload:true,reconnectDeferredUpload:true,reportCount:4,backendRestartPersistence:true,simulatedOfflineRestartAndRepeatSync:true,correctionResetsVerification:true,deferredVerificationRejected:true,savedSourceAnalysis:true,humanGrouping:true,matchingUnavailableVisible:true,deliveryReceipt:true,permanentRejectionRecovery:true,pageErrors:errors,missingRoutes:missing};
  assert.equal(errors.length,0);assert.equal(missing.length,0); writeFileSync(join(output,'http-results.json'),JSON.stringify(result,null,2)); console.log(JSON.stringify(result,null,2));
})().catch(error => { console.error(error); process.exitCode=1; }).finally(async () => { if(browser) await browser.close(); await stop(); });
