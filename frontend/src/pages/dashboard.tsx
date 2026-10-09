import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, CheckCircle2, ChevronRight, CircleDot, Layers, Radio, RefreshCw, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useConnection } from '../App';
import { Button } from '../components/ui/button';
import { SourcePhoto } from '../components/source-photo';
import { api, allPages } from '../lib/api';
import type { ClusterSummary, DashboardSnapshot, IncidentRecord } from '../lib/api-types';
import { date, message, timeZone } from '../lib/utils';
import { IncidentDetail } from './detail';
export default function DashboardPage() {
  const { refresh } = useConnection(); const [params,setParams] = useSearchParams(); const selected = params.get('incident');
  const [clusters,setClusters] = useState<ClusterSummary[]>([]); const [reports,setReports] = useState<IncidentRecord[]>([]); const [metrics,setMetrics] = useState<DashboardSnapshot | null>(null);
  const [busy,setBusy] = useState(true); const [error,setError] = useState(''); const [query,setQuery] = useState(''); const [status,setStatus] = useState('all'); const [reload,setReload] = useState(0);
  useEffect(() => {
    let current = true; setBusy(true); setError('');
    Promise.all([allPages(offset => api.clusters(offset)),allPages(offset => api.reports(true,offset)),api.metrics()]).then(([groups,sources,counts]) => {
      if (!current) return; setClusters(groups); setReports(sources); setMetrics(counts);
    }).catch(error => { if (current) setError(message(error)); }).finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [refresh,reload]);
  const filtered = clusters.filter(cluster => {
    const sources = reports.filter(report => report.cluster_id === cluster.cluster_id);
    const haystack = [cluster.title,...cluster.reported_needs,...cluster.languages,...sources.flatMap(report => [report.location,report.original_text,report.analysis?.summary ?? ''])].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase()) && (status === 'all' || cluster.verification_status === status);
  });
  const active = clusters.find(cluster => cluster.cluster_id === selected);
  const duplicateValue = metrics ? metrics.matching_available === true ? metrics.possible_duplicate_reports : metrics.matching_available === false ? 'Unavailable' : 'Unknown' : undefined;
  const metricList = [{ label:'Active incidents',value:metrics?.active_clusters,icon:Layers },{ label:'Review pending',value:metrics?.pending_verification_reports,icon:ShieldCheck },{ label:'Possible duplicates',value:duplicateValue,icon:CircleDot },{ label:'Backend queue',value:metrics?.pending_sync_reports,icon:Radio }];
  return <div className={selected ? 'dashboard detail-open' : 'dashboard'}><div className="page-heading"><div><span className="eyebrow">RESPONDER WORKSPACE</span><h1>Every report. A clearer response.</h1><p>Review local evidence and connect related sources with care.</p></div><Button variant="outline" disabled={busy} onClick={() => setReload(n => n + 1)}><RefreshCw size={16} className={busy ? 'spin' : ''}/>Refresh</Button></div>
    {error && <div className="error" role="alert">{error}<p>Check Connection settings and start the backend. Saved device reports remain in Queue.</p></div>}
    <div className="metrics-strip">{metricList.map(({ label,value,icon:Icon }) => <div key={label} className={`metric ${typeof value === 'string' ? 'metric-state' : ''}`}><div><span>{label}</span><strong className={typeof value === 'string' ? 'metric-unavailable' : ''}>{value ?? '—'}</strong></div><span className="metric-icon"><Icon size={19}/></span></div>)}</div>
    {metrics?.matching_available === false && <div className="matching-warning">{metrics.matching_warning ?? 'Semantic matching is unavailable.'} Responders can still inspect sources and group incidents manually.</div>}
    <div className="hub-note"><CheckCircle2 size={14}/> Showing sources delivered to the simulated hub <span>Device reports are listed separately in Queue.</span></div>
    <div className="dashboard-grid"><section className="incident-workspace"><div className="list-toolbar"><h2>Incident overview <span>{filtered.length}</span></h2><SlidersHorizontal size={18}/></div>
      <div className="filter-row"><label className="search-input"><Search size={17}/><input aria-label="Search incidents" placeholder="Search location, needs or reports" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Verification filter" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="pending">Review pending</option><option value="verified">Verified</option></select></div>
      {busy ? <div className="loading-state" role="status"><RefreshCw size={22} className="spin"/>Loading incident sources…</div> : filtered.length ? <div className="incident-list">{filtered.map(cluster => {
        const source = reports.find(report => report.cluster_id === cluster.cluster_id);
        return <button className={`incident-row ${selected === cluster.cluster_id ? 'selected' : ''}`} key={cluster.cluster_id} onClick={() => setParams({ incident:cluster.cluster_id })} aria-pressed={selected === cluster.cluster_id}>
          {source ? <SourcePhoto id={source.id} location={source.location} className="incident-thumbnail"/> : <div className="incident-thumbnail photo-unavailable">No source</div>}
          <div className="incident-row-content"><div className="row-kicker">{source?.location ?? 'Location unknown'}<span>{cluster.report_count} source{cluster.report_count === 1 ? '' : 's'}</span></div><h3>{cluster.title}</h3><p>{source?.analysis?.summary ?? source?.original_text ?? 'Analysis pending'}</p><div className="row-tags"><span className={`badge ${cluster.verification_status === 'verified' ? 'green' : 'amber'}`}>{cluster.verification_status === 'verified' ? 'Verified' : 'Review pending'}</span>{cluster.reported_needs.slice(0,2).map(need => <span key={need} className="need-label">{need}</span>)}</div><small>{date(cluster.latest_report_at)}</small></div><ChevronRight size={18} className="row-arrow"/>
        </button>;
      })}</div> : <div className="empty-state list-empty"><Layers size={32}/><h2>{error ? 'Waiting for the API' : query || status !== 'all' ? 'No matching incidents' : 'A quiet workspace, ready to help.'}</h2><p>{query || status !== 'all' ? 'Try another search or verification status.' : 'Delivered citizen reports will appear here for human review.'}</p><Button asChild variant="outline"><Link to="/report">Create a report <ArrowUpRight size={16}/></Link></Button></div>}
      <div className="list-footer">{filtered.length} incident groups <span>Times in {timeZone()}</span></div>
    </section><section className="detail-workspace" aria-label="Incident detail">{selected && active ? <><Button variant="ghost" className="mobile-back" onClick={() => setParams({})}><ArrowLeft size={17}/>Back to incidents</Button><IncidentDetail key={selected} cluster={active} onChanged={() => setReload(n => n + 1)} onClusterChanged={id => setParams({ incident:id })}/></> : <div className="detail-placeholder"><span className="detail-icon"><ShieldCheck size={31}/></span><h2>Context before action.</h2><p>Select an incident to inspect the source photo, original words and AI suggestions.</p><div className="detail-principles"><span><CheckCircle2 size={16}/> Every source stays intact</span><span><CheckCircle2 size={16}/> Grouping is a human decision</span><span><CheckCircle2 size={16}/> People counts are never added</span></div></div>}</section></div>
  </div>;
}
