import { openDB, type DBSchema } from 'idb';
import { api, ApiError } from './api';
import { createReportId, validateDraft, validateImage } from './draft';
import { cleanAnalysis } from '../components/analysis-editor';
import type { IncidentRecord, Submission } from './api-types';
export interface QueueItem extends Submission {
  created_at: string; attempts: number; last_error: string | null; server_id: string | null;
  rejected?: boolean; error_code?: string; recovery_of?: string; superseded_by?: string;
}
interface QueueDB extends DBSchema { reports: { key: string; value: QueueItem } }
const db = () => openDB<QueueDB>('reliefmesh-device', 1, { upgrade(database) { database.createObjectStore('reports', { keyPath: 'client_report_id' }); } });
export async function saveQueued(draft: Submission): Promise<void> {
  validateSubmission(draft);
  const database = await db();
  const tx = database.transaction('reports', 'readwrite');
  const existing = await tx.store.get(draft.client_report_id);
  await tx.store.put({ ...draft, created_at: existing?.created_at ?? new Date().toISOString(), attempts: existing?.attempts ?? 0, last_error: null, server_id: existing?.server_id ?? null });
  await tx.done;
  database.close();
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
export async function markRejected(id: string, error: unknown) {
  const database=await db(); const item=await database.get('reports',id); database.close();
  if (!item) return;
  const permanent=error instanceof ApiError && ([413,415,422].includes(error.status) || error.code==='IDEMPOTENCY_CONFLICT');
  await put({...item,attempts:item.attempts+1,last_error:error instanceof Error ? error.message : 'Unconfirmed delivery',rejected:permanent,error_code:error instanceof ApiError ? error.code : undefined});
}
export async function recoverRejected(id: string, source: Pick<Submission,'original_text'|'location'|'image'|'image_name'|'image_mime'>) {
  const database=await db(); const original=await database.get('reports',id);
  if (!original?.rejected || original.superseded_by) { database.close(); throw new Error('This report is not awaiting recovery.'); }
  const replacement: QueueItem={...original,...source,client_report_id:createReportId(),analysis_result:null,edited_analysis:null,created_at:new Date().toISOString(),attempts:0,last_error:null,server_id:null,rejected:false,error_code:undefined,recovery_of:id,superseded_by:undefined};
  try {
    validateSubmission(replacement); await validateImage(replacement.image);
    const tx=database.transaction('reports','readwrite');
    const current=await tx.store.get(id);
    if (!current?.rejected || current.superseded_by) { tx.abort(); throw new Error('Recovery has already started.'); }
    await tx.store.add(replacement); await tx.store.put({...current,superseded_by:replacement.client_report_id}); await tx.done;
    return replacement;
  } finally { database.close(); }
}
export async function acknowledge(id: string, record: IncidentRecord) {
  if (record.client_report_id !== id || !record.id) throw new Error('API acknowledgment did not match the saved report.');
  const database = await db(); const tx = database.transaction('reports', 'readwrite');
  const item=await tx.store.get(id);
  if (item?.recovery_of) await tx.store.delete(item.recovery_of);
  await tx.store.delete(id); await tx.done; database.close();
}
let activeDelivery: Promise<{ delivered: number; errors: string[] }> | undefined;
export function deliverQueue(transportOnline: boolean) {
  if (activeDelivery) return activeDelivery;
  activeDelivery = (async () => {
    let delivered = 0; const errors: string[] = [];
    for (const item of await listQueued()) {
      if (item.rejected || item.superseded_by) continue;
      try {
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
