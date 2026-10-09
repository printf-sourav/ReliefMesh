import { useEffect, useRef, useState } from 'react';
import { CheckCheck, CloudUpload, RefreshCw, Smartphone } from 'lucide-react';
import { useConnection } from '../App';
import { Button } from '../components/ui/button';
import { deliverQueue, listQueued, recoverRejected, type QueueItem } from '../lib/queue';
import { Dialog, DialogContent, DialogTrigger } from '../components/ui/dialog';
import { date, message } from '../lib/utils';
import { NearbySharing } from '../components/nearby-sharing';
import { listDelivered, type Delivered } from '../lib/queue';
export default function QueuePage() {
  const { refresh,changed } = useConnection();
  const [device,setDevice] = useState<QueueItem[]>([]), [confirmed,setConfirmed] = useState<Delivered[]>([]);
  const [error,setError] = useState(''), [notice,setNotice] = useState(''), [busy,setBusy] = useState(false), [loading,setLoading] = useState(true), [version,setVersion] = useState(0);
  useEffect(() => {
    let current = true; setLoading(true); setError('');
    Promise.all([listQueued(),listDelivered()]).then(([local,sent]) => {
      if(current) {setDevice(local);setConfirmed(sent);}
    }).catch(() => {if(current)setError('Could not read your saved reports. Your reports have not been removed. Try again.');})
      .finally(() => {if(current)setLoading(false);});
    return () => {current=false;};
  },[refresh,version]);
  async function sync() {
    if (busy) return; setBusy(true); setNotice(''); setError('');
    try {
      const result = await deliverQueue(true);
      setNotice(result.delivered ? `${result.delivered} ${result.delivered === 1 ? 'report sent' : 'reports sent'} to the response team.` : 'No new reports sent. Saved reports stay on this phone until they can be sent.');
      if(result.errors.length) setError('Some reports could not be sent. Check your connection and try again. Your saved copies are safe.');
      changed(); setVersion(n => n+1);
    } catch {setError('Could not send reports. Your saved copies are safe. Please try again.');}
    finally {setBusy(false);}
  }
  return <><div className="page-heading"><div><span className="eyebrow">YOUR UPDATES</span><h1>My reports</h1><p>Saved safely. Ready to send when you reconnect.</p></div><Button variant="outline" onClick={() => setVersion(n => n+1)} disabled={loading || busy}><RefreshCw size={16}/>Refresh</Button></div>
    {error && <div className="error" role="alert">{error}</div>}{notice && <div className="notice" role="status">{notice}</div>}
    <section className="panel saved-reports"><div className="queue-section-heading"><div><Smartphone size={20}/><h2>Waiting to send</h2></div><span className="badge amber">{loading ? 'Checking…' : device.length}</span></div>
      {loading ? <p role="status">Finding your saved reports…</p> : device.length ? device.map(item => <article className="queue-item" key={item.client_report_id}><QueuedPhoto image={item.image}/><div><h3>{item.location}</h3><p>{item.original_text}</p><span className="badge amber">{item.rejected ? 'Needs a small change' : item.relay_receipt || item.peer_stored ? 'Shared nearby · waiting to send' : 'Saved on this phone'}</span><small>{date(item.created_at)}</small>{item.relay && !item.relay_origin && <small>Shared by another phone</small>}{item.last_error && !item.rejected && <small>We’ll try again when a connection is available.</small>}</div></article>) : <div className="queue-empty"><CheckCheck size={32}/><h3>No reports waiting to send</h3><p>Your next saved report will appear here.</p></div>}
      {device.filter(item=>item.rejected).map(item=><Recovery key={item.client_report_id} item={item} onSaved={()=>{changed();setVersion(n=>n+1);}}/>)}
      <Button className="full-width" disabled={busy || loading || !device.some(item=>!item.rejected&&!item.superseded_by)} onClick={sync}><CloudUpload size={18}/>{busy ? 'Sending…' : 'Try sending now'}</Button>
    </section>
    <NearbySharing/>
    {!!confirmed.length && <section className="panel sent-reports"><div className="queue-section-heading"><div><CheckCheck size={20}/><h2>Sent to the response team</h2></div></div>{confirmed.slice(-10).reverse().map(item=><div className="delivery-state" key={item.client_report_id}><span className="badge green">Sent</span><strong>{item.location}</strong><small>{date(item.confirmed_at)}</small></div>)}</section>}
  </>;
}
function Recovery({item,onSaved}:{item:QueueItem;onSaved:()=>void}) {
  const [text,setText]=useState(item.original_text), [location,setLocation]=useState(item.location), [photo,setPhoto]=useState<File|null>(null);
  const [error,setError]=useState(''), [busy,setBusy]=useState(false), [done,setDone]=useState(false); const guard=useRef(false);
  async function recover() {
    if (guard.current) return; guard.current=true;setBusy(true);setError('');
    try {await recoverRejected(item.client_report_id,{original_text:text,location,image:photo??item.image,image_name:photo?.name??item.image_name,image_mime:photo?.type??item.image_mime});setDone(true);onSaved();}
    catch(error){setError(message(error));}finally{guard.current=false;setBusy(false);}
  }
  return <div className="queue-last-error"><strong>{item.location}: needs a small change</strong><p>Update the report and try again. Your original stays safe until the corrected copy is sent.</p>
    {item.superseded_by && !done ? <p>Corrected copy saved. Your original is still safe.</p> : <Dialog><DialogTrigger asChild><Button variant="outline">Fix report</Button></DialogTrigger><DialogContent title="Update your report" description="Update the details or choose a smaller photo. We’ll keep your original until the corrected copy is sent.">
      {done ? <p role="status">Updated report saved. Your original stays safe until this copy is sent.</p> : <><fieldset disabled={busy}><label>Description<textarea aria-label="Recovered description" value={text} onChange={e=>setText(e.target.value)}/></label><label>Location<input value={location} onChange={e=>setLocation(e.target.value)}/></label><label>Replacement photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]??null)}/></label><p className="muted">Keep {item.image_name} unless it needs resizing or replacement.</p></fieldset>{error&&<p className="error" role="alert">{error}</p>}<Button disabled={busy} onClick={recover}>{busy?'Saving…':'Save updated report'}</Button></>}
    </DialogContent></Dialog>}</div>;
}
function QueuedPhoto({ image }: { image: Blob }) {
  const [url,setUrl] = useState('');
  useEffect(() => { const value = URL.createObjectURL(image); setUrl(value); return () => URL.revokeObjectURL(value); }, [image]);
  return <img src={url || undefined} alt="Locally saved incident photo"/>;
}
