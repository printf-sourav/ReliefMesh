import { useState, useSyncExternalStore } from 'react';
import { Radio, ShieldCheck, Smartphone } from 'lucide-react';
import { nearby, nearbySupported } from '../lib/nearby';
import { enableSharing, sharing } from '../lib/mesh';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { message } from '../lib/utils';
export function NearbySharing() {
  const state=useSyncExternalStore(sharing.subscribe,sharing.getSnapshot),[group,setGroup]=useState(''),[key,setKey]=useState(''),[created,setCreated]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function configure(generate=false) {
    setBusy(true);setError('');
    try {const result=await nearby.configureGroup({groupId:group,key:generate?undefined:key,generate});setGroup(result.groupId);setKey('');setCreated(result.key??'');await enableSharing(true);}
    catch(error){setError(message(error));}finally{setBusy(false);}
  }
  return <section className="nearby-panel panel"><div className="queue-section-heading"><div><Radio size={21}/><h2>Nearby Sharing</h2></div><span className="badge">{nearbySupported()?`${state.peers} authenticated phones`:'Android app'}</span></div>
    {!nearbySupported()?<div className="nearby-browser"><Smartphone size={27}/><div><h3>Carry a report beyond this connection.</h3><p>Actual nearby sharing requires the Android app. Join one shared group and enable sharing on both phones; reports then transfer automatically while both apps are open.</p></div></div>:<>
      <p className="muted">{state.native?.running?'Discovering trusted phones. Bluetooth and Wi-Fi must stay on.':state.native?.status??'Reading native sharing state…'} Foreground operation only.</p>
      <div className="inline-actions"><Button variant={state.native?.enabled?'outline':'default'} disabled={!state.native?.configured} onClick={()=>void enableSharing(!state.native?.enabled)}>{state.native?.enabled?'Disable sharing':'Enable sharing'}</Button>
        <Dialog><DialogTrigger asChild><Button variant="outline">{state.native?.configured?'Group setup':'Join or create a group'}</Button></DialogTrigger><DialogContent title="One shared group" description="Set this up once on both phones. Only phones holding the same key exchange incident reports. Android permission prompts still apply.">
          <fieldset disabled={busy}><label>Group name<input value={group} maxLength={64} onChange={e=>setGroup(e.target.value)} placeholder="Relief team"/></label><label>Shared group key<input autoComplete="off" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Paste the group's Base64 key"/></label></fieldset>
          <div className="inline-actions"><Button disabled={busy||!group.trim()||!key.trim()} onClick={()=>void configure()}>Join group</Button><Button disabled={busy||!group.trim()} variant="outline" onClick={()=>void configure(true)}>Create new group key</Button></div>
          {created&&<label>Copy this key to the other phone once<input readOnly value={created} onFocus={e=>e.target.select()}/><small>Kept privately on each phone. Close this screen after setup.</small></label>}{error&&<p role="alert" className="error">{error}</p>}
        </DialogContent></Dialog></div>
      {state.progress&&<p role="status">{state.progress}</p>}{state.working&&<p className="muted">Checking saved copies and API reachability…</p>}{state.error&&<p className="error" role="alert">{state.error}</p>}
    </>}
    <p className="small-note"><ShieldCheck size={14}/> A nearby phone’s storage acknowledgment means delivery is pending. Relay delivery reports retain your original until this device confirms the same source with the API.</p>
  </section>;
}
