import { expect, it, vi } from 'vitest';
import { validateDraft, validateImage } from './draft';
import { cleanAnalysis } from '../components/analysis-editor';
import { api } from './api';
import type { Draft, IncidentAnalysis } from './api-types';
const draft: Draft={client_report_id:'id',original_text:'text',location:'place',latitude:null,longitude:null,image:new Blob(['photo'],{type:'image/png'}),image_name:'photo.png',image_mime:'image/png'};
const analysis: IncidentAnalysis={incident_type:'Flood',summary:'Water',people_affected:null,vulnerable_people:[],reported_needs:[],location_context:'River',language:'Hindi',image_observations:[],confidence:null,verification_required:true};
it('rejects source text and location over backend limits',()=>{
  expect(()=>validateDraft({...draft,original_text:'x'.repeat(10000),location:'x'.repeat(300)})).not.toThrow();
  expect(()=>validateDraft({...draft,original_text:'😀'.repeat(10000)})).not.toThrow();
  expect(()=>validateDraft({...draft,original_text:'x'.repeat(10001)})).toThrow();
  expect(()=>validateDraft({...draft,location:'x'.repeat(301)})).toThrow();
});
it('requires location context and bounded analysis strings',()=>{
  expect(cleanAnalysis({...analysis,summary:'x'.repeat(10000)}).summary).toHaveLength(10000);
  expect(()=>cleanAnalysis({...analysis,location_context:'  '})).toThrow();
  expect(()=>cleanAnalysis({...analysis,summary:'x'.repeat(10001)})).toThrow();
});
it('accepts the exact image pixel and byte limits',async()=>{
  vi.stubGlobal('URL',class extends URL {static createObjectURL(){return 'blob:test';} static revokeObjectURL(){}});
  vi.stubGlobal('Image',class {naturalWidth=5000;naturalHeight=4000;onload!:()=>void;set src(_:string){this.onload();}});
  await expect(validateImage(new Blob([new Uint8Array(10*1024*1024)],{type:'image/png'}))).resolves.toBeUndefined();
  await expect(validateImage(new Blob([new Uint8Array(10*1024*1024+1)],{type:'image/png'}))).rejects.toThrow(/MiB/);
});
it('allows 120 seconds for both explicit inference operations',async()=>{
  const timeout=vi.spyOn(AbortSignal,'timeout'); vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>new Response('{}')));
  await api.analyze(draft); await api.reanalyze('id');
  expect(timeout.mock.calls.map(x=>x[0])).toEqual([120000,120000]);
});
it('rejects more than 20 million decoded pixels',async()=>{
  vi.stubGlobal('URL',class extends URL {static createObjectURL(){return 'blob:test';} static revokeObjectURL(){}});
  vi.stubGlobal('Image',class {naturalWidth=5000;naturalHeight=4001;onload!:()=>void;set src(_:string){this.onload();}});
  await expect(validateImage(new File(['photo'],'photo.png',{type:'image/png'}))).rejects.toThrow(/pixels/);
});
