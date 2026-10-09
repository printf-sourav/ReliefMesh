import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, CheckCheck, ImagePlus, MapPin, Sparkles } from 'lucide-react';
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
    } catch (error) { if (generation.current === sourceGeneration) setError(error instanceof ApiError ? 'Could not get a suggestion. You can still send your report. If the request took too long, it may still be processing; check before trying again.' : message(error)); }
    finally { busyRef.current = false; setBusy(''); }
  }
  async function submit() {
    if (busyRef.current || saved || validatingRef.current) return; busyRef.current = true; setBusy('Saving'); setError('');
    try {
      const submission = { ...draft(), analysis_result:result, edited_analysis:edited ? cleanAnalysis(edited) : null };
      try { await saveQueued(submission); } catch { throw new Error('Your phone could not save this report. Keep this screen open, free some storage space and try again.'); }
      setSaved(true); changed();
      try {
        const origin=validateOrigin(getOrigin());
        const record = await api.create(submission, online); await acknowledge(submission.client_report_id,record,undefined,origin);
        setSuccess(record.sync_status === 'synced' ? 'Sent to the response team. A person will review your report.' : 'Received by the response team. Delivery is still pending.');
      } catch (error) { if (error instanceof ApiError) await markRejected(submission.client_report_id,error); setSuccess('Saved on this phone. Open My reports to send it when a connection is available.'); if (error instanceof ApiError && [413,415,422].includes(error.status)) setError('Your report needs a small change. Open My reports to update it.'); }
      changed();
    } catch (error) { setError(message(error)); } finally { busyRef.current = false; setBusy(''); }
  }
  function reset() { setSaved(false); invalidate(); setText(''); setLocation(''); setLatitude(''); setLongitude(''); setPhoto(null); }
  return <><div className="page-heading"><div><span className="eyebrow">HELP YOUR COMMUNITY</span><h1>Tell us what’s happening.</h1><p>A photo and a few words can help your response team.</p></div></div>
    {error && <div className="error" role="alert">{error}</div>}{success && <div className="notice" role="status"><CheckCheck size={18}/>{success}<div className="inline-actions"><Button variant="outline" asChild><Link to="/queue">My reports</Link></Button><Button variant="outline" onClick={reset}>Start another report</Button></div></div>}
    <div className="report-layout"><section className="panel"><div className="section-heading"><span className="section-number">01</span><div><h2>What’s happening?</h2><p className="muted">Describe what you see. Use the language you’re comfortable with.</p></div></div>
      <fieldset disabled={!!busy || saved}>
      <label>What happened? <span className="required">Required</span><textarea rows={5} placeholder="What happened? Who needs help? Write in your own language." value={text} onChange={e => { invalidate(); setText(e.target.value); }}/><small>Include people counts only if you know them.</small></label>
      <label>Where is it? <span className="required">Required</span><div className="input-icon"><MapPin size={18}/><input placeholder="Street, neighborhood or landmark" value={location} onChange={e => { invalidate(); setLocation(e.target.value); }}/></div></label>

      <label>Incident photo <span className="required">Required</span><span className="photo-picker"><ImagePlus size={28}/><strong>{validating ? 'Checking selected photo…' : photo ? 'Choose another photo' : 'Choose a photo'}</strong><small>Choose a clear photo, up to 10 MB.</small><input aria-label="Incident photo" type="file" accept="image/jpeg,image/png,image/webp" ref={photoInput} onChange={e => { void choose(e.target.files?.[0]); e.target.value=''; }}/></span></label>
      <label className="camera-picker"><Camera size={18}/> Take a photo<input ref={cameraInput} aria-label="Take an incident photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e => { void choose(e.target.files?.[0]); e.target.value=''; }}/></label>
      </fieldset><div className="report-actions"><Button onClick={analyze} disabled={!!busy || saved || validating}><Sparkles size={17}/>{busy === 'Analyzing' ? 'Looking at your report…' : result ? 'Get another suggestion' : 'Help describe this'}</Button><span className="muted">{validating ? 'Checking your photo…' : 'Optional. Check the suggestion before you send it.'}</span></div>
    </section><section className="preview-column"><div className="panel"><div className="section-heading"><span className="section-number">02</span><div><h2>Ready to send?</h2><p className="muted">Check your photo and details before sending.</p></div></div>
      {photoUrl && <figure className="photo-preview"><img src={photoUrl} alt="Selected incident source"/><figcaption>{photo?.name}</figcaption></figure>}
      {result && edited ? <><div className={`analysis-provenance ${result.analysis_mode === 'fixture' ? 'amber' : ''}`}><Sparkles size={16}/>{result.analysis_mode === 'fixture' ? 'Sample suggestion · demo only' : 'Suggested description · please check'}</div>{!!result.warnings.length && <p className="muted">Some details could not be checked. Review this suggestion carefully.</p>}<fieldset disabled={!!busy || saved}><AnalysisEditor value={edited} onChange={setEdited} simple/></fieldset></> : <p className="muted">No connection? Your words and photo will stay safely on this phone.</p>}
      <Button className="full-width" variant="default" onClick={submit} disabled={!!busy || saved || validating}>{busy === 'Saving' ? 'Saving report…' : 'Send report'}<ArrowRight size={17}/></Button>
      <p className="save-note">Your report saves on this phone first. It is sent when a connection is available.</p>
    </div></section></div></>;
}
