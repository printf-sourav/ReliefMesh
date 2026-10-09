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
  return <section className="nearby-panel panel"><div className="queue-section-heading"><div><Radio size={21}/><h2>Share nearby</h2></div><span className="badge">{nearbySupported() ? state.peers ? `${state.peers} ${state.peers === 1 ? 'phone connected' : 'phones connected'}` : 'No phones nearby' : 'Phone app'}</span></div>
    {!nearbySupported()?<div className="nearby-browser"><Smartphone size={27}/><div><h3>No internet? Share with a nearby phone.</h3><p>Use the ReliefMesh phone app to share reports. Both phones need the same team code and must keep the app open.</p></div></div>:<>
      <p className="muted">{state.native?.running ? 'Looking for nearby phones. Keep Bluetooth and Wi-Fi on.' : state.native?.enabled ? 'Keep the app open to share reports.' : 'Share saved reports automatically with phones in your team.'}</p>
      <div className="inline-actions"><Button variant={state.native?.enabled?'outline':'default'} disabled={!state.native?.configured} onClick={()=>void enableSharing(!state.native?.enabled)}>{state.native?.enabled?'Stop sharing':'Start sharing'}</Button>
        <Dialog><DialogTrigger asChild><Button variant="outline">{state.native?.configured?'Team setup':'Set up sharing'}</Button></DialogTrigger><DialogContent title="Share with your team" description="Set this up once. Use the same team name and code on both phones. Allow the phone’s nearby devices permission when asked.">
          <fieldset disabled={busy}><label>Team name<input value={group} maxLength={64} onChange={e=>setGroup(e.target.value)} placeholder="Relief team"/></label><label>Team code<input autoComplete="off" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Paste your team’s code"/></label></fieldset>
          <div className="inline-actions"><Button disabled={busy||!group.trim()||!key.trim()} onClick={()=>void configure()}>Join team</Button><Button disabled={busy||!group.trim()} variant="outline" onClick={()=>void configure(true)}>Create a team</Button></div>
          {created&&<label>Copy this code to the other phone<input readOnly value={created} onFocus={e=>e.target.select()}/><small>Share only with your team. Close this screen after setup.</small></label>}{error&&<p role="alert" className="error">Could not set up sharing. Check your team name and code, and allow nearby devices access.</p>}
        </DialogContent></Dialog></div>
      {state.working&&<p className="muted" role="status">Checking whether saved reports can be sent…</p>}{state.error && (!state.native?.running || !/foreground/i.test(state.error)) && <p className="error" role="alert">{state.native?.running ? 'Sharing needs attention. Your saved reports have not been removed. Try stopping and starting sharing.' : 'Sharing is paused. Keep the app open, turn on Bluetooth and Wi-Fi, and allow nearby devices access.'}</p>}
    </>}
    <p className="small-note"><ShieldCheck size={16}/> Sharing nearby keeps your original safe. “Sent” appears only after the response team confirms delivery.</p>
  </section>;
}
