import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
export interface NearbyState { enabled:boolean; running:boolean; configured:boolean; deviceId:string; groupId:string; peers:number; status:string }
export interface NearbyEvent { type:'state'|'peer'|'disconnected'|'control'|'inbox'|'progress'|'error'; endpointId?:string; deviceId?:string; inboxId?:string; message?:string; control?:unknown; payloadId?:string; transferred?:number; total?:number }
export interface NearbyPlugin {
  configureGroup(options:{groupId:string;key?:string;generate?:boolean}):Promise<{groupId:string;key?:string}>;
  start():Promise<NearbyState>; stop():Promise<void>; getState():Promise<NearbyState>;
  sendReport(options:{endpointId:string;packageJson:string}):Promise<{payloadId:string}>;
  sendControl(options:{endpointId:string;control:unknown}):Promise<void>;
  listInbox():Promise<{items:{inboxId:string;endpointId:string;deviceId:string}[]}>;
  readInbox(options:{inboxId:string}):Promise<{packageJson:string}>;
  acknowledgeInbox(options:{inboxId:string}):Promise<void>;
  addListener(event:'event',callback:(event:NearbyEvent)=>void):Promise<PluginListenerHandle>;
}
export const nearbySupported=()=>Capacitor.getPlatform()==='android';
export const nearby=registerPlugin<NearbyPlugin>('ReliefMeshNearby');
