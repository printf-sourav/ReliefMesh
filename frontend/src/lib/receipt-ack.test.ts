import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { Blob as NodeBlob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { api, setOrigin } from './api';
import { acknowledge, deliverQueue, listDelivered, listQueued, openQueueDB, saveQueued } from './queue';
import { enableSharing, initializeSharing, wakeSharing } from './mesh';
import type { DeliveryReceipt, IncidentRecord, Submission } from './api-types';

const mock=vi.hoisted(()=>({enabled:false}));
vi.mock('./nearby',()=>({nearbySupported:()=>true,nearby:{
  getState:vi.fn(async()=>({enabled:mock.enabled,running:mock.enabled,configured:true,deviceId:'22222222-2222-4222-8222-222222222222',groupId:'group',peers:0,status:'ready'})),
  start:vi.fn(async()=>{mock.enabled=true;return {enabled:true,running:true,configured:true,deviceId:'22222222-2222-4222-8222-222222222222',groupId:'group',peers:0,status:'ready'};}),
  stop:vi.fn(async()=>{mock.enabled=false;}),
  addListener:vi.fn(async()=>({remove:vi.fn()})),
  listInbox:vi.fn(async()=>({items:[]})),sendControl:vi.fn(async()=>{})
}}));
vi.mock('@capacitor/app',()=>({App:{addListener:vi.fn(async()=>({remove:vi.fn()}))}}));
vi.mock('./draft',async original=>({...await original<typeof import('./draft')>(),validateImage:vi.fn().mockResolvedValue(undefined)}));

const A='11111111-1111-4111-8111-111111111111',C='33333333-3333-4333-8333-333333333333';
const X='http://192.168.1.10:8000',Y='http://192.168.1.20:8000';
const source:Submission={client_report_id:C,original_text:'Flood',location:'School',latitude:null,longitude:null,image:new NodeBlob(['original photo'],{type:'image/png'}) as Blob,image_name:'source.png',image_mime:'image/png',analysis_result:null,edited_analysis:null};
const record={id:A,client_report_id:C,sync_status:'synced'} as IncidentRecord;
const receipt:DeliveryReceipt={client_report_id:C,report_id:A,accepted_at:'2026-10-09T12:00:00Z',sync_status:'synced'};
let dispose:()=>void;
beforeEach(async()=>{
  vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('Blob',NodeBlob);
  await enableSharing(false);const db=await openQueueDB();await db.clear('reports');await db.clear('tombstones');db.close();
  setOrigin(X);vi.spyOn(api,'health').mockRejectedValue(new Error('Offline'));
  dispose=await initializeSharing();
});
afterEach(async()=>{await enableSharing(false);dispose();localStorage.clear();});
async function relaySource(){await saveQueued(source);await enableSharing(true);await wakeSharing();expect((await listQueued())[0].relay).toBeDefined();}
async function expectSourceRetained(){const [item]=await listQueued();expect(item.client_report_id).toBe(C);expect(await item.image.text()).toBe('original photo');expect(await listDelivered()).toHaveLength(0);}

it('retains the source when the foreground worker adds relay metadata while the report page POST is in flight',async()=>{
  await enableSharing(true);await wakeSharing();
  let finish!:(value:IncidentRecord)=>void;
  const create=vi.spyOn(api,'create').mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  // This is the report page's saveQueued -> await create -> acknowledge sequence.
  const submission=(async()=>{await saveQueued(source);const accepted=await api.create(source,true);await acknowledge(source.client_report_id,accepted);})();
  const outcome=submission.then(()=>null,error=>error as Error);
  await waitFor(()=>expect(create).toHaveBeenCalledTimes(1));await wakeSharing();
  expect((await listQueued())[0].relay).toBeDefined();finish(record);
  expect(await outcome).toMatchObject({message:expect.stringMatching(/receipt.*source retained/i)});
  await expectSourceRetained();
});

it.each([
  ['missing receipt',undefined,X],
  ['another report', {...receipt,report_id:'44444444-4444-4444-8444-444444444444'},X],
  ['another client report', {...receipt,client_report_id:A},X],
  ['pending hub delivery', {...receipt,sync_status:'pending' as const},X],
  ['invalid acceptance timestamp', {...receipt,accepted_at:'invalid'},X],
  ['missing issuing origin',receipt,undefined],
  ['another destination',receipt,Y],
] as const)('keeps relay photo bytes after %s',async(_name,proof,origin)=>{
  await relaySource();await expect(acknowledge(C,record,proof,origin)).rejects.toThrow();await expectSourceRetained();
});

it('deletes relay bytes only after a matching synced receipt from the configured destination',async()=>{
  await relaySource();await acknowledge(C,record,receipt,X);
  expect(await listQueued()).toHaveLength(0);expect((await listDelivered())[0]).toMatchObject({client_report_id:C,receipt,receipt_origin:X});
});

it('uses a confirmed synced receipt even when POST returned pending before the gateway synced it',async()=>{
  await relaySource();await acknowledge(C,{...record,sync_status:'pending'},receipt,X);
  expect(await listQueued()).toHaveLength(0);expect((await listDelivered())[0]).toMatchObject({receipt,receipt_origin:X});
});

it('keeps a pending relay source when no hub receipt is available',async()=>{
  await relaySource();await acknowledge(C,{...record,sync_status:'pending'});
  await expectSourceRetained();expect((await listQueued())[0].server_id).toBe(A);
});

it('preserves ordinary non-relay API-pending acknowledgment',async()=>{
  await saveQueued(source);await acknowledge(C,{...record,sync_status:'pending'});
  expect(await listQueued()).toHaveLength(0);expect(await listDelivered()).toHaveLength(0);
});

it('retains an ordinary queued source if the destination changes while its POST is in flight',async()=>{
  await saveQueued(source);
  let finish!:(value:IncidentRecord)=>void;
  const create=vi.spyOn(api,'create').mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const delivery=deliverQueue(true);await waitFor(()=>expect(create).toHaveBeenCalledTimes(1));
  setOrigin(Y);finish(record);
  expect(await delivery).toMatchObject({delivered:0,errors:[expect.stringMatching(/destination changed/i)]});
  await expectSourceRetained();
});
