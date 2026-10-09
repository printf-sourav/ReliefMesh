import { App as NativeApp } from '@capacitor/app';
import { api, ApiError, getOrigin, validateOrigin } from './api';
import type { DeliveryReceipt } from './api-types';
import { nearby, nearbySupported, type NearbyEvent, type NearbyState } from './nearby';
import { forwardPackage, parsePackage, preparePackage, requireUuid } from './mesh-package';
import { acknowledge, importRelay, listDelivered, listQueued, markRejected, updateQueued, type QueueItem } from './queue';
import { message } from './utils';
interface Peer {deviceId:string;outgoing:{id:string;digest:string}[];inventoryAt?:number;active?:{id:string;digest:string;deadline:number;attempts:number}}
export interface SharingSnapshot {native:NearbyState|null;error:string;progress:string;peers:number;working:boolean}
let snapshot:SharingSnapshot={native:null,error:'',progress:'',peers:0,working:false};
const subscribers=new Set<()=>void>();const peers=new Map<string,Peer>();let foreground=true;let active:Promise<void>|undefined;let rerun=false;
function publish(patch:Partial<SharingSnapshot>) {snapshot={...snapshot,...patch,peers:peers.size};subscribers.forEach(fn=>fn());}
export const sharing={subscribe:(fn:()=>void)=>{subscribers.add(fn);return()=>{subscribers.delete(fn);};},getSnapshot:()=>snapshot};
const entry=(item:QueueItem)=>({id:item.client_report_id,digest:item.relay!.content_sha256});
function validatePairs(value:unknown):{id:string;digest:string}[] {
  if(!Array.isArray(value)||value.length>20) throw new Error('Invalid nearby inventory batch.');
  return value.map(item=>{requireUuid(item.id);if(typeof item.digest!=='string'||!/^[a-f0-9]{64}$/.test(item.digest)) throw new Error('Invalid inventory digest.');return {id:item.id,digest:item.digest};});
}
async function inventory(endpointId:string) {
  const peer=peers.get(endpointId);if(!peer||(peer.inventoryAt??0)>Date.now()-30000)return;peer.inventoryAt=Date.now();
  const queued=(await listQueued()).filter(x=>x.relay&&!x.rejected&&!x.superseded_by);
  const done=await listDelivered();const items=[...queued.map(entry),...done.map(x=>({id:x.client_report_id,digest:x.digest}))];
  for(let n=0;n<items.length;n+=20) await nearby.sendControl({endpointId,control:{type:'inventory',items:items.slice(n,n+20)}});
}
async function control(endpointId:string,value:unknown) {
  if(!peers.has(endpointId)||!value||typeof value!=='object') return;
  const data=value as {type:string;items?:unknown;id?:string;digest?:string;receipt?:DeliveryReceipt;origin?:string};
  if(data.type==='inventory') {
    const incoming=validatePairs(data.items),queued=await listQueued(),done=await listDelivered();const unknown=[];
    for(const pair of incoming) {
      const local=queued.find(x=>x.client_report_id===pair.id),delivered=done.find(x=>x.client_report_id===pair.id);const digest=local?.relay?.content_sha256??delivered?.digest;
      if(digest&&digest!==pair.digest) {publish({error:`Conflicting nearby source ${pair.id.slice(0,8)}; original retained.`});continue;}
      if(!digest) unknown.push(pair);
      else {
        await nearby.sendControl({endpointId,control:{type:'peer_stored',...pair}});
        if(delivered?.receipt?.sync_status==='synced') await nearby.sendControl({endpointId,control:{type:'hub_receipt',...pair,origin:getOrigin(),receipt:delivered.receipt}});
      }
    }
    if(unknown.length) await nearby.sendControl({endpointId,control:{type:'request',items:unknown}});
  } else if(data.type==='request') {
    const peer=peers.get(endpointId)!;
    for(const pair of validatePairs(data.items)) if(!peer.outgoing.some(x=>x.id===pair.id)&&peer.active?.id!==pair.id&&peer.outgoing.length<100) peer.outgoing.push(pair);
  } else if(data.type==='peer_stored'||data.type==='hub_receipt') {
    requireUuid(data.id);const item=(await listQueued()).find(x=>x.client_report_id===data.id);
    if(!item?.relay||item.relay.content_sha256!==data.digest) return;
    if(data.type==='hub_receipt') {
      const receipt=data.receipt; requireUuid(receipt?.report_id);
      if(!receipt||receipt.client_report_id!==item.client_report_id||receipt.sync_status!=='synced'||!Number.isFinite(Date.parse(receipt.accepted_at))||typeof data.origin!=='string') throw new Error('Invalid relay receipt.');
      // A trusted group's hint never changes this device's configured upload origin.
      validateOrigin(data.origin);await updateQueued(item.client_report_id,{relay_receipt:receipt,peer_stored:true});
    } else if(!item.peer_stored) await updateQueued(item.client_report_id,{peer_stored:true});
    const peer=peers.get(endpointId)!;if(peer.active?.id===data.id&&peer.active.digest===data.digest) peer.active=undefined;
  }
}
async function importInbox() {
  const inbox=await nearby.listInbox();
  for(const received of inbox.items) {
    try {
      const data=await nearby.readInbox({inboxId:received.inboxId}),{pkg,submission}=await parsePackage(data.packageJson);
      if(!pkg.visited_device_ids.includes(snapshot.native!.deviceId)) throw new Error('Package forwarding history excludes this phone.');
      await importRelay(pkg,submission);
      // Only durable IDB import (or identical durable presence) authorizes acknowledgment.
      if(peers.has(received.endpointId)) await nearby.sendControl({endpointId:received.endpointId,control:{type:'peer_stored',id:submission.client_report_id,digest:pkg.content_sha256}});
      await nearby.acknowledgeInbox({inboxId:received.inboxId});
    } catch(error) {publish({error:`Received copy retained in native inbox: ${message(error)}`});}
  }
}
async function sendPending(endpointId:string,peer:Peer) {
  if(peer.active&&Date.now()<peer.active.deadline) return;
  let next=peer.active;
  if(next&&next.attempts>=4) {peer.active=undefined;publish({error:'Nearby transfer retries paused. Reconnect the phones to try again.'});return;}
  if(!next) {const pair=peer.outgoing.shift();if(!pair)return;next={...pair,attempts:0,deadline:0};}
  const item=(await listQueued()).find(x=>x.client_report_id===next.id);
  if(!item?.relay||item.relay.content_sha256!==next.digest||item.rejected||item.superseded_by||item.relay_receipt) {peer.active=undefined;return;}
  if(item.relay.hop_count>=3||item.relay.visited_device_ids.includes(peer.deviceId)) {peer.active=undefined;return;}
  peer.active={...next,attempts:next.attempts+1,deadline:Date.now()+120000+Math.min(30000,1000*2**next.attempts)};
  try {await nearby.sendReport({endpointId,packageJson:JSON.stringify(forwardPackage(item.relay,peer.deviceId))});}
  catch(error) {publish({error:message(error)});}
}
export async function gatewayUpload(item:QueueItem) {
  // POST reconciles the immutable payload. UUID receipt alone never authorizes deletion.
  const record=await api.create(item,true);
  if(record.client_report_id!==item.client_report_id||!record.id) throw new Error('API acknowledgment did not match this source.');
  if(record.sync_status==='pending') await api.sync(true);
  const receipt=await api.receipt(item.client_report_id);
  if(receipt.client_report_id!==item.client_report_id||receipt.report_id!==record.id||receipt.sync_status!=='synced') throw new Error('Server accepted this source but hub delivery remains pending.');
  await acknowledge(item.client_report_id,record,receipt);
  if(item.relay) for(const endpointId of peers.keys()) await nearby.sendControl({endpointId,control:{type:'hub_receipt',id:item.client_report_id,digest:item.relay.content_sha256,origin:getOrigin(),receipt}}).catch(()=>{});
}
export function wakeSharing() {
  if(!nearbySupported()||!foreground||!snapshot.native?.enabled) return Promise.resolve();
  if(active) {rerun=true;return active;}
  active=(async()=>{
    publish({working:true});
    do {
      rerun=false;
      for(const item of await listQueued()) if(!item.relay&&!item.rejected&&!item.superseded_by) {
        try {await updateQueued(item.client_report_id,{relay:await preparePackage(item,snapshot.native!.deviceId),relay_origin:true});}
        catch(error){publish({error:`Source kept locally; cannot share: ${message(error)}`});}
      }
      await importInbox();
      for(const [endpointId,peer] of peers) await sendPending(endpointId,peer);
      let reachable=false;try {const health=await api.health();reachable=health.status==='ok';}catch{ /* Retain all pending sources. */ }
      if(reachable&&foreground) for(const item of await listQueued()) {
        if(item.rejected||item.superseded_by||item.attempts>=6||(item.retry_at??0)>Date.now()) continue;
        try {await gatewayUpload(item);}
        catch(error) {
          await markRejected(item.client_report_id,error);
          const blocked=error instanceof ApiError&&[413,415,422].includes(error.status);
          await updateQueued(item.client_report_id,{retry_at:Date.now()+Math.min(300000,15000*2**Math.min(item.attempts,5))});
          if(blocked) publish({error:'A saved source needs recovery in Queue.'});
        }
      }
      // Refresh inventories once per serialized pass; repeated events do not create uploads.
      for(const endpointId of peers.keys()) await inventory(endpointId);
    } while(rerun&&foreground&&snapshot.native?.enabled);
  })().catch(error=>publish({error:message(error)})).finally(()=>{active=undefined;publish({working:false});});
  return active;
}
async function event(data:NearbyEvent) {
  try {
    if(data.type==='peer'&&data.endpointId&&data.deviceId) {requireUuid(data.deviceId);peers.set(data.endpointId,{deviceId:data.deviceId,outgoing:[]});}
    if(data.type==='disconnected'&&data.endpointId) peers.delete(data.endpointId);
    if(data.type==='state') {const state=await nearby.getState();publish({native:state});if(!state.running) peers.clear();}
    if(data.type==='control'&&data.endpointId) await control(data.endpointId,data.control);
    if(data.type==='error') publish({error:data.message??'Nearby transfer failed.'});
    if(data.type==='progress') publish({progress:`Photo transfer ${data.total?Math.round(100*(data.transferred??0)/data.total):0}%`});
    if(data.type!=='progress') {publish({});void wakeSharing();}
  }catch(error){publish({error:message(error)});}
}
export async function enableSharing(enabled:boolean) {
  publish({error:''});
  try {if(enabled) publish({native:await nearby.start()});else{await nearby.stop();peers.clear();publish({native:await nearby.getState(),progress:''});}void wakeSharing();}
  catch(error){publish({error:message(error)});}
}
export async function initializeSharing() {
  if(!nearbySupported()) return ()=>{};
  const listener=await nearby.addListener('event',data=>{void event(data);});
  publish({native:await nearby.getState()});
  const app=await NativeApp.addListener('appStateChange',({isActive})=>{foreground=isActive;if(isActive) void wakeSharing();else peers.clear();});
  const changed=()=>{void wakeSharing();};window.addEventListener('reliefmesh-queue',changed);
  const timer=setInterval(changed,15000);
  if(snapshot.native?.enabled) await enableSharing(true);
  return ()=>{clearInterval(timer);window.removeEventListener('reliefmesh-queue',changed);void listener.remove();void app.remove();};
}
