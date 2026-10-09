import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';
import { acknowledge, deliverQueue, listQueued, saveQueued } from './queue';
import type { IncidentRecord, Submission } from './api-types';
import { Blob as NodeBlob } from 'node:buffer';
// fake-indexeddb uses Node structuredClone; jsdom's Blob is not cloneable there.
const draft = (id: string): Submission => ({ client_report_id:id, original_text:'Paani aa gaya. Chaar log hain.', location:'Riverside', latitude:null, longitude:null, image:new NodeBlob(['photo'], { type:'image/png' }) as Blob, image_name:'flood.png', image_mime:'image/png', analysis_result:null, edited_analysis:null });
beforeEach(async () => { for (const item of await listQueued()) await acknowledge(item.client_report_id, { id:'server', client_report_id:item.client_report_id } as IncidentRecord); });
describe('durable device delivery', () => {
  it('persists image bytes and the same UUID across reopening', async () => {
    await saveQueued(draft('stable-uuid'));
    const [item] = await listQueued();
    expect(item.client_report_id).toBe('stable-uuid'); expect(item.image.size).toBe(5); expect(item.analysis_result).toBeNull();
    await saveQueued(draft('stable-uuid')); expect(await listQueued()).toHaveLength(1);
  });
  it('retains a timeout and retries the original UUID only after positive acknowledgment', async () => {
    await saveQueued(draft('timeout-uuid'));
    const create = vi.spyOn(api,'create').mockRejectedValueOnce(new Error('Timeout'));
    expect((await deliverQueue(true)).errors).toEqual(['Timeout']);
    expect((await listQueued())[0].attempts).toBe(1);
    create.mockResolvedValue({ id:'saved', client_report_id:'timeout-uuid' } as IncidentRecord);
    await deliverQueue(true); expect(await listQueued()).toHaveLength(0);
    expect(create.mock.calls.map(call => call[0].client_report_id)).toEqual(['timeout-uuid','timeout-uuid']);
  });
  it('rejects a mismatched response without deleting local evidence', async () => {
    await saveQueued(draft('owned-uuid'));
    vi.spyOn(api,'create').mockResolvedValue({ id:'other', client_report_id:'different' } as IncidentRecord);
    expect((await deliverQueue(true)).delivered).toBe(0); expect(await listQueued()).toHaveLength(1);
  });
  it('coalesces overlapping sync clicks', async () => {
    await saveQueued(draft('single-uuid'));
    const create = vi.spyOn(api,'create').mockResolvedValue({ id:'one', client_report_id:'single-uuid' } as IncidentRecord);
    await Promise.all([deliverQueue(false),deliverQueue(false)]); expect(create).toHaveBeenCalledTimes(1); expect(create.mock.calls[0][1]).toBe(false);
  });
});
