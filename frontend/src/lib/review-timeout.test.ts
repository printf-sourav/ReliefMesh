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
it('allows saved-source reanalysis the same inference budget',async()=>{
  const timeout=vi.spyOn(AbortSignal,'timeout');
  vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>new Response('{}')));
  await api.reanalyze('saved-id'); expect(timeout).toHaveBeenCalledWith(120000);
});
it('reports an actual inference timeout without repeating inference',async()=>{
  vi.useFakeTimers();vi.spyOn(AbortSignal,'timeout').mockImplementation(ms=>{const c=new AbortController();setTimeout(()=>c.abort(),ms);return c.signal;});
  const fetch=vi.fn((_url:string,init:RequestInit)=>new Promise<Response>((_resolve,reject)=>init.signal?.addEventListener('abort',()=>reject(new DOMException('Timeout','AbortError')))));
  vi.stubGlobal('fetch',fetch);
  const outcome=api.reanalyze('saved-id').catch(error=>error);await vi.advanceTimersByTimeAsync(120001);
  expect(await outcome).toMatchObject({code:'REQUEST_TIMEOUT'});expect((await outcome).message).toContain('Analysis may still be running'); expect(fetch).toHaveBeenCalledTimes(1);
});
