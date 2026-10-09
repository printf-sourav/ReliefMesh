import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../lib/api';
import { acknowledge, saveQueued } from '../lib/queue';
import type { AnalysisResult, IncidentRecord } from '../lib/api-types';
import ReportPage from './report';
vi.mock('../App', () => ({ useConnection: () => ({ online:true,changed:vi.fn() }) }));
vi.mock('../lib/queue', () => ({ saveQueued:vi.fn(),acknowledge:vi.fn() }));
vi.mock('../lib/draft', async importOriginal => ({ ...await importOriginal<typeof import('../lib/draft')>(),validateImage:vi.fn().mockResolvedValue(undefined) }));
const analysis: AnalysisResult = { analysis:{ incident_type:'Flooding',summary:'Water entering home',people_affected:4,vulnerable_people:['Elderly person'],reported_needs:['Water'],location_context:'Riverside',language:'Hinglish',image_observations:['Water visible'],confidence:null,verification_required:true },analysis_mode:'live',model_id:'test-provider',warnings:[] };
beforeEach(() => {
  vi.mocked(saveQueued).mockReset().mockResolvedValue(undefined); vi.mocked(acknowledge).mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('URL', class extends URL { static createObjectURL() { return 'blob:test'; } static revokeObjectURL() {} });
});
function setup() { render(<MemoryRouter><ReportPage/></MemoryRouter>); return userEvent.setup(); }
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/What happened?/),'Hamare ghar mein paani aa gaya. Chaar log hain.');
  await user.type(screen.getByLabelText(/Where is it?/),'Riverside Colony');
  await user.upload(screen.getByLabelText('Incident photo'),new File(['image'],'photo.png',{ type:'image/png' }));
}
describe('citizen submission integrity', () => {
  it('requires a photo before contacting inference', async () => {
    const analyze = vi.spyOn(api,'analyze'); const user = setup(); await user.click(screen.getByRole('button',{ name:'Help describe this' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add an incident photo'); expect(analyze).not.toHaveBeenCalled();
  });
  it('invalidates analysis when source text changes', async () => {
    vi.spyOn(api,'analyze').mockResolvedValue(analysis); const user = setup(); await fill(user); await user.click(screen.getByRole('button',{ name:'Help describe this' }));
    expect(await screen.findByText('Suggested description · please check')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/What happened?/),' More water.');
    expect(screen.queryByText('Suggested description · please check')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{ name:/Send report/ })).toBeInTheDocument();
  });
  it('keeps original analysis separate from citizen edits and prevents double submission', async () => {
    vi.spyOn(api,'analyze').mockResolvedValue(analysis);
    const create = vi.spyOn(api,'create').mockImplementation(async input => ({ id:'server',client_report_id:input.client_report_id,sync_status:'synced' } as IncidentRecord));
    const user = setup(); await fill(user); await user.click(screen.getByRole('button',{ name:'Help describe this' })); await screen.findByLabelText('Summary');
    await user.clear(screen.getByLabelText('Summary')); await user.type(screen.getByLabelText('Summary'),'Corrected citizen summary');
    await user.dblClick(screen.getByRole('button',{ name:/Send report/ }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0].analysis_result?.analysis.summary).toBe('Water entering home');
    expect(create.mock.calls[0][0].edited_analysis?.summary).toBe('Corrected citizen summary');
    expect(saveQueued).toHaveBeenCalledBefore(create); expect(acknowledge).toHaveBeenCalled();
  });
  it('keeps an uncertain delivery in device storage with the original UUID', async () => {
    const create = vi.spyOn(api,'create').mockRejectedValue(new Error('Timeout'));
    const user = setup(); await fill(user); await user.click(screen.getByRole('button',{ name:/Send report/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved on this phone.');
    expect(create.mock.calls[0][0].client_report_id).toBe(vi.mocked(saveQueued).mock.calls[0][0].client_report_id);
    expect(acknowledge).not.toHaveBeenCalled();
  });
  it('does not claim a save or call the API after storage quota failure', async () => {
    vi.mocked(saveQueued).mockRejectedValue(new DOMException('Full','QuotaExceededError')); const create = vi.spyOn(api,'create');
    const user = setup(); await fill(user); await user.click(screen.getByRole('button',{ name:/Send report/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your phone could not save'); expect(create).not.toHaveBeenCalled(); expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
