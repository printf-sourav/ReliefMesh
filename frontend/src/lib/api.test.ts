import { expect, it } from 'vitest';
import { multipart, validateOrigin } from './api';
import type { QueueItem } from './queue';
it('sends source metadata inside multipart and leaves boundary generation to fetch', () => {
  const data = multipart({ client_report_id:'id', original_text:'Flood', location:'School', latitude:null, longitude:null, image:new Blob(['image'],{type:'image/png'}), image_name:'source.png',image_mime:'image/png' }, { network_online:false });
  expect(JSON.parse(data.get('metadata') as string)).toMatchObject({ client_report_id:'id',network_online:false });
  expect(data.get('image')).toBeInstanceOf(File); expect(JSON.parse(data.get('metadata') as string)).not.toHaveProperty('image');
});
it('excludes local queue bookkeeping from retry metadata', () => {
  const queued: QueueItem = { client_report_id:'stable',original_text:'Flood',location:'School',latitude:null,longitude:null,image:new Blob(['image'],{type:'image/png'}),image_name:'source.png',image_mime:'image/png',analysis_result:null,edited_analysis:null,created_at:'2026-10-09T00:00:00Z',attempts:2,last_error:'Timeout',server_id:null };
  const body = JSON.parse(multipart(queued).get('metadata') as string);
  expect(Object.keys(body).sort()).toEqual(['client_report_id','latitude','location','longitude','original_text']);
});
it('accepts reachable demo origins while rejecting paths, credentials and scripts', () => {
  expect(validateOrigin('http://192.168.1.20:8000')).toBe('http://192.168.1.20:8000');
  for (const invalid of ['javascript:alert(1)','https://user:secret@example.com','https://example.com/api','https://example.com?key=x']) expect(() => validateOrigin(invalid)).toThrow();
});
