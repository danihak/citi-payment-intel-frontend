import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AreaChart, Area, ResponsiveContainer, Tooltip, ReferenceLine, XAxis } from 'recharts'
import { fetchIncident, fetchCommunications, approveDraft, rejectDraft, resolveIncident, fetchIncidentSnapshotHistory } from '../api'
import type { CommunicationDraft } from '../types'

interface Props { incidentId: string; onBack: () => void }

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff/60)}m ago`
  if (diff < 86400) return `${Math.round(diff/3600)}h ago`
  return `${Math.round(diff/86400)}d ago`
}

function timeDiff(a: string, b: string) {
  const diff = Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s`
  if (diff < 3600) return `${Math.round(diff/60)}m ${Math.round(diff%60)}s`
  const h = Math.floor(diff/3600)
  const m = Math.round((diff%3600)/60)
  return `${h}h ${m}m`
}

export function IncidentDetail({ incidentId, onBack }: Props) {
  const qc = useQueryClient()
  const { data: incident, isLoading } = useQuery({ queryKey: ['incident', incidentId], queryFn: () => fetchIncident(incidentId), refetchInterval: 10000 })
  const { data: comms } = useQuery({ queryKey: ['communications', incidentId], queryFn: () => fetchCommunications(incidentId), refetchInterval: 10000 })
  const { data: snapshotHistory } = useQuery({
    queryKey: ['incident-snapshots', incidentId],
    queryFn: () => fetchIncidentSnapshotHistory(incidentId),
    enabled: !!incident,
    refetchInterval: incident && (incident.status === 'active' || incident.status === 'investigating') ? 10000 : false,
  })

  const approveMut = useMutation({ mutationFn: (id: string) => approveDraft(id, 'ops_analyst'), onSuccess: () => qc.invalidateQueries({ queryKey: ['communications', incidentId] }) })
  const rejectMut = useMutation({ mutationFn: (id: string) => rejectDraft(id, 'Needs revision'), onSuccess: () => qc.invalidateQueries({ queryKey: ['communications', incidentId] }) })
  const resolveMut = useMutation({ mutationFn: () => resolveIncident(incidentId), onSuccess: () => { qc.invalidateQueries({ queryKey: ['incident', incidentId] }); qc.invalidateQueries({ queryKey: ['incidents'] }) } })

  if (isLoading) return <div style={{ padding: 48, textAlign: 'center', fontFamily: 'IBM Plex Mono', color: '#3D5166' }}>LOADING INCIDENT DATA...</div>
  if (!incident) return null

  const isActive = incident.status === 'active' || incident.status === 'investigating'
  const rerouting = incident.rerouting?.[0]
  const agentRuns = incident.agent_runs || []
  const confidence = parseFloat(String(incident.confidence_score))

  // Build chart data from the incident-specific snapshot window. This shows the
  // actual dip at the time the incident happened, not whatever the rail is doing
  // right now (which for a resolved incident from 2h ago would just be a flat
  // baseline that contradicts the classifier reasoning).
  const chartData = (snapshotHistory?.snapshots || []).map((s, i) => ({
    i,
    rate: s.success_rate,
    snapshot_at: s.snapshot_at,
  }))

  // Find the index of the snapshot closest to detected_at — that's where the
  // dotted DETECTED line goes on the chart.
  const detectedIdx = (() => {
    if (chartData.length === 0 || !snapshotHistory) return -1
    const detectedTs = new Date(snapshotHistory.detected_at).getTime()
    let bestIdx = -1
    let bestDelta = Infinity
    for (let i = 0; i < chartData.length; i++) {
      const delta = Math.abs(new Date(chartData[i].snapshot_at).getTime() - detectedTs)
      if (delta < bestDelta) { bestDelta = delta; bestIdx = i }
    }
    return bestIdx
  })()

  // Trough: lowest rate observed in the dip window. This is what we estimate
  // failed-transaction count from — using current rate (the old approach) gave
  // ~0.4k for every resolved incident regardless of severity.
  const troughRate = chartData.length > 0
    ? Math.min(...chartData.map(c => c.rate))
    : 100
  // Per-rail TPM baseline for impact estimation. UPI is by far the highest volume.
  const RAIL_TPM: Record<string, number> = { UPI: 14200, IMPS: 3800, RTGS: 180, NEFT: 620, NACH: 290 }
  const tpm = RAIL_TPM[incident.rail_name] ?? 5000
  // Duration in minutes — for resolved incidents, the actual duration; for active,
  // time elapsed since detection.
  const incidentDurationMin = incident.resolved_at
    ? Math.max(1, (new Date(incident.resolved_at).getTime() - new Date(incident.detected_at).getTime()) / 60000)
    : Math.max(1, (Date.now() - new Date(incident.detected_at).getTime()) / 60000)
  // Failed txns ≈ tpm × duration × failure_rate
  const estimatedFailedTxns = Math.round(tpm * incidentDurationMin * (100 - troughRate) / 100)

  const classColors: Record<string, string> = { NPCI_SIDE: '#F04438', BANK_SIDE: '#F79009', FALSE_POSITIVE: '#12B76A', UNKNOWN: '#7A8FA6' }
  const classLabels: Record<string, string> = { NPCI_SIDE: 'NPCI Infrastructure Issue', BANK_SIDE: 'Bank-side Failure', FALSE_POSITIVE: 'False Positive', UNKNOWN: 'Under Investigation' }
  const classColor = classColors[incident.classification] || '#7A8FA6'

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px', position: 'relative', zIndex: 1 }}>

      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#7A8FA6', padding: '6px 12px', borderRadius: 3, cursor: 'pointer', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
            ← BACK
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              {isActive && <span className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#F04438', display: 'inline-block' }}/>}
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 16, fontWeight: 500, color: '#E4EBF5' }}>{incident.rail_name} — {incident.title}</span>
              <span className={`badge badge-${incident.severity}`}>{incident.severity}</span>
              <span className={`badge badge-${incident.status}`}>{incident.status}</span>
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166' }}>
              DETECTED {timeAgo(incident.detected_at)}
              {incident.resolved_at && ` · RESOLVED IN ${timeDiff(incident.detected_at, incident.resolved_at)}`}
              · ID: {incidentId.slice(0, 8).toUpperCase()}
            </div>
          </div>
        </div>
        {isActive && (
          <button onClick={() => resolveMut.mutate()} disabled={resolveMut.isPending}
            style={{ background: 'rgba(18,183,106,0.1)', border: '1px solid rgba(18,183,106,0.25)', color: '#12B76A', padding: '8px 20px', borderRadius: 3, cursor: 'pointer', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
            {resolveMut.isPending ? 'RESOLVING...' : '✓ MARK RESOLVED'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* AI Classification — hero card */}
        <div style={{ background: 'var(--navy-2)', border: `1px solid ${classColor}40`, borderRadius: 6, padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: `radial-gradient(circle, ${classColor}08, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            AI ROOT CAUSE CLASSIFICATION · CLAUDE API
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 20, fontWeight: 500, color: classColor, marginBottom: 8 }}>
                {classLabels[incident.classification]}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#7A8FA6' }}>
                {incident.historical_match && `Matches: ${incident.historical_match}`}
              </div>
            </div>
            {/* Confidence gauge */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `conic-gradient(${classColor} ${confidence * 3.6}deg, rgba(255,255,255,0.06) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--navy-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, fontWeight: 500, color: classColor }}>{confidence.toFixed(0)}%</span>
                </div>
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#3D5166', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confidence</div>
            </div>
          </div>
          {incident.classifier_reasoning && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, padding: 12 }}>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#3D5166', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Classifier Reasoning</div>
              <p style={{ fontSize: 12, color: '#7A8FA6', lineHeight: 1.6 }}>{incident.classifier_reasoning}</p>
            </div>
          )}
        </div>

        {/* Degradation chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            {incident.rail_name} SUCCESS RATE — DEGRADATION PATTERN
          </div>
          <div style={{ height: 140, marginBottom: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00A3E0" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#00A3E0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" hide />
                <Tooltip contentStyle={{ background: '#0F1E35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 11, fontFamily: 'IBM Plex Mono' }} formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'Success Rate']} labelFormatter={() => ''} />
                {detectedIdx > 0 && <ReferenceLine x={detectedIdx} stroke="#F04438" strokeDasharray="3 3" label={{ value: 'DETECTED', position: 'top', fill: '#F04438', fontSize: 9, fontFamily: 'IBM Plex Mono' }} />}
                <Area type="monotone" dataKey="rate" stroke="#00A3E0" strokeWidth={1.5} fill="url(#rateGrad)" dot={false} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Time to Detect', val: '< 30s', sub: 'Auto-detected' },
              { label: 'Time to Classify', val: '< 2 min', sub: 'Claude API' },
              { label: 'Est. Txns Impacted', val: `~${(estimatedFailedTxns/1000).toFixed(1)}k`, sub: 'In detection window' },
            ].map(m => (
              <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 3, padding: '8px 10px' }}>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#3D5166', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, color: '#00A3E0', marginBottom: 2 }}>{m.val}</div>
                <div style={{ fontSize: 10, color: '#7A8FA6' }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Rerouting */}
        {rerouting ? (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Rerouting Recommendation</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(240,68,56,0.2)', borderRadius: 4, padding: '8px 16px', fontFamily: 'IBM Plex Mono', fontSize: 16, color: '#F04438' }}>{rerouting.from_rail}</div>
              <div style={{ color: '#12B76A', fontSize: 18 }}>→</div>
              <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(18,183,106,0.2)', borderRadius: 4, padding: '8px 16px', fontFamily: 'IBM Plex Mono', fontSize: 16, color: '#12B76A' }}>{rerouting.to_rail}</div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, color: '#12B76A' }}>{parseFloat(String(rerouting.estimated_success_rate)).toFixed(1)}%</div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#3D5166' }}>Est. Success Rate</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#7A8FA6', lineHeight: 1.6 }}>{rerouting.rationale}</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Rerouting Recommendation</div>
            <div style={{ color: '#3D5166', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>AWAITING REROUTING ADVISOR AGENT...</div>
          </div>
        )}

        {/* Agent pipeline timeline */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Agent Pipeline — Audit Trail</div>
          {agentRuns.length === 0 ? (
            <div style={{ color: '#3D5166', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>NO AGENT RUNS RECORDED</div>
          ) : (
            <div>
              {agentRuns.map((run, i) => (
                <div key={run.id} style={{ display: 'flex', gap: 12, paddingBottom: i < agentRuns.length - 1 ? 12 : 0, position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: run.status === 'completed' ? '#12B76A' : run.status === 'failed' ? '#F04438' : '#F79009', flexShrink: 0, marginTop: 3 }}/>
                    {i < agentRuns.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', marginTop: 4 }}/>}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 12, color: '#E4EBF5', fontWeight: 500 }}>{run.agent_type.replace(/_/g, ' ')}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: run.status === 'completed' ? '#12B76A' : '#F04438' }}>{run.status.toUpperCase()}</div>
                        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#3D5166' }}>{run.duration_ms}ms</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Communication drafts — full width */}
      {comms && comms.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Communication Drafts</span>
            <span style={{ color: '#F79009' }}>· HUMAN APPROVAL REQUIRED BEFORE SENDING</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {comms.map((draft: CommunicationDraft) => (
              <div key={draft.id} style={{
                background: draft.status === 'approved' ? 'rgba(18,183,106,0.05)' : draft.status === 'rejected' ? 'rgba(240,68,56,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${draft.status === 'approved' ? 'rgba(18,183,106,0.2)' : draft.status === 'rejected' ? 'rgba(240,68,56,0.2)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 4, padding: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#7A8FA6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {draft.audience === 'client_services' ? 'Internal · Client Services' : 'External · Corporate Client'}
                  </span>
                  <span className={`badge badge-${draft.status}`}>{draft.status}</span>
                </div>
                {draft.subject_line && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#E4EBF5', marginBottom: 8 }}>{draft.subject_line}</div>
                )}
                <p style={{ fontSize: 12, color: '#7A8FA6', lineHeight: 1.7, marginBottom: 12 }}>{draft.draft_text}</p>
                {draft.status === 'draft' && (
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                    <button onClick={() => approveMut.mutate(draft.id)}
                      style={{ background: 'rgba(18,183,106,0.1)', border: '1px solid rgba(18,183,106,0.25)', color: '#12B76A', padding: '6px 16px', borderRadius: 3, fontSize: 11, cursor: 'pointer', fontFamily: 'IBM Plex Mono' }}>
                      ✓ APPROVE
                    </button>
                    <button onClick={() => rejectMut.mutate(draft.id)}
                      style={{ background: 'transparent', border: '1px solid rgba(240,68,56,0.2)', color: '#F04438', padding: '6px 16px', borderRadius: 3, fontSize: 11, cursor: 'pointer', fontFamily: 'IBM Plex Mono' }}>
                      ✕ REJECT
                    </button>
                    <span style={{ fontSize: 10, color: '#3D5166', display: 'flex', alignItems: 'center' }}>Approval required before distribution</span>
                  </div>
                )}
                {draft.status === 'approved' && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#12B76A' }}>
                    ✓ APPROVED BY {draft.approved_by.toUpperCase()} · READY FOR DISTRIBUTION
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
