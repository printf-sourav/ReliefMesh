import { afterEach, expect, it, vi } from 'vitest';
import { api } from './api';
import type { Draft } from './api-types';
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('allows a 70-second analysis response within the backend 90-second inference budget',async () => {
  vi.useFakeTimers();
  vi.spyOn(AbortSignal,'timeout').mockImplementation(ms => {
    const controller=new AbortController(); setTimeout(() => controller.abort(),ms); return controller.signal;
  });
  vi.stubGlobal('fetch',vi.fn((_url:string,init:RequestInit) => new Promise<Response>((resolve,reject) => {
    setTimeout(() => resolve(new Response(JSON.stringify({analysis_mode:'live'}))),70000);
    init.signal?.addEventListener('abort',() => reject(new DOMException('Aborted','AbortError')));
  })));
  const draft: Draft={client_report_id:'review-id',original_text:'Flood',location:'School',latitude:null,longitude:null,image:new Blob(['image'],{type:'image/png'}),image_name:'source.png',image_mime:'image/png'};
  const outcome=api.analyze(draft).catch(error => error);
  await vi.advanceTimersByTimeAsync(70001);
  expect(await outcome).toMatchObject({analysis_mode:'live'});
});
