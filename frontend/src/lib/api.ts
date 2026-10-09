import { Capacitor } from '@capacitor/core';
import type { AnalysisResult, ClusterSummary, DashboardMetrics, DashboardSnapshot, Draft, DuplicatePage, Health, IncidentAnalysis, IncidentRecord, Page, Submission, SyncResult } from './api-types';

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) { super(message); }
}
const overrideKey = 'reliefmesh.api-origin';
export const fixturesEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true';
export function validateOrigin(value: string): string {
  if (!value.trim()) return '';
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Use an HTTP or HTTPS origin, such as http://192.168.1.20:8000, without a path or credentials.');
  }
  return url.origin;
}
export function getOrigin() { return localStorage.getItem(overrideKey) ?? import.meta.env.VITE_API_BASE_URL ?? ''; }
export function setOrigin(value: string) { localStorage.setItem(overrideKey, validateOrigin(value)); }
export function imageUrl(id: string) { return `${getOrigin()}/api/v1/reports/${encodeURIComponent(id)}/image`; }
const configuredAnalysisTimeout = Number(import.meta.env.VITE_ANALYSIS_TIMEOUT_MS);
export const analysisTimeout = Number.isFinite(configuredAnalysisTimeout) && configuredAnalysisTimeout >= 1000 ? configuredAnalysisTimeout : 120000;
async function request<T>(path: string, init?: RequestInit, inspectHeaders?: (headers: Headers) => void, timeoutMs = init?.method ? 60000 : 15000): Promise<T> {
  if (fixturesEnabled) {
    const { mockRequest } = await import('../mocks/transport');
    return mockRequest<T>(path, init);
  }
  if (Capacitor.isNativePlatform() && !getOrigin()) throw new ApiError('API_UNREACHABLE', 'Set a reachable backend address in Connection settings.');
  let response: Response;
  const signal = AbortSignal.timeout(timeoutMs);
  try { response = await fetch(`${getOrigin()}/api/v1${path}`, { ...init, signal }); }
  catch {
    if (signal.aborted) throw new ApiError('REQUEST_TIMEOUT', `The request timed out after ${timeoutMs / 1000} seconds. Your source is retained. Analysis may still be running on the backend; check before explicitly analyzing again.`);
    throw new ApiError('API_UNREACHABLE', 'The API could not be reached. Saved reports remain on this device for retry.');
  }
  let body: unknown;
  try { body = await response.json(); } catch { throw new ApiError('INVALID_RESPONSE', 'The API returned an unreadable response. Delivery is unconfirmed.', response.status); }
  if (!response.ok) {
    const error = (body as { error?: { code?: string; message?: string } }).error;
    throw new ApiError(error?.code ?? 'HTTP_ERROR', error?.message ?? `API request failed (${response.status}).`, response.status);
  }
  inspectHeaders?.(response.headers);
  return body as T;
}
function json(method: string, body?: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) };
}
export function multipart(draft: Draft, extra: object = {}): FormData {
  // Device retry records contain local bookkeeping; send only the agreed wire fields.
  const { image, image_name, client_report_id, original_text, location, latitude, longitude } = draft;
  const metadata = { client_report_id, original_text, location, latitude, longitude };
  const data = new FormData();
  data.append('image', image, image_name);
  data.append('metadata', JSON.stringify({ ...metadata, ...extra }));
  return data;
}
export const api = {
  health: () => request<Health>('/health', undefined, undefined, 5000),
  analyze: (draft: Draft) => request<AnalysisResult>('/analyses', { method: 'POST', body: multipart(draft) }, undefined, analysisTimeout),
  create: (draft: Submission, network_online: boolean) => {
    const { analysis_result, edited_analysis, ...source } = draft;
    return request<IncidentRecord>('/reports', { method: 'POST', body: multipart(source, { analysis_result, edited_analysis, network_online }) });
  },
  reports: (synced = false, offset = 0) => request<Page<IncidentRecord>>(`/reports?synced_only=${synced}&offset=${offset}&limit=100`),
  report: (id: string) => request<IncidentRecord>(`/reports/${encodeURIComponent(id)}`),
  clusters: (offset = 0) => request<Page<ClusterSummary>>(`/clusters?synced_only=true&offset=${offset}&limit=100`),
  sources: (id: string, offset = 0) => request<Page<IncidentRecord>>(`/clusters/${encodeURIComponent(id)}/reports?synced_only=true&offset=${offset}&limit=100`),
  metrics: async (): Promise<DashboardSnapshot> => {
    let matching_available: boolean | null = fixturesEnabled ? true : null;
    let matching_warning: string | null = null;
    const metrics = await request<DashboardMetrics>('/dashboard/metrics', undefined, headers => {
      const value = headers.get('X-ReliefMesh-Matching-Available');
      matching_available = value === 'true' ? true : value === 'false' ? false : null;
      matching_warning = headers.get('X-ReliefMesh-Matching-Warning');
    });
    return { ...metrics, matching_available, matching_warning };
  },
  duplicates: (id: string) => request<DuplicatePage>(`/reports/${encodeURIComponent(id)}/duplicates?synced_only=true&offset=0&limit=100`),
  correct: (id: string, analysis: IncidentAnalysis) => request<IncidentRecord>(`/reports/${encodeURIComponent(id)}/analysis`, json('PATCH', { analysis })),
  reanalyze: (id: string) => request<IncidentRecord>(`/reports/${encodeURIComponent(id)}/analyses`, { method: 'POST' }, undefined, analysisTimeout),
  verify: (id: string) => request<IncidentRecord>(`/reports/${encodeURIComponent(id)}/verifications`, { method: 'POST' }),
  link: (id: string, target_cluster_id: string) => request<IncidentRecord>(`/reports/${encodeURIComponent(id)}/cluster-membership`, json('PUT', { target_cluster_id })),
  separate: (id: string) => request<IncidentRecord>(`/reports/${encodeURIComponent(id)}/cluster-membership`, { method: 'DELETE' }),
  queue: (offset = 0) => request<Page<IncidentRecord>>(`/queue?offset=${offset}&limit=100`),
  sync: (network_online: boolean) => request<SyncResult>('/sync', json('POST', { network_online })),
};
export async function allPages<T>(fetchPage: (offset: number) => Promise<Page<T>>): Promise<T[]> {
  const items: T[] = [];
  for (;;) {
    const page = await fetchPage(items.length); items.push(...page.items);
    if (!page.items.length || items.length >= page.total) return items;
  }
}
