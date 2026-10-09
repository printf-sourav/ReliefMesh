import { beforeEach, expect, it, vi } from 'vitest';
import { Blob as NodeBlob, Buffer as NodeBuffer } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { deleteDB, openDB } from 'idb';
import { preparePackage, parsePackage, forwardPackage } from './mesh-package';
import { acknowledge, importRelay, listDelivered, listQueued, openQueueDB, saveQueued, updateQueued } from './queue';
import { api } from './api';
import { gatewayUpload } from './mesh';
import type { DeliveryReceipt, IncidentRecord, Submission } from './api-types';
vi.mock('./draft',async original=>({...await original<typeof import('./draft')>(),validateImage:vi.fn().mockResolvedValue(undefined)}));
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const source:Submission={client_report_id:A,original_text:'Flood at school',location:'School',latitude:null,longitude:null,image:new NodeBlob(['original bytes'],{type:'image/png'}) as Blob,image_name:'source.png',image_mime:'image/png',analysis_result:null,edited_analysis:null};
beforeEach(async()=>{vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('Blob',NodeBlob);const db=await openQueueDB();await db.clear('reports');await db.clear('tombstones');db.close();});
it('preserves source JSON and photo bytes across hops and bounds loops',async()=>{
  const pkg=await preparePackage(source,A),next=forwardPackage(pkg,B),parsed=await parsePackage(JSON.stringify(next));
  expect(next.source_json).toBe(pkg.source_json);expect(next.content_sha256).toBe(pkg.content_sha256);
  expect(await parsed.submission.image.text()).toBe('original bytes');expect(parsed.submission.analysis_result).toBeNull();
  expect(()=>forwardPackage(next,A)).toThrow();const third=forwardPackage(next,C);const fourth=forwardPackage(third,'44444444-4444-4444-8444-444444444444');expect(()=>forwardPackage(fourth,'55555555-5555-4555-8555-555555555555')).toThrow();
});
it('rejects digest tampering and unknown immutable fields',async()=>{
  const pkg=await preparePackage(source,A);
  await expect(parsePackage(JSON.stringify({...pkg,image_base64:btoa('changed')}))).rejects.toThrow(/digest/);
  await expect(parsePackage(JSON.stringify({...pkg,secret:'never'}))).rejects.toThrow(/unsupported/);
});
it('imports a full-size 10 MiB photo without exhausting the JavaScript regex stack',async()=>{
  const bytes=new Uint8Array(10*1024*1024);bytes[0]=137;bytes[bytes.length-1]=255;
  const large={...source,image:new NodeBlob([bytes],{type:'image/png'}) as Blob};
  const pkg=await preparePackage(large,A),parsed=await parsePackage(JSON.stringify(pkg));
  expect(parsed.submission.image.size).toBe(bytes.length);
  expect(NodeBuffer.from(await parsed.submission.image.arrayBuffer()).equals(NodeBuffer.from(bytes))).toBe(true);
},30000);
it('rejects noncanonical Base64 even when it decodes to the same photo bytes',async()=>{
  const pkg=await preparePackage({...source,image:new NodeBlob([new Uint8Array([0])],{type:'image/png'}) as Blob},A);
  await expect(parsePackage(JSON.stringify({...pkg,image_base64:'AB=='}))).rejects.toThrow(/encoding/);
});
it('imports atomically, deduplicates and retains conflicting UUIDs',async()=>{
  const pkg=await preparePackage(source,A);await importRelay(pkg,source);expect((await importRelay(pkg,source)).duplicate).toBe(true);
  await expect(importRelay({...pkg,content_sha256:'b'.repeat(64)},source)).rejects.toThrow(/Conflicting/);expect(await listQueued()).toHaveLength(1);
});
it('peer storage and relay hints retain the origin until same-payload API confirmation',async()=>{
  await saveQueued(source);const pkg=await preparePackage(source,A);await updateQueued(A,{relay:pkg,relay_origin:true,peer_stored:true});
  expect(await listQueued()).toHaveLength(1);
  const receipt:DeliveryReceipt={client_report_id:A,report_id:B,accepted_at:new Date().toISOString(),sync_status:'synced'};
  await updateQueued(A,{relay_receipt:receipt});expect(await listQueued()).toHaveLength(1);
  const create=vi.spyOn(api,'create').mockResolvedValue({id:B,client_report_id:A,sync_status:'synced'} as IncidentRecord);vi.spyOn(api,'receipt').mockResolvedValue(receipt);const inference=vi.spyOn(api,'analyze');
  await gatewayUpload((await listQueued())[0]);expect(create.mock.calls[0][0].client_report_id).toBe(A);expect(inference).not.toHaveBeenCalled();expect(await listQueued()).toHaveLength(0);
  expect(await listDelivered()).toHaveLength(1);expect((await importRelay(pkg,source)).duplicate).toBe(true);expect(await listQueued()).toHaveLength(0);
});
it('retains pending receipt and mismatched API response',async()=>{
  const pkg=await preparePackage(source,A);await importRelay(pkg,source);
  vi.spyOn(api,'create').mockResolvedValue({id:B,client_report_id:A,sync_status:'pending'} as IncidentRecord);vi.spyOn(api,'sync').mockResolvedValue({synced_report_ids:[],pending_count:1});vi.spyOn(api,'receipt').mockResolvedValue({client_report_id:A,report_id:B,sync_status:'pending',accepted_at:new Date().toISOString()});
  await expect(gatewayUpload((await listQueued())[0])).rejects.toThrow(/pending/);expect(await listQueued()).toHaveLength(1);
  await acknowledge(A,{id:B,client_report_id:A,sync_status:'pending'} as IncidentRecord);expect(await listQueued()).toHaveLength(1);
});
it('upgrades a version-one database without losing existing image bytes',async()=>{
  await deleteDB('reliefmesh-device');
  const database=await openDB('reliefmesh-device',1,{upgrade(db){db.createObjectStore('reports',{keyPath:'client_report_id'});}});await database.put('reports',source);database.close();
  const upgraded=await openQueueDB();expect(upgraded.objectStoreNames.contains('tombstones')).toBe(true);
  expect((await upgraded.get('reports',A))?.image.size).toBe(source.image.size);upgraded.close();
});
