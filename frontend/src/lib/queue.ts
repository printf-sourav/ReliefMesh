import { openDB, type DBSchema } from 'idb';
import { api, ApiError } from './api';
import { createReportId, validateDraft, validateImage } from './draft';
import { cleanAnalysis } from '../components/analysis-editor';
import type { RelayPackage } from './mesh-package';
import { immutableSource } from './mesh-package';
import type { DeliveryReceipt } from './api-types';
import type { IncidentRecord, Submission } from './api-types';
export interface QueueItem extends Submission {
  created_at: string; attempts: number; last_error: string | null; server_id: string | null;
  rejected?: boolean; error_code?: string; recovery_of?: string; superseded_by?: string;
  relay?: RelayPackage; relay_origin?:boolean; peer_stored?:boolean; relay_receipt?:DeliveryReceipt;
  retry_at?:number;
}
export interface Delivered {client_report_id:string;digest:string;location:string;receipt?:DeliveryReceipt;confirmed_at:string}
interface QueueDB extends DBSchema { reports: { key: string; value: QueueItem }; tombstones:{key:string;value:Delivered} }
export const openQueueDB = () => openDB<QueueDB>('reliefmesh-device', 2, { upgrade(database,oldVersion) {
  if(oldVersion<1) database.createObjectStore('reports', { keyPath: 'client_report_id' });
  if(oldVersion<2) database.createObjectStore('tombstones',{keyPath:'client_report_id'});
} });
const db=openQueueDB;
export function queueChanged() { if(typeof window!=='undefined') window.dispatchEvent(new Event('reliefmesh-queue')); }
export async function saveQueued(draft: Submission): Promise<void> {
  validateSubmission(draft);
  const database = await db();
  const existing = await database.get('reports',draft.client_report_id);
  if(existing) {
    const [oldBytes,newBytes]=await Promise.all([existing.image.arrayBuffer(),draft.image.arrayBuffer()]);
    const a=new Uint8Array(oldBytes),b=new Uint8Array(newBytes);
    if(immutableSource(existing)!==immutableSource(draft)||a.length!==b.length||a.some((v,i)=>v!==b[i])) {database.close();throw new Error('This immutable report ID already has a different source. Create a new report ID.');}
    database.close();return;
  }
  const tx = database.transaction('reports', 'readwrite');
  await tx.store.add({ ...draft, created_at: new Date().toISOString(), attempts:0, last_error:null, server_id:null });
  await tx.done;
  database.close();
  queueChanged();
}
export function validateSubmission(draft: Submission) {
  validateDraft(draft);
  if (draft.analysis_result) {
    cleanAnalysis(draft.analysis_result.analysis);
    const model=draft.analysis_result.model_id.trim();
    if (!model || Array.from(model).length > 10000) throw new Error('Analysis model identifier is invalid.');
    if (!['live','fixture'].includes(draft.analysis_result.analysis_mode)) throw new Error('Analysis mode is invalid.');
  }
  if (draft.edited_analysis) cleanAnalysis(draft.edited_analysis);
}
export async function listQueued() {
  const database = await db(); const items = await database.getAll('reports'); database.close();
  return items.sort((a, b) => a.created_at.localeCompare(b.created_at));
}
async function put(item: QueueItem) {
  const database = await db(); const tx = database.transaction('reports', 'readwrite'); await tx.store.put(item); await tx.done; database.close();
}
export async function updateQueued(id:string,patch:Partial<Pick<QueueItem,'relay'|'relay_origin'|'peer_stored'|'relay_receipt'|'retry_at'|'last_error'>>) {
  const database=await db();const tx=database.transaction('reports','readwrite');const item=await tx.store.get(id);
  if(item) await tx.store.put({...item,...patch});await tx.done;database.close();queueChanged();
}
export async function listDelivered() {const database=await db();const result=await database.getAll('tombstones');database.close();return result;}
export async function importRelay(pkg:RelayPackage,source:Submission) {
  const database=await db();const tx=database.transaction(['reports','tombstones'],'readwrite');
  const item=await tx.objectStore('reports').get(source.client_report_id), done=await tx.objectStore('tombstones').get(source.client_report_id);
  const digest=item?.relay?.content_sha256??done?.digest;
  if((item&&!item.relay)||digest&&digest!==pkg.content_sha256) {tx.abort();await tx.done.catch(()=>{});database.close();throw new Error('Conflicting immutable report UUID/digest. Original retained.');}
  if(!item&&!done) await tx.objectStore('reports').add({...source,created_at:new Date().toISOString(),attempts:0,last_error:null,server_id:null,relay:pkg,relay_origin:false});
  await tx.done;database.close();queueChanged();return {duplicate:!!(item||done)};
}
export async function markRejected(id: string, error: unknown) {
  const database=await db(); const item=await database.get('reports',id); database.close();
  if (!item) return;
  const permanent=error instanceof ApiError && ([413,415,422].includes(error.status) || error.code==='IDEMPOTENCY_CONFLICT');
  await put({...item,attempts:item.attempts+1,last_error:error instanceof Error ? error.message : 'Unconfirmed delivery',rejected:permanent,error_code:error instanceof ApiError ? error.code : undefined});
}
export async function recoverRejected(id: string, source: Pick<Submission,'original_text'|'location'|'image'|'image_name'|'image_mime'>) {
  const database=await db(); const original=await database.get('reports',id);
  if (!original?.rejected || original.superseded_by) { database.close(); throw new Error('This report is not awaiting recovery.'); }
  const replacement: QueueItem={...original,...source,client_report_id:createReportId(),analysis_result:null,edited_analysis:null,created_at:new Date().toISOString(),attempts:0,last_error:null,server_id:null,rejected:false,error_code:undefined,recovery_of:id,superseded_by:undefined,relay:undefined,relay_origin:undefined,peer_stored:false,relay_receipt:undefined,retry_at:undefined};
  try {
    validateSubmission(replacement); await validateImage(replacement.image);
    const tx=database.transaction('reports','readwrite');
    const current=await tx.store.get(id);
    if (!current?.rejected || current.superseded_by) { tx.abort();await tx.done.catch(()=>{});throw new Error('Recovery has already started.'); }
    await tx.store.add(replacement); await tx.store.put({...current,superseded_by:replacement.client_report_id}); await tx.done;
    queueChanged();return replacement;
  } finally { database.close(); }
}
export async function acknowledge(id: string, record: IncidentRecord,receipt?:DeliveryReceipt) {
  if (record.client_report_id !== id || !record.id) throw new Error('API acknowledgment did not match the saved report.');
  const database = await db(); const tx = database.transaction(['reports','tombstones'], 'readwrite');const reports=tx.objectStore('reports');
  const item=await reports.get(id);
  if(item?.relay&&record.sync_status!=='synced') {await reports.put({...item,server_id:record.id,last_error:'Accepted by API; hub delivery pending.'});await tx.done;database.close();queueChanged();return;}
  if(item?.relay) await tx.objectStore('tombstones').put({client_report_id:id,digest:item.relay.content_sha256,location:item.location,receipt,confirmed_at:new Date().toISOString()});
  if (item?.recovery_of) await reports.delete(item.recovery_of);
  await reports.delete(id); await tx.done; database.close();queueChanged();
}
let activeDelivery: Promise<{ delivered: number; errors: string[] }> | undefined;
export function deliverQueue(transportOnline: boolean) {
  if (activeDelivery) return activeDelivery;
  activeDelivery = (async () => {
    let delivered = 0; const errors: string[] = [];
    for (const item of await listQueued()) {
      if (item.rejected || item.superseded_by) continue;
      try {
        if(item.relay){if(!transportOnline)continue;const {gatewayUpload}=await import('./mesh');await gatewayUpload(item);delivered++;continue;}
        const record = await api.create(item, transportOnline);
        await acknowledge(item.client_report_id, record); delivered++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unconfirmed delivery'; errors.push(message);
        await markRejected(item.client_report_id,error);
      }
    }
    return { delivered, errors };
  })().finally(() => { activeDelivery = undefined; });
  return activeDelivery;
}
