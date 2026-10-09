import type { IncidentAnalysis } from '../lib/api-types';
export function AnalysisEditor({ value, onChange, simple = false }: { value: IncidentAnalysis; onChange: (value: IncidentAnalysis) => void; simple?: boolean }) {
  function set<K extends keyof IncidentAnalysis>(key: K, input: IncidentAnalysis[K]) { onChange({ ...value, [key]: input, verification_required:true }); }
  return <div className="analysis-fields">
    <label>Incident type<input required value={value.incident_type} onChange={e => set('incident_type', e.target.value)}/></label>
    <label>Summary<textarea required rows={3} value={value.summary} onChange={e => set('summary', e.target.value)}/></label>
    <div className="field-pair"><label>Reported people<input type="number" min="0" step="1" placeholder="Unknown" value={value.people_affected ?? ''} onChange={e => set('people_affected', e.target.value === '' ? null : Number(e.target.value))}/><small>Only explicitly reported counts.</small></label>
    <label>Language<input required value={value.language} onChange={e => set('language',e.target.value)}/></label></div>
    {(['reported_needs','vulnerable_people','image_observations'] as const).map(key => <label key={key}>{key === 'reported_needs' ? 'Reported needs' : key === 'vulnerable_people' ? 'Vulnerable people' : 'Image observations'}<textarea rows={2} value={value[key].join('\n')} onChange={e => set(key,e.target.value.split('\n'))}/><small>One item per line. Leave empty when unknown.</small></label>)}
    <label>Location context<input value={value.location_context} onChange={e => set('location_context',e.target.value)}/></label>
    {!simple && <label>Model-reported confidence<input type="number" min="0" max="1" step="0.01" placeholder="Unknown" value={value.confidence ?? ''} onChange={e => set('confidence', e.target.value === '' ? null : Number(e.target.value))}/><small>A model score is not verification.</small></label>}
  </div>;
}
export function cleanAnalysis(value: IncidentAnalysis): IncidentAnalysis {
  const cleaned = { ...value };
  for (const key of ['incident_type','summary','language','location_context'] as const) {
    cleaned[key] = value[key].trim();
    if (!cleaned[key]) throw new Error(`${key.replaceAll('_',' ')} is required.`);
    if (Array.from(cleaned[key]).length > 10000) throw new Error(`${key.replaceAll('_',' ')} must be at most 10,000 characters.`);
  }
  for (const key of ['vulnerable_people','reported_needs','image_observations'] as const) {
    cleaned[key] = value[key].map(x => x.trim()).filter(Boolean);
    if (cleaned[key].some(x => Array.from(x).length > 10000)) throw new Error('Each analysis list item must be at most 10,000 characters.');
  }
  if (value.people_affected !== null && (!Number.isInteger(value.people_affected) || value.people_affected < 0)) throw new Error('Reported people must be a whole nonnegative number or unknown.');
  if (value.confidence !== null && (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1)) throw new Error('Confidence must be between 0 and 1, or unknown.');
  return { ...cleaned, verification_required:true };
}
