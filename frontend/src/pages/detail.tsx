import { useEffect, useState } from 'react';
import { CheckCircle2, GitMerge, MapPin, Pencil, ShieldCheck, Sparkles, Unlink, Users } from 'lucide-react';
import { useConnection } from '../App';
import { AnalysisEditor, cleanAnalysis } from '../components/analysis-editor';
import { SourcePhoto } from '../components/source-photo';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '../components/ui/dialog';
import { api, allPages } from '../lib/api';
import type { ClusterSummary, DuplicatePage, IncidentAnalysis, IncidentRecord } from '../lib/api-types';
import { date, message, timeZone } from '../lib/utils';
export function IncidentDetail({ cluster, onChanged, onClusterChanged }: { cluster: ClusterSummary; onChanged: () => void; onClusterChanged: (id: string) => void }) {
  const { changed } = useConnection(); const [sources,setSources] = useState<IncidentRecord[]>([]); const [sourceId,setSourceId] = useState('');
  const [matches,setMatches] = useState<DuplicatePage | null>(null); const [error,setError] = useState(''); const [notice,setNotice] = useState(''); const [busy,setBusy] = useState(false); const [loading,setLoading] = useState(true); const [version,setVersion] = useState(0);
  const source = sources.find(report => report.id === sourceId) ?? sources[0];
  useEffect(() => {
    let current = true; setLoading(true); setError('');
    allPages(offset => api.sources(cluster.cluster_id,offset)).then(items => { if (current) setSources(items); }).catch(error => { if (current) setError(message(error)); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [cluster.cluster_id,version]);
  useEffect(() => {
    let current = true; setMatches(null);
    if (source) api.duplicates(source.id).then(value => { if (current) setMatches(value); }).catch(error => { if (current) setMatches({ items:[],total:0,offset:0,limit:100,matching_available:false,warnings:[message(error)] }); });
    return () => { current = false; };
  }, [source?.id,version]);
  async function mutate(action: () => Promise<IncidentRecord>, feedback: string) {
    setBusy(true); setError(''); setNotice('');
    try { const record = await action(); setNotice(feedback); setVersion(n => n + 1); changed(); onChanged(); if (record.cluster_id !== cluster.cluster_id) onClusterChanged(record.cluster_id); }
    catch (error) { setError(message(error)); throw error; } finally { setBusy(false); }
  }
  return <div className="incident-detail"><div className="detail-heading"><span className="eyebrow">INCIDENT · {cluster.cluster_id.slice(0,8).toUpperCase()}</span><h2>{cluster.title}</h2><div className="row-tags"><span className={`badge ${cluster.verification_status === 'verified' ? 'green' : 'amber'}`}>{cluster.verification_status === 'verified' ? 'Verified' : 'Review pending'}</span><span className="muted">{cluster.report_count} sources · {cluster.photo_count} photos</span></div></div>
    {error && <div role="alert" className="error">{error}</div>}{notice && <div className="notice" role="status">{notice}</div>}
    {loading ? <p role="status" className="muted">Loading source evidence…</p> : source ? <>
      <label className="source-selector">Inspect a source<select value={source.id} onChange={e => setSourceId(e.target.value)}>{sources.map((report,index) => <option key={report.id} value={report.id}>Source {index+1} · {report.location} · {report.id.slice(0,8)}</option>)}</select></label>
      <SourcePhoto key={source.id} id={source.id} location={source.location} className="detail-photo"/>
      <div className="source-meta"><span><MapPin size={14}/>{source.location}</span><span>{date(source.created_at)} · {timeZone()}</span></div>
      <div className="source-words"><span className="eyebrow">ORIGINAL CITIZEN REPORT</span><blockquote>{source.original_text}</blockquote></div>
      <div className="source-badges"><span className={`badge ${source.analysis_mode === 'fixture' || source.analysis_mode === 'deferred' ? 'amber' : ''}`}>{source.analysis_mode === 'deferred' ? 'Analysis pending' : source.analysis_mode === 'fixture' ? 'Fixture analysis' : 'AI suggested'}</span><span className={`badge ${source.verification_status === 'verified' ? 'green' : 'amber'}`}>{source.verification_status === 'verified' ? 'Source verified' : 'Review pending'}</span>{source.analysis && <span className="badge">{source.analysis.language}</span>}</div>
      {source.analysis && source.analysis_mode !== 'deferred' ? <><div className="analysis-summary"><h3>Reported needs & context</h3><p>{source.analysis.summary}</p><div className="need-tags">{source.analysis.reported_needs.length ? source.analysis.reported_needs.map(need => <span key={need}>{need}</span>) : <span className="muted">Needs not reported</span>}</div><div className="people-count"><Users size={17}/><strong>{source.analysis.people_affected ?? 'Unknown'}</strong><span>people reported in this source</span></div><p className="small-note">Source counts may overlap. They are never added together.</p>
      {!!source.analysis.vulnerable_people.length && <p className="muted">Reported vulnerability: {source.analysis.vulnerable_people.join(', ')}</p>}
      <h3>Image observations</h3>{source.analysis.image_observations.length ? <ul className="observation-list">{source.analysis.image_observations.map((observation,index) => <li key={index}>{observation}</li>)}</ul> : <p className="muted">No image observations provided.</p>}
      <p className="small-note">Model: {source.model_id ?? 'Unknown'} · Model-reported confidence: {source.analysis.confidence ?? 'Unknown'}</p></div>
      <div className="review-actions"><Correction source={source} busy={busy} save={value => mutate(() => api.correct(source.id,value),'Correction saved. Verification reset to pending.')}/><Confirm title="Verify this source?" description="Confirm that you reviewed the original text, image and current fields. Verification applies to this source; every source in a group must be reviewed." label="Verify source" icon={<ShieldCheck size={16}/>} disabled={busy || source.verification_status === 'verified'} action={() => mutate(() => api.verify(source.id),'Source verified after human review.')}/></div>
      </> : <div className="analysis-deferred"><Sparkles size={22}/><h3>Analysis is still pending.</h3><p className="muted">Delivery does not perform inference. Analyze this saved text and photo explicitly before verification.</p><Button disabled={busy} onClick={() => { void mutate(() => api.reanalyze(source.id),'Saved source analyzed. Review the result before verification.').catch(() => {}); }}><Sparkles size={16}/>{busy ? 'Analyzing…' : 'Analyze saved source'}</Button></div>}
      {source.original_analysis && <details className="original-output"><summary>View original model analysis</summary><p>{source.original_analysis.summary}</p><p className="muted">Incident: {source.original_analysis.incident_type}<br/>People: {source.original_analysis.people_affected ?? 'Unknown'}<br/>Needs: {source.original_analysis.reported_needs.join(', ') || 'Unknown'}<br/>Observations: {source.original_analysis.image_observations.join('; ') || 'None'}<br/>Human verification required: Yes</p></details>}
      <div className="related-reports"><div className="section-heading"><GitMerge size={19}/><h3>Possible related sources</h3></div><p className="small-note">Suggestions never group sources automatically. Cosine similarity is not truth probability.</p>
        {!matches ? <p className="muted" role="status">Checking matching availability…</p> : !matches.matching_available ? <div className="matching-warning">Matching unavailable. {matches.warnings.join(' ')}</div> : matches.items.filter(candidate => candidate.cluster_id !== cluster.cluster_id).length ? matches.items.filter(candidate => candidate.cluster_id !== cluster.cluster_id).map(candidate => <div className="match-row" key={candidate.incident_id}><strong>{candidate.location}</strong><p>{candidate.summary}</p><span className="small-note">Cosine similarity: {candidate.similarity.toFixed(2)}</span><Confirm title="Group these sources?" description={`Move the selected source into the group at ${candidate.location}. Both original reports are retained. Review the sources before confirming.`} label="Confirm grouping" icon={<GitMerge size={15}/>} disabled={busy} action={() => mutate(() => api.link(source.id,candidate.cluster_id),'Human-confirmed grouping saved.')}/></div>) : <p className="muted">No current suggestions for this source.</p>}
        <div className="inline-actions"><ManualGrouping source={source} busy={busy} save={target => mutate(() => api.link(source.id,target),'Human-confirmed grouping saved.')}/><Confirm title="Keep this source separate?" description="Move this source into its own group and dismiss current duplicate suggestions. The original report and photo remain intact." label="Keep separate / dismiss" icon={<Unlink size={15}/>} disabled={busy} action={() => mutate(() => api.separate(source.id),'Source kept separate; current suggestions dismissed.')}/></div>
      </div>
    </> : <p className="muted">No synced source remains in this group. Refresh the list.</p>}</div>;
}
function ManualGrouping({ source, busy, save }: { source: IncidentRecord; busy: boolean; save: (target: string) => Promise<void> }) {
  const [open,setOpen] = useState(false); const [groups,setGroups] = useState<ClusterSummary[]>([]); const [target,setTarget] = useState(''); const [error,setError] = useState(''); const [saving,setSaving] = useState(false); const [loading,setLoading] = useState(false);
  async function load(next: boolean) {
    setOpen(next); if (!next) return; setError(''); setTarget(''); setLoading(true);
    try { setGroups((await allPages(offset => api.clusters(offset))).filter(group => group.cluster_id !== source.cluster_id)); } catch (error) { setError(message(error)); } finally { setLoading(false); }
  }
  return <Dialog open={open} onOpenChange={next => { void load(next); }}><DialogTrigger asChild><Button variant="outline" disabled={busy}><GitMerge size={15}/>Group with existing incident</Button></DialogTrigger><DialogContent title="Choose a group after source review" description="This is a human decision and works without automated matching. Both original sources stay intact, and the group returns to review pending.">{loading ? <p role="status">Loading delivered groups…</p> : <label>Target incident group<select value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose a group</option>{groups.map(group => <option key={group.cluster_id} value={group.cluster_id}>{group.title} · {group.report_count} sources · {group.cluster_id.slice(0,8)}</option>)}</select></label>}{error && <p className="error" role="alert">{error}</p>}<Button disabled={!target || saving || loading} onClick={async () => { setSaving(true); try { await save(target); setOpen(false); } catch (error) { setError(message(error)); } finally { setSaving(false); } }}>{saving ? 'Saving…' : 'Confirm selected group'}</Button></DialogContent></Dialog>;
}
function Confirm({ title, description, label, icon, disabled, action }: { title: string; description: string; label: string; icon: React.ReactNode; disabled: boolean; action: () => Promise<void> }) {
  const [open,setOpen] = useState(false); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" disabled={disabled}>{icon}{label}</Button></DialogTrigger><DialogContent title={title} description={description}>{error && <p className="error" role="alert">{error}</p>}<Button disabled={busy} onClick={async () => { setBusy(true); try { await action(); setOpen(false); } catch (error) { setError(message(error)); } finally { setBusy(false); } }}>{busy ? 'Saving…' : 'Confirm'}</Button></DialogContent></Dialog>;
}
function Correction({ source, busy, save }: { source: IncidentRecord; busy: boolean; save: (value: IncidentAnalysis) => Promise<void> }) {
  const [open,setOpen] = useState(false); const [value,setValue] = useState(source.analysis!); const [error,setError] = useState(''); const [saving,setSaving] = useState(false);
  return <Dialog open={open} onOpenChange={next => { setOpen(next); if (next) { setValue(structuredClone(source.analysis!)); setError(''); } }}><DialogTrigger asChild><Button variant="outline" disabled={busy}><Pencil size={16}/>Correct fields</Button></DialogTrigger><DialogContent title="Correct source analysis" description="The original model output stays intact. Saving a correction resets human verification."><form onSubmit={async e => { e.preventDefault(); setSaving(true); try { await save(cleanAnalysis(value)); setOpen(false); } catch (error) { setError(message(error)); } finally { setSaving(false); } }}><AnalysisEditor value={value} onChange={setValue}/>{error && <div className="error" role="alert">{error}</div>}<Button type="submit" disabled={saving}><CheckCircle2 size={16}/>{saving ? 'Saving…' : 'Save correction'}</Button></form></DialogContent></Dialog>;
}
