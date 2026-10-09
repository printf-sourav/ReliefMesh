import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, CheckCheck, ImagePlus, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useConnection } from '../App';
import { Button } from '../components/ui/button';
import { AnalysisEditor, cleanAnalysis } from '../components/analysis-editor';
import { api, ApiError, getOrigin, validateOrigin } from '../lib/api';
import type { AnalysisResult, Draft, IncidentAnalysis } from '../lib/api-types';
import { createReportId, validateDraft, validateImage } from '../lib/draft';
import { acknowledge, markRejected, saveQueued } from '../lib/queue';
import { message } from '../lib/utils';
export default function ReportPage() {
  const { online, changed } = useConnection();
  const [id,setId] = useState(createReportId); const [text,setText] = useState(''); const [location,setLocation] = useState('');
  const [latitude,setLatitude] = useState(''); const [longitude,setLongitude] = useState(''); const [photo,setPhoto] = useState<File | null>(null); const [photoUrl,setPhotoUrl] = useState('');
  const [result,setResult] = useState<AnalysisResult | null>(null); const [edited,setEdited] = useState<IncidentAnalysis | null>(null);
  const [busy,setBusy] = useState(''); const busyRef = useRef(false); const [error,setError] = useState(''); const [success,setSuccess] = useState(''); const [saved,setSaved] = useState(false);
  const [validating,setValidating] = useState(false); const validatingRef = useRef(false);
  const generation = useRef(0); const selection = useRef(0);
  const photoInput=useRef<HTMLInputElement>(null); const cameraInput=useRef<HTMLInputElement>(null);
  useEffect(() => {
    const cancel=() => { selection.current++; validatingRef.current=false; setValidating(false); };
    const inputs=[photoInput.current,cameraInput.current]; inputs.forEach(input=>input?.addEventListener('cancel',cancel));
    return () => inputs.forEach(input=>input?.removeEventListener('cancel',cancel));
  },[]);
  useEffect(() => { if (!photo) { setPhotoUrl(''); return; } const urls=URL; const url = urls.createObjectURL(photo); setPhotoUrl(url); return () => urls.revokeObjectURL(url); }, [photo]);
  useEffect(() => () => { generation.current++; selection.current++; }, []);
  function invalidate() { generation.current++; setResult(null); setEdited(null); setId(createReportId()); setError(''); setSuccess(''); }
  function draft(): Draft {
    if (!photo) throw new Error('Add an incident photo.');
    const value = { client_report_id:id, original_text:text, location, latitude:latitude === '' ? null : Number(latitude), longitude:longitude === '' ? null : Number(longitude), image:photo, image_name:photo.name, image_mime:photo.type };
    validateDraft(value); return value;
  }
  async function choose(file?: File) {
    if (saved || busy === 'Saving') return;
    const selected = ++selection.current;
    // Set the guard before awaiting decoding or React's next render.
    validatingRef.current = !!file; setValidating(!!file);
    if (!file) return;
    invalidate();
    try {
      await validateImage(file);
      if (selected !== selection.current) return;
      invalidate(); setPhoto(file);
    } catch (error) { if (selected === selection.current) setError(message(error)); }
    finally { if (selected === selection.current) { validatingRef.current=false; setValidating(false); } }
  }
  async function analyze() {
    if (busyRef.current || saved || validatingRef.current) return; busyRef.current = true; setBusy('Analyzing'); setError('');
    const sourceGeneration=generation.current;
    try {
      const response = await api.analyze(draft());
      if (generation.current !== sourceGeneration || validatingRef.current) return;
      setResult(response); setEdited(structuredClone(response.analysis));
    } catch (error) { if (generation.current === sourceGeneration) setError(message(error)); }
    finally { busyRef.current = false; setBusy(''); }
  }
  async function submit() {
    if (busyRef.current || saved || validatingRef.current) return; busyRef.current = true; setBusy('Saving'); setError('');
    try {
      const submission = { ...draft(), analysis_result:result, edited_analysis:edited ? cleanAnalysis(edited) : null };
      try { await saveQueued(submission); } catch { throw new Error('Device storage could not save this report. Storage may be full or unavailable. Keep this screen open and free space before retrying.'); }
      setSaved(true); changed();
      try {
        const origin=validateOrigin(getOrigin());
        const record = await api.create(submission, online); await acknowledge(submission.client_report_id,record,undefined,origin);
        setSuccess(record.sync_status === 'synced' ? 'Delivered to the simulated hub. Human review is pending.' : 'Saved on the backend; waiting for simulated transport sync.');
      } catch (error) { if (error instanceof ApiError) await markRejected(submission.client_report_id,error); setSuccess('Saved on this device; delivery is unconfirmed. Retry or recover a rejected source from Queue.'); setError(message(error)); }
      changed();
    } catch (error) { setError(message(error)); } finally { busyRef.current = false; setBusy(''); }
  }
  function reset() { setSaved(false); invalidate(); setText(''); setLocation(''); setLatitude(''); setLongitude(''); setPhoto(null); }
  return <><div className="page-heading"><div><span className="eyebrow">CITIZEN REPORTING</span><h1>A clearer picture starts with you.</h1><p>Share what you see. A responder will review every report.</p></div><span className="step-label">01 Details <ArrowRight size={13}/> 02 Review <ArrowRight size={13}/> 03 Save</span></div>
    {error && <div className="error" role="alert">{error}</div>}{success && <div className="notice" role="status"><CheckCheck size={18}/>{success}{!result && ' Analysis pending.'}<div className="inline-actions"><Button variant="outline" asChild><Link to="/queue">View queue</Link></Button><Button variant="outline" onClick={reset}>Start another report</Button></div></div>}
    <div className="report-layout"><section className="panel"><div className="section-heading"><span className="section-number">01</span><div><h2>What’s happening?</h2><p className="muted">Your words and photo stay with the original source.</p></div></div>
      <fieldset disabled={!!busy || saved}>
      <label>Describe the incident <span className="required">Required</span><textarea rows={5} placeholder="What happened? Who needs help? Write in your own language." value={text} onChange={e => { invalidate(); setText(e.target.value); }}/><small>Include people counts only if you know them.</small></label>
      <label>Location <span className="required">Required</span><div className="input-icon"><MapPin size={18}/><input placeholder="Street, neighborhood or landmark" value={location} onChange={e => { invalidate(); setLocation(e.target.value); }}/></div></label>
      <details className="coordinate-details"><summary>Add coordinates <span>Optional</span></summary><div className="field-pair"><label>Latitude<input type="number" min="-90" max="90" value={latitude} onChange={e => { invalidate(); setLatitude(e.target.value); }}/></label><label>Longitude<input type="number" min="-180" max="180" value={longitude} onChange={e => { invalidate(); setLongitude(e.target.value); }}/></label></div></details>
      <label>Incident photo <span className="required">Required</span><span className="photo-picker"><ImagePlus size={28}/><strong>{validating ? 'Checking selected photo…' : photo ? 'Replace incident photo' : 'Add a photo from your device'}</strong><small>JPEG, PNG or WebP · up to 10 MiB · 20 million pixels</small><input aria-label="Incident photo" type="file" accept="image/jpeg,image/png,image/webp" ref={photoInput} onChange={e => { void choose(e.target.files?.[0]); e.target.value=''; }}/></span></label>
      <label className="camera-picker"><Camera size={18}/> Take a photo<input ref={cameraInput} aria-label="Take an incident photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e => { void choose(e.target.files?.[0]); e.target.value=''; }}/></label>
      </fieldset><div className="report-actions"><Button onClick={analyze} disabled={!!busy || saved || validating}><Sparkles size={17}/>{busy === 'Analyzing' ? 'Analyzing photo & text…' : result ? 'Analyze again' : 'Analyze report'}</Button><span className="muted">{validating ? 'Photo validation must finish before analysis or saving.' : 'You can edit the result before saving.'}</span></div>
    </section><section className="preview-column"><div className="panel"><div className="section-heading"><span className="section-number">02</span><div><h2>Review your report</h2><p className="muted">AI suggestions need your judgment.</p></div></div>
      {photoUrl && <figure className="photo-preview"><img src={photoUrl} alt="Selected incident source"/><figcaption>{photo?.name}</figcaption></figure>}
      {result && edited ? <><div className={`analysis-provenance ${result.analysis_mode === 'fixture' ? 'amber' : ''}`}><Sparkles size={16}/>{result.analysis_mode === 'fixture' ? 'Fixture analysis · development only' : 'AI suggested · live analysis'}<small>{result.model_id}</small></div>{result.warnings.map((warning,i) => <p key={i} className="muted">{warning}</p>)}<fieldset disabled={!!busy || saved}><AnalysisEditor value={edited} onChange={setEdited}/></fieldset></> : <div className="analysis-empty"><ShieldCheck size={30}/><h3>Your report, with more context.</h3><p>Analysis will suggest an incident summary, reported needs, language and photo observations. Unknown details stay unknown.</p><div className="analysis-note">Offline on a phone? Save the raw report and photo now. Analyze the saved source after reconnecting.</div></div>}
      <Button className="full-width" variant={result ? 'default' : 'outline'} onClick={submit} disabled={!!busy || saved || validating}>{busy === 'Saving' ? 'Saving report…' : result ? 'Save reviewed report' : 'Save report · analysis pending'}<ArrowRight size={17}/></Button>
      <p className="save-note">{online ? 'Online transport sends to the simulated hub.' : 'Transport offline: reachable backend reports wait in its queue.'} If the API is unreachable, the report is saved on this device.</p>
    </div></section></div></>;
}
