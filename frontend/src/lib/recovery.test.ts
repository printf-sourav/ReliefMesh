import { beforeEach, expect, it, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { api, ApiError } from './api';
import { acknowledge, deliverQueue, listQueued, recoverRejected, saveQueued } from './queue';
import type { IncidentRecord, Submission } from './api-types';
vi.mock('./draft',async original=>({...await original<typeof import('./draft')>(),validateImage:vi.fn().mockResolvedValue(undefined)}));
const source: Submission={client_report_id:'old-source',original_text:'Flood',location:'River',latitude:null,longitude:null,image:new NodeBlob(['original photo'],{type:'image/png'}) as Blob,image_name:'original.png',image_mime:'image/png',analysis_result:null,edited_analysis:null};
beforeEach(async()=>{for(const item of await listQueued()) await acknowledge(item.client_report_id,{id:'server',client_report_id:item.client_report_id} as IncidentRecord);});
it('pauses permanently rejected reports and preserves the original until replacement acknowledgment',async()=>{
  await saveQueued(source); const create=vi.spyOn(api,'create').mockRejectedValueOnce(new ApiError('IMAGE_TOO_LARGE','Resize photo',413));
  await deliverQueue(true); await deliverQueue(true); expect(create).toHaveBeenCalledTimes(1);
  const original=(await listQueued())[0]; expect(original.rejected).toBe(true);
  const replacement=await recoverRejected(source.client_report_id,{original_text:'Corrected flood description',location:'River',image:source.image,image_name:source.image_name,image_mime:source.image_mime});
  expect(replacement.client_report_id).not.toBe(source.client_report_id); expect(replacement.analysis_result).toBeNull();
  const stored=await listQueued();expect(stored).toHaveLength(2); expect(stored.find(x=>x.client_report_id===source.client_report_id)?.image.size).toBe(source.image.size);
  expect(stored.find(x=>x.client_report_id===source.client_report_id)?.original_text).toBe('Flood');
  create.mockResolvedValue({id:'server',client_report_id:replacement.client_report_id} as IncidentRecord);
  await deliverQueue(true); expect(await listQueued()).toHaveLength(0);
});
it('does not change or remove the original when recovery validation fails',async()=>{
  await saveQueued(source);vi.spyOn(api,'create').mockRejectedValueOnce(new ApiError('VALIDATION_ERROR','Invalid text',422));await deliverQueue(true);
  await expect(recoverRejected(source.client_report_id,{original_text:' ',location:'River',image:source.image,image_name:source.image_name,image_mime:source.image_mime})).rejects.toThrow();
  expect((await listQueued())[0].superseded_by).toBeUndefined(); expect(await listQueued()).toHaveLength(1);
});
