export interface RailStatus {
  rail_name: string
  success_rate: number
  latency_ms: number
  transactions_per_min: number
  status: 'healthy' | 'degraded' | 'down' | 'maintenance'
  error_rate: number
  snapshot_at: string
}

export interface Incident {
  id: string
  rail_name: string
  classification: 'NPCI_SIDE' | 'BANK_SIDE' | 'FALSE_POSITIVE' | 'UNKNOWN'
  confidence_score: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'investigating' | 'resolved' | 'false_positive'
  title: string
  classifier_reasoning: string
  historical_match: string
  detected_at: string
  resolved_at: string | null
  agent_runs?: AgentRun[]
  rerouting?: ReroutingRecommendation[]
  communications?: CommunicationDraft[]
}

export interface AgentRun {
  id: string
  incident: string
  agent_type: string
  status: 'running' | 'completed' | 'failed'
  input_data: Record<string, unknown>
  output_data: Record<string, unknown>
  duration_ms: number
  started_at: string
  completed_at: string | null
}

export interface ReroutingRecommendation {
  id: string
  incident: string
  from_rail: string
  to_rail: string
  confidence: number
  rationale: string
  estimated_success_rate: number
  created_at: string
}

export interface CommunicationDraft {
  id: string
  incident: string
  audience: 'client_services' | 'corporate_client' | 'relationship_manager' | 'management'
  subject_line: string
  draft_text: string
  tone_notes: string
  status: 'draft' | 'approved' | 'sent' | 'rejected'
  approved_by: string
  approved_at: string | null
  created_at: string
}

export interface ComplianceMetric {
  id: string
  api_name: string
  tps_current: number
  tps_limit: number
  calls_last_minute: number
  calls_last_hour: number
  violation_count: number
  is_compliant: boolean
  utilisation_pct: number
  measured_at: string
}

export interface ComplianceViolation {
  id: string
  api_name: string
  tps_observed: number
  tps_limit: number
  severity: 'warning' | 'violation' | 'critical'
  description: string
  occurred_at: string
}

// WebSocket message types
export type WSMessage =
  | { type: 'connection.established'; message: string }
  | { type: 'rail.update'; data: RailStatus[]; timestamp: string }
  | { type: 'incident.new'; data: Incident & { recommended_action: string } }
  | { type: 'rerouting.update'; data: { incident_id: string; viable: boolean; recommendation?: ReroutingRecommendation } }
  | { type: 'compliance.update'; data: { all_compliant: boolean; violations: ComplianceViolation[] } }
  | { type: 'comms.ready'; data: { incident_id: string; drafts: Record<string, unknown> } }
