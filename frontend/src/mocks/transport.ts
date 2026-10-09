// Private development HTTP fixtures. Never activate as a network-error fallback.
import { ApiError } from '../lib/api';
import { createReportId } from '../lib/draft';
import type { AnalysisResult, ClusterSummary, IncidentAnalysis, IncidentRecord } from '../lib/api-types';
const now = '2026-10-09T05:20:00Z';
const road: IncidentAnalysis = { incident_type:'Road flooding', summary:'Floodwater is blocking the road near City School. The citizen reports that the road cannot be crossed.', people_affected:null,vulnerable_people:[],reported_needs:['Safe passage'],location_context:'Road near City School',language:'Hinglish',image_observations:['Illustrative synthetic image; no live image analysis.'],confidence:null,verification_required:true };
const home: IncidentAnalysis = { ...road,incident_type:'Residential flooding',summary:'Water has entered a home in Riverside Colony. Four people, including an elderly person, need drinking water.',people_affected:4,vulnerable_people:['Reported elderly person'],reported_needs:['Drinking water'],location_context:'Home in Riverside Colony' };
function seed(id: string,text: string,location: string,analysis: IncidentAnalysis): IncidentRecord { return { id,client_report_id:id,cluster_id:id,original_text:text,location,latitude:null,longitude:null,image_path:'fixture-synthetic',created_at:now,updated_at:now,analysis:structuredClone(analysis),original_analysis:structuredClone(analysis),analysis_mode:'fixture',model_id:'illustrative-development-fixture',verification_status:'pending',network_status_at_submission:'online',sync_status:'synced' }; }
const reports = [seed('00000000-0000-4000-8000-000000000001','City School ke paas pura road flooded hai.','City School',road),seed('00000000-0000-4000-8000-000000000002','Cannot cross road near City School because of flooding.','City School',{...road,language:'English'}),seed('00000000-0000-4000-8000-000000000003','Hamare ghar mein paani aa gaya hai. Chaar log hain. Ek elderly person hai aur drinking water chahiye.','Riverside Colony',home)];
const identities = new Map<string,string>(); const images = new Map<string,string>(); const dismissed = new Set<string>();
export function fixtureImage(id: string) { return images.get(id) ?? '/demo-flood.svg'; }
function fail(code: string,message: string,status = 409): never { throw new ApiError(code,message,status); }
function record(id: string) { return reports.find(item => item.id === id) ?? fail('NOT_FOUND','Fixture source not found.',404); }
function groups(): ClusterSummary[] {
  const ids = [...new Set(reports.filter(item => item.sync_status === 'synced').map(item => item.cluster_id))];
  return ids.map(cluster_id => {
    const sources = reports.filter(item => item.cluster_id === cluster_id && item.sync_status === 'synced');
    return { cluster_id,title:sources[0].analysis?.incident_type ?? 'Unanalyzed citizen report',report_count:sources.length,photo_count:sources.length,reported_needs:[...new Set(sources.flatMap(item => item.analysis?.reported_needs ?? []))],languages:[...new Set(sources.flatMap(item => item.analysis ? [item.analysis.language] : []))],people_counts_by_report:Object.fromEntries(sources.map(item => [item.id,item.analysis?.people_affected ?? null])),first_report_at:sources.map(item => item.created_at).sort()[0],latest_report_at:sources.map(item => item.created_at).sort().at(-1)!,verification_status:sources.every(item => item.verification_status === 'verified') ? 'verified' : 'pending' };
  });
}
export async function mockRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path,'https://fixture.local'); const route = url.pathname; const method = init?.method ?? 'GET';
  const result = (value: unknown) => structuredClone(value) as T;
  const page = (items: unknown[],extra = {}) => { const offset = Number(url.searchParams.get('offset') ?? 0); const limit = Number(url.searchParams.get('limit') ?? 50); return result({ items:items.slice(offset,offset+limit),total:items.length,offset,limit,...extra }); };
  if (route === '/health') return result({ status:'ok',ai_mode:'fixture',model_id:'illustrative-development-fixture' });
  if (route === '/analyses' && method === 'POST') return result({ analysis:home,analysis_mode:'fixture',model_id:'illustrative-development-fixture',warnings:['Illustrative scenario C output; no model inference performed. Edit fields to match your source.'] } satisfies AnalysisResult);
  if (route === '/reports' && method === 'POST') {
    const form = init!.body as FormData; const metadata = JSON.parse(form.get('metadata') as string); const image = form.get('image') as Blob;
    const bytes = Array.from(new Uint8Array(await image.arrayBuffer()));
    const { network_online,...identity } = metadata; const hash = JSON.stringify({ identity,bytes });
    const prior = reports.find(item => item.client_report_id === metadata.client_report_id);
    if (prior) { if (identities.get(metadata.client_report_id) !== hash) fail('IDEMPOTENCY_CONFLICT','Same UUID has a different fixture payload.'); return result(prior); }
    const item: IncidentRecord = { id:createReportId(),client_report_id:metadata.client_report_id,cluster_id:createReportId(),original_text:metadata.original_text,location:metadata.location,latitude:metadata.latitude,longitude:metadata.longitude,image_path:'fixture-upload',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),analysis:metadata.edited_analysis ?? metadata.analysis_result?.analysis ?? null,original_analysis:metadata.analysis_result?.analysis ?? null,analysis_mode:metadata.analysis_result?.analysis_mode ?? 'deferred',model_id:metadata.analysis_result?.model_id ?? null,verification_status:'pending',network_status_at_submission:network_online ? 'online' : 'offline',sync_status:network_online ? 'synced' : 'pending' };
    identities.set(item.client_report_id,hash); images.set(item.id,URL.createObjectURL(image)); reports.push(item); return result(item);
  }
  if (route === '/reports' && method === 'GET') return page(reports.filter(item => url.searchParams.get('synced_only') !== 'true' || item.sync_status === 'synced'));
  if (route === '/clusters') return page(groups());
  if (route === '/dashboard/metrics') return result({ active_clusters:groups().length,possible_duplicate_reports:reports.filter(item => item.sync_status === 'synced' && !dismissed.has(item.id) && reports.some(other => other.id !== item.id && other.cluster_id !== item.cluster_id && other.location === item.location && other.sync_status === 'synced')).length,pending_verification_reports:reports.filter(item => item.sync_status === 'synced' && item.verification_status === 'pending').length,pending_sync_reports:reports.filter(item => item.sync_status === 'pending').length });
  if (route === '/queue') return page(reports.filter(item => item.sync_status === 'pending'));
  if (route === '/sync') {
    const online = JSON.parse(init!.body as string).network_online; const ids: string[] = [];
    for (const item of reports) if (online && item.sync_status === 'pending') { item.sync_status='synced'; ids.push(item.id); }
    return result({ synced_report_ids:ids,pending_count:reports.filter(item => item.sync_status === 'pending').length });
  }
  const group = route.match(/^\/clusters\/([^/]+)\/reports$/);
  if (group) return page(reports.filter(item => item.cluster_id === group[1] && item.sync_status === 'synced'));
  const match = route.match(/^\/reports\/([^/]+)(?:\/(.+))?$/);
  if (match) {
    const item = record(match[1]); const action = match[2];
    if (!action) return result(item);
    if (action === 'duplicates') return page(dismissed.has(item.id) ? [] : reports.filter(other => other.id !== item.id && other.cluster_id !== item.cluster_id && other.location === item.location && other.sync_status === 'synced').map(other => ({ incident_id:other.id,cluster_id:other.cluster_id,similarity:.87,summary:other.analysis?.summary ?? other.original_text,location:other.location })),{ matching_available:true,warnings:['Preset fixture suggestion; no semantic embedding computation.'] });
    if (action === 'analysis') { item.analysis=JSON.parse(init!.body as string).analysis; item.verification_status='pending'; }
    if (action === 'analyses') { item.analysis=structuredClone(home); item.original_analysis=structuredClone(home); item.analysis_mode='fixture'; item.model_id='illustrative-development-fixture'; item.verification_status='pending'; }
    if (action === 'verifications') { if (!item.analysis || item.analysis_mode === 'deferred') fail('ANALYSIS_REQUIRED','Analyze the saved source before verification.'); item.verification_status='verified'; }
    if (action === 'cluster-membership') {
      if (method === 'DELETE') { if (reports.filter(other => other.cluster_id === item.cluster_id).length > 1) item.cluster_id=createReportId(); dismissed.add(item.id); }
      else { const target = JSON.parse(init!.body as string).target_cluster_id; if (!reports.some(other => other.cluster_id === target)) fail('NOT_FOUND','Target group missing.',404); if (item.cluster_id !== target) { item.cluster_id=target; reports.filter(other => other.cluster_id === target).forEach(other => { other.verification_status='pending'; }); } }
    }
    item.updated_at=new Date().toISOString(); return result(item);
  }
  return fail('FIXTURE_NOT_IMPLEMENTED',`Fixture route unavailable: ${method} ${route}`,503);
}
