import { openDB, type DBSchema } from 'idb';
import { api } from './api';
import type { IncidentRecord, Submission } from './api-types';
export interface QueueItem extends Submission { created_at: string; attempts: number; last_error: string | null; server_id: string | null }
interface QueueDB extends DBSchema { reports: { key: string; value: QueueItem } }
const db = () => openDB<QueueDB>('reliefmesh-device', 1, { upgrade(database) { database.createObjectStore('reports', { keyPath: 'client_report_id' }); } });
export async function saveQueued(draft: Submission): Promise<void> {
  const database = await db();
  const tx = database.transaction('reports', 'readwrite');
  const existing = await tx.store.get(draft.client_report_id);
  await tx.store.put({ ...draft, created_at: existing?.created_at ?? new Date().toISOString(), attempts: existing?.attempts ?? 0, last_error: null, server_id: existing?.server_id ?? null });
  await tx.done;
  database.close();
}
export async function listQueued() {
  const database = await db(); const items = await database.getAll('reports'); database.close();
  return items.sort((a, b) => a.created_at.localeCompare(b.created_at));
}
async function put(item: QueueItem) {
  const database = await db(); const tx = database.transaction('reports', 'readwrite'); await tx.store.put(item); await tx.done; database.close();
}
export async function acknowledge(id: string, record: IncidentRecord) {
  if (record.client_report_id !== id || !record.id) throw new Error('API acknowledgment did not match the saved report.');
  const database = await db(); const tx = database.transaction('reports', 'readwrite'); await tx.store.delete(id); await tx.done; database.close();
}
let activeDelivery: Promise<{ delivered: number; errors: string[] }> | undefined;
export function deliverQueue(transportOnline: boolean) {
  if (activeDelivery) return activeDelivery;
  activeDelivery = (async () => {
    let delivered = 0; const errors: string[] = [];
    for (const item of await listQueued()) {
      try {
        const record = await api.create(item, transportOnline);
        await acknowledge(item.client_report_id, record); delivered++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unconfirmed delivery'; errors.push(message);
        await put({ ...item, attempts: item.attempts + 1, last_error: message });
      }
    }
    return { delivered, errors };
  })().finally(() => { activeDelivery = undefined; });
  return activeDelivery;
}
