import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchIncidents } from '../api'
import type { Incident } from '../types'

interface IncidentListProps { onSelectIncident: (id: string) => void }

const S = {
  page: { maxWidth: 1400, margin: '0 auto', padding: '24px' } as React.CSSProperties,
  label: {
    fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#3D5166',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em',
  },
  th: {
    fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#7A8FA6',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em',
    textAlign: 'left' as const, padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  td: {
    fontSize: 12, color: '#E4EBF5', padding: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
}

function severityColor(s: string) {
  if (s === 'critical') return '#F04438'
  if (s === 'high') return '#F79009'
  if (s === 'medium') return '#00A3E0'
  return '#7A8FA6'
}

function statusColor(s: string) {
  if (s === 'active') return '#F04438'
  if (s === 'investigating') return '#F79009'
  if (s === 'resolved') return '#12B76A'
  return '#7A8FA6'
}

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }

type StatusFilter = 'all' | 'active' | 'investigating' | 'resolved'
type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low'
type RailFilter = 'all' | 'UPI' | 'IMPS' | 'RTGS' | 'NEFT' | 'NACH'
type SortKey = 'detected' | 'severity'

export function IncidentList({ onSelectIncident }: IncidentListProps) {
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: fetchIncidents,
    refetchInterval: 15000,
  })

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [railFilter, setRailFilter] = useState<RailFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('detected')

  const filtered = useMemo(() => {
    let result = incidents ?? []
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter)
    if (severityFilter !== 'all') result = result.filter(i => i.severity === severityFilter)
    if (railFilter !== 'all') result = result.filter(i => i.rail_name === railFilter)
    if (sortKey === 'severity') {
      result = [...result].sort((a, b) => {
        const sevDiff = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
        if (sevDiff !== 0) return sevDiff
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
      })
    } else {
      result = [...result].sort((a, b) =>
        new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
      )
    }
    return result
  }, [incidents, statusFilter, severityFilter, railFilter, sortKey])

  // Counts for the chip labels
  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { all: 0, active: 0, investigating: 0, resolved: 0 }
    const bySeverity: Record<string, number> = { all: 0, critical: 0, high: 0, medium: 0, low: 0 }
    for (const inc of incidents ?? []) {
      byStatus.all++; byStatus[inc.status] = (byStatus[inc.status] ?? 0) + 1
      bySeverity.all++; bySeverity[inc.severity] = (bySeverity[inc.severity] ?? 0) + 1
    }
    return { byStatus, bySeverity }
  }, [incidents])

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ ...S.label, marginBottom: 6 }}>NPCI · India Payment Rails · Last 7 days</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#E4EBF5', margin: 0 }}>Incident Queue</h1>
          <p style={{ fontSize: 12, color: '#7A8FA6', marginTop: 4 }}>
            {filtered.length} of {incidents?.length ?? 0} incidents · click any row to investigate
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#7A8FA6' }}>
          <span>Sort:</span>
          <button
            onClick={() => setSortKey('detected')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: sortKey === 'detected' ? '#38BDF8' : '#7A8FA6',
              fontFamily: 'IBM Plex Mono', fontSize: 11,
              borderBottom: sortKey === 'detected' ? '1px solid #38BDF8' : '1px solid transparent',
              padding: '2px 0',
            }}
          >Most recent</button>
          <button
            onClick={() => setSortKey('severity')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: sortKey === 'severity' ? '#38BDF8' : '#7A8FA6',
              fontFamily: 'IBM Plex Mono', fontSize: 11,
              borderBottom: sortKey === 'severity' ? '1px solid #38BDF8' : '1px solid transparent',
              padding: '2px 0',
            }}
          >Severity</button>
        </div>
      </div>

      {/* Filter rows */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ ...S.label, minWidth: 60 }}>Status</span>
          {(['all', 'active', 'investigating', 'resolved'] as StatusFilter[]).map(s => (
            <Chip key={s} label={s} count={counts.byStatus[s] ?? 0}
              active={statusFilter === s} onClick={() => setStatusFilter(s)}
              accent={s === 'all' ? undefined : statusColor(s)} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ ...S.label, minWidth: 60 }}>Severity</span>
          {(['all', 'critical', 'high', 'medium', 'low'] as SeverityFilter[]).map(s => (
            <Chip key={s} label={s} count={counts.bySeverity[s] ?? 0}
              active={severityFilter === s} onClick={() => setSeverityFilter(s)}
              accent={s === 'all' ? undefined : severityColor(s)} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...S.label, minWidth: 60 }}>Rail</span>
          {(['all', 'UPI', 'IMPS', 'RTGS', 'NEFT', 'NACH'] as RailFilter[]).map(r => (
            <Chip key={r} label={r} active={railFilter === r} onClick={() => setRailFilter(r)} />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#7A8FA6', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
            Loading incidents…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#7A8FA6', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
            No incidents match these filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={S.th}>Severity</th>
                <th style={S.th}>Incident</th>
                <th style={S.th}>Rail</th>
                <th style={S.th}>Classification</th>
                <th style={S.th}>Confidence</th>
                <th style={S.th}>Status</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Detected</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inc => (
                <IncidentRow key={inc.id} incident={inc} onClick={() => onSelectIncident(inc.id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Chip({ label, count, active, onClick, accent }: {
  label: string; count?: number; active: boolean; onClick: () => void; accent?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? '#38BDF8' : 'rgba(255,255,255,0.08)'}`,
        color: active ? '#38BDF8' : '#9CA3AF',
        padding: '4px 10px', borderRadius: 3, fontSize: 11,
        cursor: 'pointer', fontFamily: 'IBM Plex Mono',
        textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      {accent && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'inline-block' }} />
      )}
      {label}
      {count !== undefined && (
        <span style={{ color: active ? '#38BDF8' : '#3D5166', fontSize: 10 }}>({count})</span>
      )}
    </button>
  )
}

function IncidentRow({ incident, onClick }: { incident: Incident; onClick: () => void }) {
  const sev = severityColor(incident.severity)
  const stat = statusColor(incident.status)

  return (
    <tr
      onClick={onClick}
      style={{ cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={{ ...S.td, borderLeft: `3px solid ${sev}`, paddingLeft: 12 }}>
        <span style={{
          background: `${sev}20`, color: sev, padding: '2px 8px', borderRadius: 3,
          fontFamily: 'IBM Plex Mono', fontSize: 10, fontWeight: 500,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>{incident.severity}</span>
      </td>
      <td style={{ ...S.td, maxWidth: 480 }}>
        <div style={{ color: '#E4EBF5', marginBottom: 2 }}>{incident.title}</div>
        {incident.historical_match && (
          <div style={{ fontSize: 10, color: '#3D5166', fontFamily: 'IBM Plex Mono' }}>
            ↻ {incident.historical_match}
          </div>
        )}
      </td>
      <td style={S.td}>
        <span style={{
          background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 3,
          fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#E4EBF5',
        }}>{incident.rail_name}</span>
      </td>
      <td style={S.td}>
        <span style={{
          fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#7A8FA6',
        }}>
          {incident.classification === 'NPCI_SIDE' ? 'NPCI' :
           incident.classification === 'BANK_SIDE' ? 'BANK' :
           incident.classification === 'FALSE_POSITIVE' ? 'FALSE+' : 'UNKNOWN'}
        </span>
      </td>
      <td style={{ ...S.td, fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#7A8FA6' }}>
        {Math.round(Number(incident.confidence_score))}%
      </td>
      <td style={S.td}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontFamily: 'IBM Plex Mono', fontSize: 11, color: stat,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: stat, display: 'inline-block' }} />
          {incident.status}
        </span>
      </td>
      <td style={{ ...S.td, textAlign: 'right', fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#7A8FA6' }}>
        {timeAgo(incident.detected_at)}
      </td>
    </tr>
  )
}
