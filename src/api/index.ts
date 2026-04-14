import axios from 'axios'
import type { RailStatus, Incident, ComplianceMetric, ComplianceViolation, CommunicationDraft } from '../types'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE })

// Rails
export const fetchRailStatus = () =>
  api.get<RailStatus[]>('/api/v1/rails/status/').then(r => r.data)

export const fetchRailHistory = (railName: string) =>
  api.get<RailStatus[]>(`/api/v1/rails/${railName}/history/`).then(r => r.data)

export const triggerPoll = () =>
  api.post('/api/v1/rails/poll/').then(r => r.data)

// Incidents
export const fetchIncidents = (params?: { status?: string; rail?: string; severity?: string }) =>
  api.get<Incident[]>('/api/v1/incidents/', { params }).then(r => r.data)

export const fetchIncident = (id: string) =>
  api.get<Incident>(`/api/v1/incidents/${id}/`).then(r => r.data)

export const resolveIncident = (id: string) =>
  api.post(`/api/v1/incidents/${id}/resolve/`).then(r => r.data)

export const simulateIncident = (rail: string, successRate: number) =>
  api.post('/api/v1/incidents/simulate/', { rail, success_rate: successRate }).then(r => r.data)

// Compliance
export const fetchComplianceDashboard = () =>
  api.get<ComplianceMetric[]>('/api/v1/compliance/dashboard/').then(r => r.data)

export const fetchComplianceViolations = () =>
  api.get<ComplianceViolation[]>('/api/v1/compliance/violations/').then(r => r.data)

// Communications
export const fetchCommunications = (incidentId?: string) =>
  api.get<CommunicationDraft[]>('/api/v1/communications/', {
    params: incidentId ? { incident_id: incidentId } : undefined
  }).then(r => r.data)

export const approveDraft = (id: string, approvedBy: string = 'ops_analyst') =>
  api.post(`/api/v1/communications/${id}/approve/`, { approved_by: approvedBy }).then(r => r.data)

export const rejectDraft = (id: string, reason: string) =>
  api.post(`/api/v1/communications/${id}/reject/`, { reason }).then(r => r.data)
