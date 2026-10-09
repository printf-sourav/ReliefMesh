export interface IncidentAnalysis {
  incident_type: string; summary: string; people_affected: number | null;
  vulnerable_people: string[]; reported_needs: string[]; location_context: string;
  language: string; image_observations: string[]; confidence: number | null; verification_required: boolean;
}
export interface AnalysisResult {
  analysis: IncidentAnalysis; analysis_mode: 'live' | 'fixture'; model_id: string; warnings: string[];
}
export interface Draft {
  client_report_id: string; original_text: string; location: string;
  latitude: number | null; longitude: number | null; image: Blob; image_name: string; image_mime: string;
}
export interface Submission extends Draft {
  analysis_result: AnalysisResult | null; edited_analysis: IncidentAnalysis | null;
}
export interface IncidentRecord {
  id: string; client_report_id: string; cluster_id: string; original_text: string; location: string;
  latitude: number | null; longitude: number | null; image_path: string; created_at: string; updated_at: string;
  analysis: IncidentAnalysis | null; original_analysis: IncidentAnalysis | null;
  analysis_mode: 'live' | 'fixture' | 'deferred'; model_id: string | null;
  verification_status: 'pending' | 'verified'; network_status_at_submission: 'online' | 'offline'; sync_status: 'pending' | 'synced';
}
export interface ClusterSummary {
  cluster_id: string; title: string; report_count: number; photo_count: number; reported_needs: string[];
  languages: string[]; people_counts_by_report: Record<string, number | null>;
  first_report_at: string; latest_report_at: string; verification_status: 'pending' | 'verified';
}
export interface DuplicateCandidate { incident_id: string; cluster_id: string; similarity: number; summary: string; location: string }
export interface Page<T> { items: T[]; total: number; offset: number; limit: number }
export interface DuplicatePage extends Page<DuplicateCandidate> { matching_available: boolean; warnings: string[] }
export interface DashboardMetrics { active_clusters: number; possible_duplicate_reports: number; pending_verification_reports: number; pending_sync_reports: number }
export interface DashboardSnapshot extends DashboardMetrics { matching_available: boolean | null; matching_warning: string | null }
export interface SyncResult { synced_report_ids: string[]; pending_count: number }
export interface Health { status: string; ai_mode: string; model_id: string | null }
