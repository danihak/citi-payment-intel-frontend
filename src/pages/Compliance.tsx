import { useQuery } from '@tanstack/react-query'

import { fetchComplianceDashboard, fetchComplianceViolations } from '../api'

export function Compliance() {
  const { data: metrics, isLoading } = useQuery({ queryKey: ['compliance'], queryFn: fetchComplianceDashboard, refetchInterval: 30000 })
  const { data: violations } = useQuery({ queryKey: ['violations'], queryFn: fetchComplianceViolations, refetchInterval: 30000 })

  const allCompliant = metrics?.every(m => m.is_compliant) ?? true
  const complianceScore = metrics ? Math.round((metrics.filter(m => m.is_compliant).length / metrics.length) * 100) : 100

  const apiLabels: Record<string, string> = {
    check_transaction_status: 'Check Txn Status',
    initiate_payment: 'Initiate Payment',
    balance_enquiry: 'Balance Enquiry',
    validate_vpa: 'Validate VPA',
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px', position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>NPCI Circular · Post April 12 2025 Outage</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#E4EBF5', marginBottom: 4 }}>OC-215 Compliance Monitor</h1>
          <p style={{ fontSize: 12, color: '#7A8FA6' }}>Real-time monitoring of Citi's outgoing API call rates to NPCI · CERT-In audit trail from 2026</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 36, fontWeight: 500, color: allCompliant ? '#12B76A' : '#F04438', lineHeight: 1 }}>{complianceScore}%</div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>Compliance Score</div>
        </div>
      </div>

      {/* Context */}
      <div style={{ background: 'rgba(0,163,224,0.06)', border: '1px solid rgba(0,163,224,0.15)', borderLeft: '3px solid #00A3E0', borderRadius: 4, padding: '12px 16px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#00A3E0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>OC-215 Background</div>
        <p style={{ fontSize: 12, color: '#7A8FA6', lineHeight: 1.7 }}>
          The April 12 2025 UPI outage (5 hours, ~₹2,400 Cr in failed transactions) was caused by banks flooding NPCI's Check Transaction Status API.
          NPCI issued OC-215 mandating: max <strong style={{ color: '#E4EBF5' }}>3 TPS</strong> for Check Transaction Status, minimum <strong style={{ color: '#E4EBF5' }}>90-second gap</strong> per transaction.
          This dashboard monitors Citi's compliance in real-time and maintains the audit trail required for annual CERT-In audits from 2026.
        </p>
      </div>

      {/* API gauge grid */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#7A8FA6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>API Rate Utilisation — vs OC-215 Limits</div>
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {Array(4).fill(0).map((_, i) => <div key={i} className="card" style={{ height: 180 }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {metrics?.map(m => {
              const pct = parseFloat(String(m.utilisation_pct)) || 0
              const isViolation = !m.is_compliant
              const isWarning = pct >= 85 && m.is_compliant
              const c = isViolation ? '#F04438' : isWarning ? '#F79009' : '#12B76A'
              const bgColor = isViolation ? 'rgba(240,68,56,0.06)' : isWarning ? 'rgba(247,144,9,0.06)' : 'rgba(18,183,106,0.04)'
              const borderColor = isViolation ? 'rgba(240,68,56,0.25)' : isWarning ? 'rgba(247,144,9,0.2)' : 'rgba(255,255,255,0.07)'

              return (
                <div key={m.id} style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 6, padding: 16 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#7A8FA6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    {apiLabels[m.api_name] || m.api_name}
                  </div>

                  {/* Big % */}
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 32, fontWeight: 500, color: c, lineHeight: 1, marginBottom: 4 }}>{pct.toFixed(0)}%</div>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166', marginBottom: 12 }}>of OC-215 limit</div>

                  {/* Progress bar */}
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 12, position: 'relative' }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: c, borderRadius: 2, transition: 'width 0.5s' }} />
                    {/* Warning threshold line at 85% */}
                    <div style={{ position: 'absolute', left: '85%', top: -2, width: 1, height: 8, background: 'rgba(247,144,9,0.5)' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Current TPS', val: parseFloat(String(m.tps_current)).toFixed(2) },
                      { label: 'OC-215 Limit', val: parseFloat(String(m.tps_limit)).toFixed(1) },
                      { label: 'Calls/min', val: String(m.calls_last_minute) },
                      { label: 'Calls/hour', val: m.calls_last_hour.toLocaleString() },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 3, padding: '6px 8px' }}>
                        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#3D5166', marginBottom: 2 }}>{stat.label}</div>
                        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#E4EBF5' }}>{stat.val}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                    <span className={`badge ${isViolation ? 'badge-critical' : isWarning ? 'badge-high' : 'badge-healthy'}`}>
                      {isViolation ? '⚠ VIOLATION' : isWarning ? '⚠ WARNING' : '✓ COMPLIANT'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Violation audit log */}
      <div className="card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#7A8FA6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Violation Audit Log</span>
            {violations && violations.length > 0 && (
              <span style={{ background: 'rgba(240,68,56,0.1)', border: '1px solid rgba(240,68,56,0.2)', color: '#F04438', fontFamily: 'IBM Plex Mono', fontSize: 10, padding: '2px 8px', borderRadius: 2 }}>
                {violations.length} ENTRIES
              </span>
            )}
          </div>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166' }}>Available for CERT-In audit · RBI inspection</span>
        </div>

        {!violations || violations.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 24, color: '#12B76A', marginBottom: 8 }}>✓</div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#7A8FA6' }}>NO OC-215 VIOLATIONS RECORDED</div>
            <div style={{ fontSize: 11, color: '#3D5166', marginTop: 4 }}>Audit log is clean</div>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 180px 1fr 120px 120px', gap: 16, padding: '8px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Severity', 'API', 'Description', 'TPS (obs/limit)', 'Time'].map(h => (
                <div key={h} style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#3D5166', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
              ))}
            </div>
            {violations.map((v, i) => (
              <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '100px 180px 1fr 120px 120px', gap: 16, padding: '12px 20px', borderBottom: i < violations.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                <span className={`badge badge-${v.severity === 'critical' ? 'critical' : v.severity === 'warning' ? 'high' : 'medium'}`}>{v.severity}</span>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#7A8FA6' }}>{apiLabels[v.api_name] || v.api_name}</span>
                <span style={{ fontSize: 11, color: '#7A8FA6' }}>{v.description}</span>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#E4EBF5' }}>{parseFloat(String(v.tps_observed)).toFixed(2)} / {parseFloat(String(v.tps_limit)).toFixed(1)}</span>
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166' }}>{new Date(v.occurred_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
