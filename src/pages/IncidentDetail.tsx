import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, XCircle, ArrowRight, Shield, MessageSquare, Bot, Clock } from 'lucide-react'
import { fetchIncident, fetchCommunications, approveDraft, rejectDraft, resolveIncident } from '../api'
import type { CommunicationDraft } from '../types'

interface IncidentDetailProps {
  incidentId: string
  onBack: () => void
}

function ConfidenceMeter({ score }: { score: number }) {
  const pct = parseFloat(String(score))
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#9CA3AF'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  )
}

function DraftCard({ draft, onApprove, onReject }: {
  draft: CommunicationDraft
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const audienceLabel = {
    client_services: 'Internal — Client Services',
    corporate_client: 'External — Corporate Client',
    relationship_manager: 'Relationship Manager',
    management: 'Management',
  }[draft.audience] || draft.audience

  return (
    <div className={`border rounded-xl p-4 ${
      draft.status === 'approved' ? 'border-emerald-200 bg-emerald-50/30' :
      draft.status === 'rejected' ? 'border-red-200 bg-red-50/30' :
      'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
          {audienceLabel}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
          draft.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
          draft.status === 'rejected' ? 'bg-red-100 text-red-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {draft.status}
        </span>
      </div>

      {draft.subject_line && (
        <div className="text-sm font-semibold text-gray-800 mb-2">
          {draft.subject_line}
        </div>
      )}

      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
        {draft.draft_text}
      </p>

      {draft.tone_notes && (
        <p className="text-xs text-gray-400 italic mb-3">{draft.tone_notes}</p>
      )}

      {draft.status === 'draft' && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => onApprove(draft.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle size={12} />
            Approve
          </button>
          <button
            onClick={() => onReject(draft.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors border border-red-200"
          >
            <XCircle size={12} />
            Reject
          </button>
          <span className="text-xs text-gray-400 ml-auto">Human approval required before sending</span>
        </div>
      )}

      {draft.status === 'approved' && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-emerald-100 text-xs text-emerald-700">
          <CheckCircle size={12} />
          Approved by {draft.approved_by} · Ready for distribution
        </div>
      )}
    </div>
  )
}

export function IncidentDetail({ incidentId, onBack }: IncidentDetailProps) {
  const qc = useQueryClient()

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => fetchIncident(incidentId),
    refetchInterval: 10000,
  })

  const { data: comms } = useQuery({
    queryKey: ['communications', incidentId],
    queryFn: () => fetchCommunications(incidentId),
    refetchInterval: 10000,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveDraft(id, 'ops_analyst'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications', incidentId] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectDraft(id, 'Needs revision'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications', incidentId] }),
  })

  const resolveMutation = useMutation({
    mutationFn: () => resolveIncident(incidentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident', incidentId] })
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
      </div>
    </div>
  )

  if (!incident) return null

  const rerouting = incident.rerouting?.[0]
  const agentRuns = incident.agent_runs || []
  const isActive = incident.status === 'active' || incident.status === 'investigating'

  const classLabel: Record<string, string> = {
    NPCI_SIDE: 'NPCI Infrastructure Issue',
    BANK_SIDE: 'Bank-side Failure',
    FALSE_POSITIVE: 'False Positive',
    UNKNOWN: 'Under Investigation',
  }
  const classStyle: Record<string, string> = {
    NPCI_SIDE: 'badge-npci',
    BANK_SIDE: 'badge-bank',
    FALSE_POSITIVE: 'badge-false',
    UNKNOWN: 'badge-unknown',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* Back + header */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={14} /> Back to dashboard
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg text-gray-900">{incident.rail_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium badge-${incident.severity}`}>
              {incident.severity}
            </span>
            {isActive && <span className="w-2 h-2 rounded-full bg-red-500 live-dot" />}
          </div>
          <h1 className="text-sm text-gray-600">{incident.title}</h1>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
            <Clock size={11} />
            Detected {new Date(incident.detected_at).toLocaleString()}
            {incident.resolved_at && ` · Resolved ${new Date(incident.resolved_at).toLocaleString()}`}
          </div>
        </div>
        {isActive && (
          <button
            onClick={() => resolveMutation.mutate()}
            disabled={resolveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle size={14} />
            {resolveMutation.isPending ? 'Resolving…' : 'Mark Resolved'}
          </button>
        )}
      </div>

      <div className="space-y-4">

        {/* Classification card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={16} className="text-purple-600" />
            <h2 className="font-semibold text-sm text-gray-800">AI Classification</h2>
            <span className="text-xs text-gray-400">· Claude API</span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className={`text-sm px-3 py-1.5 rounded-lg font-semibold ${classStyle[incident.classification]}`}>
              {classLabel[incident.classification]}
            </span>
          </div>

          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Confidence</div>
            <ConfidenceMeter score={incident.confidence_score} />
          </div>

          {incident.classifier_reasoning && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-600 mb-1">Reasoning</div>
              <p className="text-sm text-gray-700 leading-relaxed">{incident.classifier_reasoning}</p>
            </div>
          )}

          {incident.historical_match && (
            <div className="mt-3 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <span className="font-medium text-blue-700">Historical match: </span>
              {incident.historical_match}
            </div>
          )}
        </div>

        {/* Rerouting recommendation */}
        {rerouting && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight size={16} className="text-amber-600" />
              <h2 className="font-semibold text-sm text-gray-800">Rerouting Recommendation</h2>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-semibold text-gray-900 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                {rerouting.from_rail}
              </span>
              <ArrowRight size={16} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-900 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                {rerouting.to_rail}
              </span>
              <span className="text-xs text-emerald-600 font-medium">
                {parseFloat(String(rerouting.estimated_success_rate)).toFixed(1)}% est. success
              </span>
            </div>
            <p className="text-sm text-gray-600">{rerouting.rationale}</p>
          </div>
        )}

        {/* Communication drafts */}
        {comms && comms.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-blue-600" />
              <h2 className="font-semibold text-sm text-gray-800">Communication Drafts</h2>
              <span className="text-xs text-gray-400">· Claude API · Human approval required</span>
            </div>
            <div className="space-y-3">
              {comms.map(draft => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onApprove={id => approveMutation.mutate(id)}
                  onReject={id => rejectMutation.mutate(id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Agent run timeline */}
        {agentRuns.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-gray-500" />
              <h2 className="font-semibold text-sm text-gray-800">Agent Audit Trail</h2>
            </div>
            <div className="space-y-2">
              {agentRuns.map(run => (
                <div key={run.id} className="flex items-center justify-between text-xs py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${run.status === 'completed' ? 'bg-emerald-400' : run.status === 'failed' ? 'bg-red-400' : 'bg-amber-400 live-dot'}`} />
                    <span className="font-medium text-gray-700">{run.agent_type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <span>{run.duration_ms}ms</span>
                    <span>{run.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
