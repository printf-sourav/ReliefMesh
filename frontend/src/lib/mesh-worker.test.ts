import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { Blob as NodeBlob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import * as queue from './queue';
import { api } from './api';
import { preparePackage, forwardPackage } from './mesh-package';
import { enableSharing, gatewayUpload, initializeSharing, wakeSharing } from './mesh';
import { nearby, type NearbyEvent } from './nearby';
import type { Submission } from './api-types';
const mock=vi.hoisted(()=>({event:(_event:NearbyEvent)=>{},enabled:false,items:[] as {inboxId:string;endpointId:string;deviceId:string}[],json:'',remove:vi.fn()}));
vi.mock('./nearby',()=>({nearbySupported:()=>true,nearby:{
  getState:vi.fn(async()=>({enabled:mock.enabled,running:mock.enabled,configured:true,deviceId:'22222222-2222-4222-8222-222222222222',groupId:'group',peers:0,status:'ready'})),
  start:vi.fn(async()=>{mock.enabled=true;return {enabled:true,running:true,configured:true,deviceId:'22222222-2222-4222-8222-222222222222',groupId:'group',peers:0,status:'ready'};}),
  stop:vi.fn(async()=>{mock.enabled=false;}),addListener:vi.fn(async(_name:string,callback:(event:NearbyEvent)=>void)=>{mock.event=callback;return {remove:mock.remove};}),
  listInbox:vi.fn(async()=>({items:mock.items})),readInbox:vi.fn(async()=>({packageJson:mock.json})),
  acknowledgeInbox:vi.fn(async()=>{mock.items=[];}),sendControl:vi.fn(async()=>{}),sendReport:vi.fn(async()=>({payloadId:'9223372036854775807'}))
}}));
vi.mock('@capacitor/app',()=>({App:{addListener:vi.fn(async()=>({remove:vi.fn()}))}}));
vi.mock('./draft',async original=>({...await original<typeof import('./draft')>(),validateImage:vi.fn().mockResolvedValue(undefined)}));
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const source:Submission={client_report_id:A,original_text:'Flood',location:'School',latitude:null,longitude:null,image:new NodeBlob(['photo'],{type:'image/png'}) as Blob,image_name:'source.png',image_mime:'image/png',analysis_result:null,edited_analysis:null};
let dispose:()=>void;
beforeEach(async()=>{
  vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('Blob',NodeBlob);mock.items=[];mock.enabled=false;
  await enableSharing(false);const db=await queue.openQueueDB();await db.clear('reports');await db.clear('tombstones');db.close();
  vi.spyOn(api,'health').mockRejectedValue(new Error('Offline'));dispose=await initializeSharing();
});
afterEach(async()=>{await enableSharing(false);dispose();});
async function incoming(){mock.json=JSON.stringify(forwardPackage(await preparePackage(source,A),B));mock.items=[{inboxId:'package',endpointId:'peer',deviceId:A}];}
it('automatically imports a retained inbox copy and later uploads it once without inference',async()=>{
  await incoming();const create=vi.spyOn(api,'create'),inference=vi.spyOn(api,'analyze');
  await enableSharing(true);await wakeSharing();expect(await queue.listQueued()).toHaveLength(1);expect(nearby.acknowledgeInbox).toHaveBeenCalled();expect(create).not.toHaveBeenCalled();
  vi.mocked(api.health).mockResolvedValue({status:'ok',ai_mode:'live',model_id:'provider'});
  create.mockResolvedValue({id:B,client_report_id:A,sync_status:'synced'} as never);vi.spyOn(api,'receipt').mockResolvedValue({client_report_id:A,report_id:B,accepted_at:new Date().toISOString(),sync_status:'synced'});
  await Promise.all([wakeSharing(),wakeSharing(),wakeSharing()]);expect(create).toHaveBeenCalledTimes(1);expect(inference).not.toHaveBeenCalled();expect(await queue.listQueued()).toHaveLength(0);
  expect(create.mock.calls[0][0].image.size).toBe(source.image.size);
});
it('sends no peer-stored success and keeps the native inbox when IndexedDB import fails',async()=>{
  await incoming();vi.spyOn(queue,'importRelay').mockRejectedValue(new DOMException('Full','QuotaExceededError'));
  await enableSharing(true);mock.event({type:'peer',endpointId:'peer',deviceId:A});await wakeSharing();
  await waitFor(()=>expect(nearby.readInbox).toHaveBeenCalled());expect(nearby.acknowledgeInbox).not.toHaveBeenCalled();
  expect(vi.mocked(nearby.sendControl).mock.calls.some(call=>(call[0].control as {type:string}).type==='peer_stored')).toBe(false);expect(mock.items).toHaveLength(1);
});
it('shares one upload between a manual retry and the automatic worker',async()=>{
  await queue.saveQueued(source);await enableSharing(true);await wakeSharing();
  const item=(await queue.listQueued())[0];let finish!:(record:never)=>void;
  const create=vi.spyOn(api,'create').mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  vi.mocked(api.health).mockResolvedValue({status:'ok',ai_mode:'live',model_id:'provider'});
  vi.spyOn(api,'receipt').mockResolvedValue({client_report_id:A,report_id:B,accepted_at:new Date().toISOString(),sync_status:'synced'});
  const manual=gatewayUpload(item),automatic=wakeSharing();await waitFor(()=>expect(create).toHaveBeenCalledTimes(1));
  finish({id:B,client_report_id:A,sync_status:'synced'} as never);await Promise.all([manual,automatic]);
  expect(create).toHaveBeenCalledTimes(1);expect(await queue.listQueued()).toHaveLength(0);
});
it('starts no further uploads after sharing is disabled during an in-flight request',async()=>{
  await queue.saveQueued(source);await queue.saveQueued({...source,client_report_id:B});await enableSharing(true);await wakeSharing();
  let finish!:(record:never)=>void;const create=vi.spyOn(api,'create').mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  vi.mocked(api.health).mockResolvedValue({status:'ok',ai_mode:'live',model_id:'provider'});
  vi.spyOn(api,'receipt').mockResolvedValue({client_report_id:A,report_id:B,accepted_at:new Date().toISOString(),sync_status:'synced'});
  const delivery=wakeSharing();await waitFor(()=>expect(create).toHaveBeenCalledTimes(1));await enableSharing(false);
  finish({id:B,client_report_id:A,sync_status:'synced'} as never);await delivery;
  expect(create).toHaveBeenCalledTimes(1);expect((await queue.listQueued()).map(item=>item.client_report_id)).toEqual([B]);
});
