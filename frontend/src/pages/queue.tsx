import { useEffect, useRef, useState } from 'react';
import { CloudUpload, Database, Radio, RefreshCw, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { useConnection } from '../App';
import { Button } from '../components/ui/button';
import { SourcePhoto } from '../components/source-photo';
import { api, allPages } from '../lib/api';
import type { IncidentRecord } from '../lib/api-types';
import { deliverQueue, listQueued, recoverRejected, type QueueItem } from '../lib/queue';
import { Dialog, DialogContent, DialogTrigger } from '../components/ui/dialog';
import { date, message, timeZone } from '../lib/utils';
import { NearbySharing } from '../components/nearby-sharing';
import { listDelivered, type Delivered } from '../lib/queue';
export default function QueuePage() {
  const { online,setOnline,refresh,changed } = useConnection(); const [device,setDevice] = useState<QueueItem[]>([]); const [backend,setBackend] = useState<IncidentRecord[]>([]);
  const [confirmed,setConfirmed]=useState<Delivered[]>([]);
  const [deviceError,setDeviceError] = useState(''); const [backendError,setBackendError] = useState(''); const [error,setError] = useState(''); const [notice,setNotice] = useState(''); const [busy,setBusy] = useState(false); const [loading,setLoading] = useState(true); const [version,setVersion] = useState(0);
  useEffect(()=>{void listDelivered().then(setConfirmed);},[refresh,version]);
  useEffect(() => {
    let current = true; setLoading(true); setDeviceError(''); setBackendError('');
    Promise.allSettled([listQueued(),allPages(offset => api.queue(offset))]).then(([local,server]) => {
      if (!current) return;
      if (local.status === 'fulfilled') setDevice(local.value); else setDeviceError('Device storage could not be read. Your saved data has not been removed.');
      if (server.status === 'fulfilled') setBackend(server.value); else { setBackend([]); setBackendError(message(server.reason)); }
      setLoading(false);
    }); return () => { current = false; };
  }, [refresh,version]);
  async function sync() {
    if (busy) return; setBusy(true); setNotice(''); setError('');
    try {
      const delivered = await deliverQueue(online); let hub = 0;
      try { const result = await api.sync(online); hub = result.synced_report_ids.length; } catch (error) { setError(message(error)); }
      setNotice(`${delivered.delivered} device reports acknowledged by the backend. ${hub} backend reports newly delivered to the simulated hub.${online ? '' : ' Simulated transport remains offline.'}`);
      if (delivered.errors.length) setError(`${delivered.errors.length} device reports retained for retry. ${delivered.errors[0]}`);
      changed(); setVersion(n => n + 1);
    } catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  return <><div className="page-heading"><div><span className="eyebrow">DURABLE DELIVERY</span><h1>Keep the report. Restore the connection.</h1><p>Two queues, one report ID. Delivery waits for acknowledgment.</p></div><Button variant="outline" onClick={() => setVersion(n => n+1)} disabled={loading || busy}><RefreshCw size={16}/>Refresh</Button></div>
    <NearbySharing/>
    <div className="transport-panel"><div className="transport-icon">{online ? <Wifi size={23}/> : <WifiOff size={23}/>}</div><div><h2>Simulated transport {online ? 'online' : 'offline'}</h2><p>This toggle simulates hub delivery. API reachability is checked by actual requests.</p></div><Button variant="outline" onClick={() => setOnline(!online)} disabled={busy}>{online ? 'Set transport offline' : 'Restore transport'}</Button></div>
    {error && <div className="error" role="alert">{error}</div>}{notice && <div className="notice" role="status">{notice}</div>}
    <div className="queue-layout"><section className="panel"><div className="queue-section-heading"><div><Smartphone size={20}/><h2>On this device</h2></div><span className="badge amber">{deviceError ? 'Unknown' : device.length} pending</span></div><p className="muted">Saved in this browser or app. Failed and timed-out uploads stay here until the API acknowledges the same UUID.</p>
      {deviceError ? <div className="error" role="alert">{deviceError}</div> : loading ? <p role="status">Reading saved reports…</p> : device.length ? device.map(item => <div className="queue-item" key={item.client_report_id}><QueuedPhoto image={item.image}/><div><h3>{item.location}</h3><p>{item.original_text}</p><span className="badge amber">{item.analysis_result ? `${item.analysis_result.analysis_mode} analysis saved` : 'Analysis pending'}</span><small>{date(item.created_at)} · {timeZone()}</small><small>{item.attempts ? `${item.attempts} unsuccessful attempts` : 'Waiting for upload'} · ID {item.client_report_id.slice(0,8)}</small>{item.last_error && <div className="queue-last-error">{item.last_error}</div>}</div></div>) : <div className="queue-empty"><Smartphone size={29}/><h3>No reports waiting on this device.</h3><p>Reports saved while the API is unreachable will appear here.</p></div>}
      {device.filter(item=>item.rejected).map(item=><Recovery key={item.client_report_id} item={item} onSaved={()=>{changed();setVersion(n=>n+1);}}/>)}
      {device.filter(item=>item.relay).map(item=><p className="delivery-state" key={item.client_report_id}><span className="badge amber">{item.relay_receipt?'Relay reports delivery':item.peer_stored?'Shared nearby; delivery pending':'Saved on this device'}</span> {item.location} · {item.relay_origin?'Your original copy':'Received relay copy'} · {item.relay!.hop_count} hops</p>)}
      {confirmed.slice(-10).map(item=><p className="delivery-state" key={item.client_report_id}><span className="badge">Directly API-confirmed delivery</span> {item.location} · {item.client_report_id.slice(0,8)}</p>)}
      <Button disabled={busy || !!deviceError} onClick={sync}><CloudUpload size={17}/>{busy ? 'Synchronizing…' : 'Retry device uploads & sync'}</Button>
    </section><section className="panel"><div className="queue-section-heading"><div><Database size={20}/><h2>On the backend</h2></div><span className="badge amber">{backendError ? 'Unknown' : backend.length} pending</span></div><p className="muted">SQLite sources waiting for simulated hub delivery. This count excludes device-only reports.</p>
      {backendError ? <div className="error" role="alert">{backendError}</div> : loading ? <p role="status">Reading backend queue…</p> : backend.length ? backend.map(source => <div className="queue-item" key={source.id}><SourcePhoto id={source.id} location={source.location}/><div><h3>{source.location}</h3><p>{source.analysis?.summary ?? source.original_text}</p><span className="badge amber">{source.analysis_mode === 'deferred' ? 'Analysis pending' : `${source.analysis_mode} analysis`}</span><small>{date(source.created_at)}</small><small>Saved on backend · ID {source.client_report_id.slice(0,8)}</small></div></div>) : <div className="queue-empty"><Radio size={29}/><h3>Backend queue is clear.</h3><p>Transport-offline submissions wait here until you synchronize.</p></div>}
      <p className="small-note">Sync only changes delivery state. Deferred sources require explicit analysis and human review afterward. Nearby sharing operates while the Android app is foregrounded; background delivery is not guaranteed.</p>
    </section></div></>;
}
function Recovery({item,onSaved}:{item:QueueItem;onSaved:()=>void}) {
  const [text,setText]=useState(item.original_text), [location,setLocation]=useState(item.location), [photo,setPhoto]=useState<File|null>(null);
  const [error,setError]=useState(''), [busy,setBusy]=useState(false), [done,setDone]=useState(false); const guard=useRef(false);
  async function recover() {
    if (guard.current) return; guard.current=true;setBusy(true);setError('');
    try {await recoverRejected(item.client_report_id,{original_text:text,location,image:photo??item.image,image_name:photo?.name??item.image_name,image_mime:photo?.type??item.image_mime});setDone(true);onSaved();}
    catch(error){setError(message(error));}finally{guard.current=false;setBusy(false);}
  }
  return <div className="queue-last-error"><strong>{item.location}: needs recovery</strong><p>Automatic retries are paused. The original photo/source stays saved until the replacement is API-confirmed.</p>
    {item.superseded_by ? <p>Replacement saved · {item.superseded_by.slice(0,8)}. Original retained.</p> : <Dialog><DialogTrigger asChild><Button variant="outline">Recover rejected report</Button></DialogTrigger><DialogContent title="Recover saved source" description="Save a corrected copy with a new report ID. Previous AI output is cleared because the source changes.">
      {done ? <p role="status">Replacement saved; original retained until successful upload.</p> : <><fieldset disabled={busy}><label>Description<textarea value={text} onChange={e=>setText(e.target.value)}/></label><label>Location<input value={location} onChange={e=>setLocation(e.target.value)}/></label><label>Replacement photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]??null)}/></label><p className="muted">Keep {item.image_name} unless it needs resizing or replacement.</p></fieldset>{error&&<p className="error" role="alert">{error}</p>}<Button disabled={busy} onClick={recover}>{busy?'Validating & saving…':'Save replacement with new ID'}</Button></>}
    </DialogContent></Dialog>}</div>;
}
function QueuedPhoto({ image }: { image: Blob }) {
  const [url,setUrl] = useState('');
  useEffect(() => { const value = URL.createObjectURL(image); setUrl(value); return () => URL.revokeObjectURL(value); }, [image]);
  return <img src={url || undefined} alt="Locally saved incident photo"/>;
}
