import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { fetchRailStatus, fetchIncidents, fetchComplianceDashboard, fetchRailHistory, simulateIncident, triggerPoll } from '../api'
import type { RailStatus } from '../types'

interface DashboardProps { onSelectIncident: (id: string) => void }

const S = {
  page: { maxWidth: 1400, margin: '0 auto', padding: '24px 24px' } as React.CSSProperties,
  row: { display: 'flex', gap: 16 } as React.CSSProperties,
  label: { fontFamily: 'IBM Plex Mono', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#3D5166', marginBottom: 6 },
  val: { fontFamily: 'IBM Plex Mono', fontSize: 28, fontWeight: 500, lineHeight: 1 } as React.CSSProperties,
  sub: { fontSize: 11, color: '#7A8FA6', marginTop: 4 } as React.CSSProperties,
  sectionHead: { fontSize: 11, fontFamily: 'IBM Plex Mono', color: '#7A8FA6', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
}

function statusColor(s: string) {
  if (s === 'healthy') return '#12B76A'
  if (s === 'degraded') return '#F79009'
  return '#F04438'
}

function RailMiniCard({ rail, activeIncident, onSelectIncident }: {
  rail: RailStatus
  activeIncident?: { id: string; severity: string; title: string }
  onSelectIncident?: (id: string) => void
}) {
  const { data: history } = useQuery({
    queryKey: ['rail-history', rail.rail_name],
    queryFn: () => fetchRailHistory(rail.rail_name),
    refetchInterval: 30000,
    staleTime: 20000,
  })
  const chartData = (history || []).slice(0, 30).reverse().map(s => ({ v: parseFloat(String(s.success_rate)) }))
  const rate = parseFloat(String(rail.success_rate))
  const c = statusColor(rail.status)

  // Severity colour for the INVESTIGATING tag
  const sevColor = activeIncident
    ? (activeIncident.severity === 'critical' ? '#F04438'
       : activeIncident.severity === 'high'    ? '#F79009'
       :                                          '#00A3E0')
    : undefined

  return (
    <div className="card" style={{ flex: 1, padding: 16, borderLeft: `3px solid ${c}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#7A8FA6', marginBottom: 4 }}>{rail.rail_name}</div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 24, fontWeight: 500, color: c }}>{rate.toFixed(1)}%</div>
        </div>
        <span className={`badge badge-${rail.status}`}>{rail.status}</span>
      </div>
      {activeIncident && (
        <button
          onClick={() => onSelectIncident?.(activeIncident.id)}
          title={activeIncident.title}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: `rgba(${sevColor === '#F04438' ? '240,68,56' : sevColor === '#F79009' ? '247,144,9' : '0,163,224'}, 0.12)`,
            border: `1px solid ${sevColor}40`,
            color: sevColor,
            padding: '2px 7px', borderRadius: 3,
            fontFamily: 'IBM Plex Mono', fontSize: 9, fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: 'pointer', marginBottom: 8,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sevColor, display: 'inline-block' }} />
          Investigating · {activeIncident.severity}
        </button>
      )}
      <div style={{ height: 40, marginBottom: 8 }}>
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`g${rail.rail_name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={c} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={c} strokeWidth={1.5} fill={`url(#g${rail.rail_name})`} dot={false} isAnimationActive={false}/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Latency', val: `${rail.latency_ms}ms` },
          { label: 'TXN/min', val: `${(rail.transactions_per_min/1000).toFixed(1)}k` },
          { label: 'Error', val: `${parseFloat(String(rail.error_rate)).toFixed(1)}%` },
        ].map(m => (
          <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 3, padding: '6px 8px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166', marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#E4EBF5' }}>{m.val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff/60)}m ago`
  if (diff < 86400) return `${Math.round(diff/3600)}h ago`
  return `${Math.round(diff/86400)}d ago`
}

export function Dashboard({ onSelectIncident }: DashboardProps) {
  const qc = useQueryClient()
  const { data: rails, dataUpdatedAt } = useQuery({ queryKey: ['rails'], queryFn: fetchRailStatus, refetchInterval: 30000 })
  const { data: incidents } = useQuery({ queryKey: ['incidents'], queryFn: fetchIncidents, refetchInterval: 15000 })
  const { data: compliance } = useQuery({ queryKey: ['compliance'], queryFn: fetchComplianceDashboard, refetchInterval: 30000 })
  const { data: upiHistory } = useQuery({ queryKey: ['rail-history', 'UPI'], queryFn: () => fetchRailHistory('UPI'), refetchInterval: 30000 })

  const simMutation = useMutation({
    mutationFn: () => simulateIncident('UPI', 71.3),
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['incidents'] }), 3000)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['rails'] }), 1000)
    },
  })

  const activeIncidents = incidents?.filter(i => i.status === 'active' || i.status === 'investigating') || []
  const resolvedToday = incidents?.filter(i => i.status === 'resolved') || []
  const healthyRails = rails?.filter(r => r.status === 'healthy').length ?? 0
  const totalRails = rails?.length ?? 5
  const healthScore = Math.round((healthyRails / totalRails) * 100)

  // Banner picks highest-severity active incident, not most-recent.
  // Without this, the banner picks whichever active incident was detected last,
  // even if a higher-severity incident is still unresolved on another rail.
  const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
  const bannerIncident = [...activeIncidents].sort((a, b) => {
    const sevDiff = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
    if (sevDiff !== 0) return sevDiff
    return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
  })[0]

  // Pick a status verb that matches the actual rail state of the banner incident
  // (DOWN if the rail is currently down, otherwise DEGRADED) so banner and rail
  // card never disagree on phrasing.
  const bannerRailState = bannerIncident
    ? rails?.find(r => r.rail_name === bannerIncident.rail_name)?.status
    : undefined
  const bannerStateLabel = bannerRailState === 'down' ? 'DOWN' : 'DEGRADED'

  // Build 2-hour UPI volume chart
  const volumeData = (upiHistory || []).slice(0, 48).reverse().map((s, i) => ({
    t: i,
    vol: s.transactions_per_min,
    rate: parseFloat(String(s.success_rate)),
  }))

  // Compliance summary
  const complianceScore = compliance
    ? Math.round((compliance.filter(m => m.is_compliant).length / compliance.length) * 100)
    : 100

  // Map of rail_name → active incident, used by RailMiniCard to surface an
  // 'INVESTIGATING' tag when a rail looks healthy but has an open incident.
  const incidentByRail: Record<string, typeof activeIncidents[number] | undefined> = {}
  for (const inc of activeIncidents) {
    // Keep the highest-severity active incident per rail
    const existing = incidentByRail[inc.rail_name]
    if (!existing || (SEVERITY_RANK[inc.severity] ?? 0) > (SEVERITY_RANK[existing.severity] ?? 0)) {
      incidentByRail[inc.rail_name] = inc
    }
  }

  return (
    <div style={{ ...S.page, position: 'relative', zIndex: 1 }}>

      {/* Alert banner */}
      {bannerIncident ? (
        <div style={{ background: 'rgba(240,68,56,0.08)', border: '1px solid rgba(240,68,56,0.2)', borderLeft: '3px solid #F04438', borderRadius: 4, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#F04438', display: 'inline-block' }}/>
            <span style={{ color: '#F04438', fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 500 }}>
              ACTIVE INCIDENT — {bannerIncident.rail_name} {bannerStateLabel}
            </span>
            <span style={{ color: '#7A8FA6', fontSize: 12 }}>{bannerIncident.title}</span>
          </div>
          <button onClick={() => onSelectIncident(bannerIncident.id)} style={{ background: 'rgba(240,68,56,0.15)', border: '1px solid rgba(240,68,56,0.3)', color: '#F04438', padding: '4px 12px', borderRadius: 3, fontSize: 11, cursor: 'pointer', fontFamily: 'IBM Plex Mono' }}>
            VIEW →
          </button>
        </div>
      ) : (
        <div style={{ background: 'rgba(18,183,106,0.06)', border: '1px solid rgba(18,183,106,0.15)', borderLeft: '3px solid #12B76A', borderRadius: 4, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#12B76A', display: 'inline-block' }}/>
            <span style={{ color: '#12B76A', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>ALL SYSTEMS NOMINAL</span>
            <span style={{ color: '#7A8FA6', fontSize: 12 }}>5 payment rails operating within normal parameters</span>
          </div>
          <span style={{ color: '#3D5166', fontSize: 11, fontFamily: 'IBM Plex Mono' }}>Updated {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}</span>
        </div>
      )}

      {/* Top KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'System Health', val: `${healthScore}%`, sub: `${healthyRails}/${totalRails} rails healthy`, color: healthScore === 100 ? '#12B76A' : '#F79009' },
          { label: 'Active Incidents', val: String(activeIncidents.length), sub: activeIncidents.length > 0 ? 'Requires attention' : 'No active issues', color: activeIncidents.length > 0 ? '#F04438' : '#12B76A' },
          { label: 'Root Cause Target', val: '<2 min', sub: '↓ from 18–25 min', color: '#00A3E0' },
          { label: 'Resolved Today', val: String(resolvedToday.length), sub: 'Incidents closed', color: '#7A8FA6' },
          { label: 'OC-215 Status', val: `${complianceScore}%`, sub: complianceScore === 100 ? 'Current TPS within limits' : 'Current breach — see audit log', color: complianceScore === 100 ? '#12B76A' : '#F04438' },
          { label: 'UPI Success Rate', val: rails?.find(r => r.rail_name === 'UPI') ? `${parseFloat(String(rails.find(r => r.rail_name === 'UPI')!.success_rate)).toFixed(1)}%` : '—', sub: 'Primary rail', color: statusColor(rails?.find(r => r.rail_name === 'UPI')?.status || 'healthy') },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={S.label}>{k.label}</div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 22, fontWeight: 500, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#7A8FA6' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Rail cards */}
      <div style={{ marginBottom: 20 }}>
        <div style={S.sectionHead}>
          <span>Payment Rail Status — Real-time</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => simMutation.mutate()} disabled={simMutation.isPending}
              style={{ background: 'rgba(247,144,9,0.1)', border: '1px solid rgba(247,144,9,0.25)', color: '#F79009', padding: '4px 12px', borderRadius: 3, fontSize: 11, cursor: 'pointer', fontFamily: 'IBM Plex Mono' }}>
              {simMutation.isPending ? 'TRIGGERING...' : '⚡ SIMULATE INCIDENT'}
            </button>
            <button onClick={() => { triggerPoll(); qc.invalidateQueries({ queryKey: ['rails'] }) }}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#7A8FA6', padding: '4px 12px', borderRadius: 3, fontSize: 11, cursor: 'pointer', fontFamily: 'IBM Plex Mono' }}>
              ↻ REFRESH
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {rails ? rails.map(r => (
            <RailMiniCard
              key={r.rail_name}
              rail={r}
              activeIncident={incidentByRail[r.rail_name]}
              onSelectIncident={onSelectIncident}
            />
          )) : Array(5).fill(0).map((_, i) => (
            <div key={i} className="card" style={{ height: 160, background: 'rgba(255,255,255,0.02)' }} />
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* UPI volume + success rate */}
        <div className="card" style={{ padding: 20 }}>
          <div style={S.sectionHead}>
            <span>UPI — Transaction Volume & Success Rate (Last 48 snapshots)</span>
          </div>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="t" hide />
                <YAxis yAxisId="left" domain={[60, 100]} tick={{ fontSize: 10, fill: '#3D5166', fontFamily: 'IBM Plex Mono' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#3D5166', fontFamily: 'IBM Plex Mono' }} />
                <Tooltip contentStyle={{ background: '#0F1E35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 11, fontFamily: 'IBM Plex Mono' }} labelFormatter={() => ''} />
                <Line yAxisId="left" type="monotone" dataKey="rate" stroke="#00A3E0" strokeWidth={1.5} dot={false} name="Success %" isAnimationActive={false}/>
                <Line yAxisId="right" type="monotone" dataKey="vol" stroke="rgba(0,163,224,0.3)" strokeWidth={1} dot={false} name="TXN/min" isAnimationActive={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7A8FA6' }}>
              <div style={{ width: 16, height: 2, background: '#00A3E0' }} /> Success Rate
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7A8FA6' }}>
              <div style={{ width: 16, height: 2, background: 'rgba(0,163,224,0.3)' }} /> Transaction Volume
            </div>
          </div>
        </div>

        {/* Rail comparison bar */}
        <div className="card" style={{ padding: 20 }}>
          <div style={S.sectionHead}>Rail Comparison</div>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rails?.map(r => ({ name: r.rail_name, rate: parseFloat(String(r.success_rate)), fill: statusColor(r.status) })) || []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7A8FA6', fontFamily: 'IBM Plex Mono' }} />
                <YAxis domain={[85, 100]} tick={{ fontSize: 10, fill: '#3D5166', fontFamily: 'IBM Plex Mono' }} />
                <Tooltip contentStyle={{ background: '#0F1E35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <Bar dataKey="rate" radius={[2, 2, 0, 0]} name="Success %">
                  {rails?.map((r, i) => (
                    <rect key={i} fill={statusColor(r.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom — incidents + compliance side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

        {/* Incident feed */}
        <div className="card">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#7A8FA6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Incident Log</span>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166' }}>{incidents?.length ?? 0} TOTAL</span>
          </div>
          {!incidents || incidents.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#3D5166', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>NO INCIDENTS RECORDED</div>
          ) : (
            <div>
              {incidents.slice(0, 20).map((inc, i) => {
                const isActive = inc.status === 'active' || inc.status === 'investigating'
                return (
                  <div key={inc.id} onClick={() => onSelectIncident(inc.id)}
                    style={{ padding: '12px 16px', borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className={isActive ? 'live-dot' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#F04438' : '#3D5166', flexShrink: 0, display: 'inline-block' }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#E4EBF5', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.title}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#7A8FA6' }}>{inc.rail_name}</span>
                        <span className={`badge badge-${inc.classification === 'NPCI_SIDE' ? 'npci' : inc.classification === 'BANK_SIDE' ? 'bank' : 'unknown'}`}>
                          {inc.classification === 'NPCI_SIDE' ? 'NPCI' : inc.classification === 'BANK_SIDE' ? 'BANK' : inc.classification === 'FALSE_POSITIVE' ? 'FALSE+' : 'UNKNOWN'}
                        </span>
                        {parseFloat(String(inc.confidence_score)) > 0 && (
                          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166' }}>{parseFloat(String(inc.confidence_score)).toFixed(0)}% conf</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className={`badge badge-${inc.severity}`} style={{ display: 'block', marginBottom: 3 }}>{inc.severity}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166' }}>{timeAgo(inc.detected_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Compliance summary + recent violations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={S.sectionHead}>OC-215 API Rate Compliance</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {compliance?.map(m => {
                const pct = parseFloat(String(m.utilisation_pct)) || 0
                const c = !m.is_compliant ? '#F04438' : pct >= 85 ? '#F79009' : '#12B76A'
                return (
                  <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 3, padding: '10px 12px' }}>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#3D5166', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {m.api_name.replace(/_/g, ' ')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, color: c }}>{pct.toFixed(0)}%</span>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#3D5166' }}>{parseFloat(String(m.tps_current)).toFixed(1)}/{parseFloat(String(m.tps_limit)).toFixed(0)} TPS</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: c, borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Agent pipeline status */}
          <div className="card" style={{ padding: 16 }}>
            <div style={S.sectionHead}>AI Agent Pipeline</div>
            {[
              { name: 'Rail Monitor', desc: 'Polls every 30s', status: 'RUNNING' },
              { name: 'Incident Classifier', desc: 'Claude API · RAG', status: 'STANDBY' },
              { name: 'Rerouting Advisor', desc: 'Parallel fork', status: 'STANDBY' },
              { name: 'Compliance Watchdog', desc: 'OC-215 monitoring', status: 'RUNNING' },
              { name: 'Comms Generator', desc: 'Claude API · Draft', status: 'STANDBY' },
            ].map((a, i) => (
              <div key={a.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#E4EBF5', marginBottom: 2 }}>{a.name}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166' }}>{a.desc}</div>
                </div>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: a.status === 'RUNNING' ? '#12B76A' : '#3D5166', background: a.status === 'RUNNING' ? 'rgba(18,183,106,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${a.status === 'RUNNING' ? 'rgba(18,183,106,0.2)' : 'rgba(255,255,255,0.06)'}`, padding: '2px 7px', borderRadius: 2 }}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
