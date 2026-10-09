import type { Submission } from './api-types';
import { validateImage } from './draft';
import { validateSubmission } from './queue';
export interface RelayPackage {
  version:1; origin_device_id:string; source_json:string; image_base64:string;
  content_sha256:string; hop_count:number; visited_device_ids:string[];
}
export const MAX_PACKAGE=16*1024*1024, MAX_METADATA=64*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function requireUuid(value:unknown): asserts value is string { if(typeof value!=='string'||!uuid.test(value)) throw new Error('Invalid report/device UUID.'); }
export function immutableSource(draft:Submission) {
  const {client_report_id,original_text,location,latitude,longitude,analysis_result,edited_analysis,image_name,image_mime}=draft;
  return JSON.stringify({metadata:{client_report_id,original_text,location,latitude,longitude,analysis_result,edited_analysis},image_name,image_mime});
}
export async function contentDigest(source:string, bytes:Uint8Array) {
  const text=new TextEncoder().encode(source); if(text.length>MAX_METADATA) throw new Error('Report metadata exceeds 64 KiB.');
  const combined=new Uint8Array(4+text.length+bytes.length); new DataView(combined.buffer).setUint32(0,text.length,false);combined.set(text,4);combined.set(bytes,4+text.length);
  const hash=await crypto.subtle.digest('SHA-256',combined);
  return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
}
function base64(bytes:Uint8Array) { let result='';for(let n=0;n<bytes.length;n+=8192) result+=String.fromCharCode(...bytes.subarray(n,n+8192));return btoa(result); }
function bytesFrom64(text:string) {
  // Repeated capture groups can exhaust V8's regex stack on permitted large photos.
  if(text.length>14*1024*1024||text.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw new Error('Invalid photo encoding.');
  const decoded=atob(text);
  if(btoa(decoded)!==text) throw new Error('Invalid photo encoding.');
  return Uint8Array.from(decoded,x=>x.charCodeAt(0));
}
export async function preparePackage(draft:Submission,deviceId:string):Promise<RelayPackage> {
  requireUuid(draft.client_report_id); requireUuid(deviceId);validateSubmission(draft);await validateImage(draft.image);
  const source_json=immutableSource(draft), bytes=new Uint8Array(await draft.image.arrayBuffer());
  const pkg:RelayPackage={version:1,origin_device_id:deviceId,source_json,image_base64:base64(bytes),content_sha256:await contentDigest(source_json,bytes),hop_count:0,visited_device_ids:[deviceId]};
  if(new TextEncoder().encode(JSON.stringify(pkg)).length>MAX_PACKAGE) throw new Error('Nearby package exceeds 16 MiB. Resize the photo.');
  return pkg;
}
function onlyKeys(value:object,allowed:string[]) { if(Object.keys(value).some(key=>!allowed.includes(key))) throw new Error('Package contains unsupported metadata.'); }
export async function parsePackage(text:string):Promise<{pkg:RelayPackage;submission:Submission}> {
  if(new TextEncoder().encode(text).length>MAX_PACKAGE) throw new Error('Nearby package exceeds 16 MiB.');
  const pkg=JSON.parse(text) as RelayPackage;
  onlyKeys(pkg,['version','origin_device_id','source_json','image_base64','content_sha256','hop_count','visited_device_ids']);
  if(pkg.version!==1||typeof pkg.source_json!=='string'||typeof pkg.image_base64!=='string'||typeof pkg.content_sha256!=='string'||!/^[a-f0-9]{64}$/.test(pkg.content_sha256)) throw new Error('Invalid nearby package.');
  requireUuid(pkg.origin_device_id);
  if(!Number.isInteger(pkg.hop_count)||pkg.hop_count<0||pkg.hop_count>3||!Array.isArray(pkg.visited_device_ids)||pkg.visited_device_ids.length!==pkg.hop_count+1||new Set(pkg.visited_device_ids).size!==pkg.visited_device_ids.length||pkg.visited_device_ids[0]!==pkg.origin_device_id) throw new Error('Invalid forwarding history.');
  pkg.visited_device_ids.forEach(requireUuid);
  const bytes=bytesFrom64(pkg.image_base64);
  if(bytes.length>10*1024*1024||await contentDigest(pkg.source_json,bytes)!==pkg.content_sha256) throw new Error('Report/photo digest mismatch.');
  const source=JSON.parse(pkg.source_json);
  onlyKeys(source,['metadata','image_name','image_mime']);
  onlyKeys(source.metadata,['client_report_id','original_text','location','latitude','longitude','analysis_result','edited_analysis']);
  requireUuid(source.metadata.client_report_id);
  if(typeof source.image_name!=='string'||!source.image_name.trim()||Array.from(source.image_name).length>255||typeof source.image_mime!=='string') throw new Error('Invalid photo metadata.');
  if(typeof source.metadata.original_text!=='string'||typeof source.metadata.location!=='string') throw new Error('Invalid source text.');
  const submission:Submission={...source.metadata,latitude:source.metadata.latitude??null,longitude:source.metadata.longitude??null,analysis_result:source.metadata.analysis_result??null,edited_analysis:source.metadata.edited_analysis??null,image_name:source.image_name,image_mime:source.image_mime,image:new Blob([bytes],{type:source.image_mime})};
  validateSubmission(submission);await validateImage(submission.image);return {pkg,submission};
}
export function forwardPackage(pkg:RelayPackage,peerDevice:string):RelayPackage {
  requireUuid(peerDevice);
  if(pkg.hop_count>=3||pkg.visited_device_ids.includes(peerDevice)) throw new Error('Forwarding limit or visited phone.');
  return {...pkg,hop_count:pkg.hop_count+1,visited_device_ids:[...pkg.visited_device_ids,peerDevice]};
}
