import type { IncidentAnalysis } from '../lib/api-types';
export function AnalysisEditor({ value, onChange }: { value: IncidentAnalysis; onChange: (value: IncidentAnalysis) => void }) {
  function set<K extends keyof IncidentAnalysis>(key: K, input: IncidentAnalysis[K]) { onChange({ ...value, [key]: input, verification_required:true }); }
  return <div className="analysis-fields">
    <label>Incident type<input required value={value.incident_type} onChange={e => set('incident_type', e.target.value)}/></label>
    <label>Summary<textarea required rows={3} value={value.summary} onChange={e => set('summary', e.target.value)}/></label>
    <div className="field-pair"><label>Reported people<input type="number" min="0" step="1" placeholder="Unknown" value={value.people_affected ?? ''} onChange={e => set('people_affected', e.target.value === '' ? null : Number(e.target.value))}/><small>Only explicitly reported counts.</small></label>
    <label>Language<input required value={value.language} onChange={e => set('language',e.target.value)}/></label></div>
    {(['reported_needs','vulnerable_people','image_observations'] as const).map(key => <label key={key}>{key === 'reported_needs' ? 'Reported needs' : key === 'vulnerable_people' ? 'Vulnerable people' : 'Image observations'}<textarea rows={2} value={value[key].join('\n')} onChange={e => set(key,e.target.value.split('\n'))}/><small>One item per line. Leave empty when unknown.</small></label>)}
    <label>Location context<input value={value.location_context} onChange={e => set('location_context',e.target.value)}/></label>
    <label>Model-reported confidence<input type="number" min="0" max="1" step="0.01" placeholder="Unknown" value={value.confidence ?? ''} onChange={e => set('confidence', e.target.value === '' ? null : Number(e.target.value))}/><small>A model score is not verification.</small></label>
  </div>;
}
export function cleanAnalysis(value: IncidentAnalysis): IncidentAnalysis {
  if (!value.incident_type.trim() || !value.summary.trim() || !value.language.trim()) throw new Error('Incident type, summary and language are required.');
  if (value.people_affected !== null && (!Number.isInteger(value.people_affected) || value.people_affected < 0)) throw new Error('Reported people must be a whole nonnegative number or unknown.');
  if (value.confidence !== null && (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1)) throw new Error('Confidence must be between 0 and 1, or unknown.');
  return { ...value, vulnerable_people:value.vulnerable_people.map(x => x.trim()).filter(Boolean), reported_needs:value.reported_needs.map(x => x.trim()).filter(Boolean), image_observations:value.image_observations.map(x => x.trim()).filter(Boolean), verification_required:true };
}
