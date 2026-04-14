import axios from 'axios'
import type { RailStatus, Incident, ComplianceMetric, ComplianceViolation, CommunicationDraft } from '../types'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const api = axios.create({ baseURL: BASE })

export const fetchRailStatus = (): Promise<RailStatus[]> =>
  api.get<RailStatus[]>('/api/v1/rails/status/').then(r => r.data)

export const fetchRailHistory = (railName: string): Promise<RailStatus[]> =>
  api.get<RailStatus[]>(`/api/v1/rails/${railName}/history/`).then(r => r.data)

export const triggerPoll = (): Promise<unknown> =>
  api.post('/api/v1/rails/poll/').then(r => r.data)

export const fetchIncidents = (): Promise<Incident[]> =>
  api.get<Incident[]>('/api/v1/incidents/').then(r => r.data)

export const fetchIncident = (id: string): Promise<Incident> =>
  api.get<Incident>(`/api/v1/incidents/${id}/`).then(r => r.data)

export const resolveIncident = (id: string): Promise<unknown> =>
  api.post(`/api/v1/incidents/${id}/resolve/`).then(r => r.data)

export const simulateIncident = (rail: string, successRate: number): Promise<unknown> =>
  api.post('/api/v1/incidents/simulate/', { rail, success_rate: successRate }).then(r => r.data)

export const fetchComplianceDashboard = (): Promise<ComplianceMetric[]> =>
  api.get<ComplianceMetric[]>('/api/v1/compliance/dashboard/').then(r => r.data)

export const fetchComplianceViolations = (): Promise<ComplianceViolation[]> =>
  api.get<ComplianceViolation[]>('/api/v1/compliance/violations/').then(r => r.data)

export const fetchCommunications = (incidentId?: string): Promise<CommunicationDraft[]> =>
  api.get<CommunicationDraft[]>('/api/v1/communications/', {
    params: incidentId ? { incident_id: incidentId } : undefined
  }).then(r => r.data)

export const approveDraft = (id: string, approvedBy: string = 'ops_analyst'): Promise<unknown> =>
  api.post(`/api/v1/communications/${id}/approve/`, { approved_by: approvedBy }).then(r => r.data)

export const rejectDraft = (id: string, reason: string): Promise<unknown> =>
  api.post(`/api/v1/communications/${id}/reject/`, { reason }).then(r => r.data)
