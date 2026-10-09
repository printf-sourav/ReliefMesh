import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { Blob as NodeBlob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { api, setOrigin } from './api';
import * as queue from './queue';
import { preparePackage } from './mesh-package';
import { enableSharing, gatewayUpload, initializeSharing, wakeSharing } from './mesh';
import { nearby, type NearbyEvent } from './nearby';
import type { DeliveryReceipt, IncidentRecord, Submission } from './api-types';

const mock=vi.hoisted(()=>({event:(_event:NearbyEvent)=>{},enabled:false}));
vi.mock('./nearby',()=>({nearbySupported:()=>true,nearby:{
  getState:vi.fn(async()=>({enabled:mock.enabled,running:mock.enabled,configured:true,deviceId:'22222222-2222-4222-8222-222222222222',groupId:'group',peers:0,status:'ready'})),
  start:vi.fn(async()=>{mock.enabled=true;return {enabled:true,running:true,configured:true,deviceId:'22222222-2222-4222-8222-222222222222',groupId:'group',peers:0,status:'ready'};}),
  stop:vi.fn(async()=>{mock.enabled=false;}),
  addListener:vi.fn(async(_name:string,callback:(event:NearbyEvent)=>void)=>{mock.event=callback;return {remove:vi.fn()};}),
  listInbox:vi.fn(async()=>({items:[]})),readInbox:vi.fn(),acknowledgeInbox:vi.fn(),
  sendControl:vi.fn(async()=>{}),sendReport:vi.fn(async()=>({payloadId:'9223372036854775807'}))
}}));
vi.mock('@capacitor/app',()=>({App:{addListener:vi.fn(async()=>({remove:vi.fn()}))}}));
vi.mock('./draft',async original=>({...await original<typeof import('./draft')>(),validateImage:vi.fn().mockResolvedValue(undefined)}));
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const X='http://192.168.1.10:8000',Y='http://192.168.1.20:8000';
const source:Submission={client_report_id:C,original_text:'Flood',location:'School',latitude:null,longitude:null,image:new NodeBlob(['photo'],{type:'image/png'}) as Blob,image_name:'source.png',image_mime:'image/png',analysis_result:null,edited_analysis:null};
const receipt:DeliveryReceipt={client_report_id:C,report_id:A,accepted_at:'2026-10-09T12:00:00Z',sync_status:'synced'};
const record={id:A,client_report_id:C,sync_status:'synced'} as IncidentRecord;
let dispose:()=>void;
beforeEach(async()=>{
  vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('Blob',NodeBlob);vi.clearAllMocks();
  await enableSharing(false);const db=await queue.openQueueDB();await db.clear('reports');await db.clear('tombstones');db.close();
  setOrigin(X);vi.spyOn(api,'health').mockRejectedValue(new Error('Offline'));
  dispose=await initializeSharing();await enableSharing(true);await wakeSharing();
});
afterEach(async()=>{await enableSharing(false);dispose();localStorage.clear();});
async function queued(){await queue.saveQueued(source);await wakeSharing();return (await queue.listQueued())[0];}
async function peer(){mock.event({type:'peer',endpointId:'peer',deviceId:A});await wakeSharing();}
async function control(value:unknown){
  const previous=vi.mocked(api.health).mock.calls.length;
  mock.event({type:'control',endpointId:'peer',control:value});
  await waitFor(()=>expect(vi.mocked(api.health).mock.calls.length).toBeGreaterThan(previous));await wakeSharing();
}
function hubControls(){return vi.mocked(nearby.sendControl).mock.calls.map(call=>call[0].control as {type:string;origin?:string}).filter(value=>value.type==='hub_receipt');}

it('retains the issuing origin when advertising a receipt after Connection settings changes',async()=>{
  const item=await queued();vi.spyOn(api,'create').mockResolvedValue(record);vi.spyOn(api,'receipt').mockResolvedValue(receipt);
  await gatewayUpload(item);setOrigin(Y);await peer();
  await control({type:'inventory',items:[{id:C,digest:item.relay!.content_sha256}]});
  expect(hubControls().map(value=>value.origin)).toEqual([X]);
  expect((await queue.listDelivered())[0]).toMatchObject({receipt_origin:X});
});

it('does not invent an issuing origin for a legacy receipt tombstone',async()=>{
  const pkg=await preparePackage(source,B),db=await queue.openQueueDB();
  await db.put('tombstones',{client_report_id:C,digest:pkg.content_sha256,location:source.location,receipt,confirmed_at:receipt.accepted_at});db.close();
  await peer();await control({type:'inventory',items:[{id:C,digest:pkg.content_sha256}]});
  expect(hubControls()).toEqual([]);
});

it('ignores another destination hint and resumes forwarding when its destination changes',async()=>{
  const item=await queued();await peer();const pair={id:C,digest:item.relay!.content_sha256};
  await control({type:'hub_receipt',...pair,origin:Y,receipt});
  expect((await queue.listQueued())[0].relay_receipt).toBeUndefined();
  await control({type:'hub_receipt',...pair,origin:X,receipt});
  expect((await queue.listQueued())[0]).toMatchObject({relay_receipt:receipt,relay_receipt_origin:X});
  await control({type:'request',items:[pair]});expect(nearby.sendReport).not.toHaveBeenCalled();
  setOrigin(Y);await control({type:'request',items:[pair]});expect(nearby.sendReport).toHaveBeenCalledTimes(1);
});

it('keeps the source if the destination changes while POST is in flight',async()=>{
  const item=await queued();vi.spyOn(api,'create').mockImplementation(async()=>{setOrigin(Y);return record;});
  const readReceipt=vi.spyOn(api,'receipt').mockResolvedValue(receipt),sync=vi.spyOn(api,'sync');
  await expect(gatewayUpload(item)).rejects.toThrow(/destination changed/i);
  expect(readReceipt).not.toHaveBeenCalled();expect(sync).not.toHaveBeenCalled();expect(await queue.listQueued()).toHaveLength(1);
});

it('keeps the source if the destination changes while the receipt is in flight',async()=>{
  const item=await queued();vi.spyOn(api,'create').mockResolvedValue(record);
  vi.spyOn(api,'receipt').mockImplementation(async()=>{setOrigin(Y);return receipt;});
  await expect(gatewayUpload(item)).rejects.toThrow(/destination changed/i);
  expect(await queue.listQueued()).toHaveLength(1);expect(await queue.listDelivered()).toHaveLength(0);
});

it('does not read a different backend receipt after a destination change during sync',async()=>{
  const item=await queued();vi.spyOn(api,'create').mockResolvedValue({...record,sync_status:'pending'});
  vi.spyOn(api,'sync').mockImplementation(async()=>{setOrigin(Y);return {synced_report_ids:[A],pending_count:0};});
  const readReceipt=vi.spyOn(api,'receipt').mockResolvedValue(receipt);
  await expect(gatewayUpload(item)).rejects.toThrow(/destination changed/i);
  expect(readReceipt).not.toHaveBeenCalled();expect(await queue.listQueued()).toHaveLength(1);
});

it('can reimport identical source bytes for a new destination without losing digest conflict protection',async()=>{
  const item=await queued();vi.spyOn(api,'create').mockResolvedValue(record);vi.spyOn(api,'receipt').mockResolvedValue(receipt);
  await gatewayUpload(item);expect((await queue.importRelay(item.relay!,source)).duplicate).toBe(true);expect(await queue.listQueued()).toHaveLength(0);
  setOrigin(Y);expect((await queue.importRelay(item.relay!,source)).duplicate).toBe(false);expect(await queue.listQueued()).toHaveLength(1);
  await expect(queue.importRelay({...item.relay!,content_sha256:'a'.repeat(64)},source)).rejects.toThrow(/Conflicting/);
  expect((await queue.listQueued())[0].relay!.content_sha256).toBe(item.relay!.content_sha256);
});

it('keeps exhausted retries blocked for this peer until it reconnects',async()=>{
  const item=await queued();await peer();const request={type:'request',items:[{id:C,digest:item.relay!.content_sha256}]};
  let now=Date.now();vi.spyOn(Date,'now').mockImplementation(()=>now);
  await control(request);expect(nearby.sendReport).toHaveBeenCalledTimes(1);
  for(let attempt=0;attempt<3;attempt++){now+=130000;await wakeSharing();}
  expect(nearby.sendReport).toHaveBeenCalledTimes(4);
  now+=130000;await wakeSharing();await control(request);expect(nearby.sendReport).toHaveBeenCalledTimes(4);
  mock.event({type:'disconnected',endpointId:'peer'});await wakeSharing();await peer();await control(request);
  expect(nearby.sendReport).toHaveBeenCalledTimes(5);
});
