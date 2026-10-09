import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportPage from './report';
import { api } from '../lib/api';
import { validateImage } from '../lib/draft';
import { saveQueued } from '../lib/queue';
import type { AnalysisResult } from '../lib/api-types';
vi.mock('../App', () => ({ useConnection: () => ({ online:true, changed:vi.fn() }) }));
vi.mock('../lib/queue', () => ({ saveQueued:vi.fn(), acknowledge:vi.fn() }));
vi.mock('../lib/draft', async original => ({ ...await original<typeof import('../lib/draft')>(), validateImage:vi.fn() }));
function deferred<T>() { let resolve!: (value:T) => void; const promise = new Promise<T>(r => { resolve=r; }); return {promise,resolve}; }
const result: AnalysisResult = { analysis:{incident_type:'Flood',summary:'Old photo analysis',people_affected:null,vulnerable_people:[],reported_needs:[],location_context:'River',language:'Hindi',image_observations:[],confidence:null,verification_required:true},analysis_mode:'live',model_id:'provider',warnings:[] };
const photo = (name:string) => new File(['bytes'],name,{type:'image/png'});
beforeEach(() => {
  vi.mocked(validateImage).mockReset().mockResolvedValue(undefined);
  vi.mocked(saveQueued).mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('URL', class extends URL { static createObjectURL() {return 'blob:test';} static revokeObjectURL() {} });
  render(<MemoryRouter><ReportPage/></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/What happened?/),{target:{value:'Water entering house'}});
  fireEvent.change(screen.getByLabelText(/Where is it?/),{target:{value:'River'}});
});
async function select(name:string) { await act(async()=>{fireEvent.change(screen.getByLabelText('Incident photo'),{target:{files:[photo(name)]}});}); }
it('blocks Analyze and Save during delayed replacement decoding', async () => {
  await select('old.png'); const decode = deferred<void>(); vi.mocked(validateImage).mockReturnValueOnce(decode.promise);
  await select('new.png');
  expect(screen.getByRole('button',{name:'Help describe this'})).toBeDisabled();
  const save=screen.getByRole('button',{name:/Send report/}); expect(save).toBeDisabled(); fireEvent.click(save); expect(saveQueued).not.toHaveBeenCalled();
  await act(async()=>decode.resolve());
});
it('discards late inference from an earlier photo snapshot', async () => {
  await select('old.png'); const inference=deferred<AnalysisResult>(); vi.spyOn(api,'analyze').mockReturnValueOnce(inference.promise);
  fireEvent.click(screen.getByRole('button',{name:'Help describe this'}));
  await select('new.png'); await act(async()=>inference.resolve(result));
  expect(screen.queryByText('Suggested description · please check')).not.toBeInTheDocument();
  expect(screen.getByText('new.png')).toBeInTheDocument();
});
it('keeps the newest photo when replacements finish in reverse order', async () => {
  const first=deferred<void>(), second=deferred<void>();
  vi.mocked(validateImage).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  await select('first.png'); await select('second.png');
  await act(async()=>second.resolve()); await act(async()=>first.resolve());
  expect(screen.getByText('second.png')).toBeInTheDocument(); expect(screen.queryByText('first.png')).not.toBeInTheDocument();
});
