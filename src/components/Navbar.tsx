import { useQuery } from '@tanstack/react-query'
import { fetchRailStatus, fetchIncidents, fetchComplianceDashboard } from '../api'

interface NavbarProps {
  currentPage: 'dashboard' | 'incidents' | 'compliance'
  onNavigate: (page: 'dashboard' | 'incidents' | 'compliance') => void
  connected: boolean
}

export function Navbar({ currentPage, onNavigate, connected }: NavbarProps) {
  const { data: rails } = useQuery({ queryKey: ['rails'], queryFn: fetchRailStatus, refetchInterval: 30000 })
  const { data: incidents } = useQuery({ queryKey: ['incidents'], queryFn: fetchIncidents, refetchInterval: 15000 })
  const { data: compliance } = useQuery({ queryKey: ['compliance'], queryFn: fetchComplianceDashboard, refetchInterval: 30000 })

  const healthyRails = rails?.filter(r => r.status === 'healthy').length ?? 0
  const totalRails = rails?.length ?? 5
  const healthScore = Math.round((healthyRails / totalRails) * 100)
  const activeIncidents = incidents?.filter(i => i.status === 'active' || i.status === 'investigating').length ?? 0
  const allCompliant = compliance?.every(m => m.is_compliant) ?? true
  const scoreColor = healthScore === 100 ? '#12B76A' : healthScore >= 80 ? '#F79009' : '#F04438'

  return (
    <nav style={{ background: '#060E1C', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1" fill="#00A3E0" opacity="0.9"/>
              <rect x="11" y="1" width="6" height="6" rx="1" fill="#00A3E0" opacity="0.5"/>
              <rect x="1" y="11" width="6" height="6" rx="1" fill="#00A3E0" opacity="0.5"/>
              <rect x="11" y="11" width="6" height="6" rx="1" fill="#00A3E0" opacity="0.9"/>
            </svg>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#E4EBF5' }}>India Payment Intelligence Hub</span>
            <span style={{ color: '#3D5166', fontSize: 11 }}>| CITI TTS</span>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {(['dashboard', 'incidents', 'compliance'] as const).map(page => (
              <button key={page} onClick={() => onNavigate(page)} style={{
                padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: 'none', textTransform: 'capitalize', transition: 'all 0.15s',
                background: currentPage === page ? 'rgba(0,163,224,0.15)' : 'transparent',
                color: currentPage === page ? '#00A3E0' : '#7A8FA6',
                borderBottom: currentPage === page ? '2px solid #00A3E0' : '2px solid transparent',
              }}>
                {page}
                {page === 'incidents' && activeIncidents > 0 && (
                  <span style={{ marginLeft: 6, background: '#F04438', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 9, fontFamily: 'IBM Plex Mono' }}>{activeIncidents}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#3D5166', fontSize: 10, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Health</span>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, fontWeight: 500, color: scoreColor }}>{healthScore}%</span>
            <div style={{ width: 48, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
              <div style={{ width: `${healthScore}%`, height: '100%', background: scoreColor, borderRadius: 2, transition: 'width 0.5s' }} />
            </div>
          </div>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: allCompliant ? '#12B76A' : '#F04438', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#7A8FA6', fontFamily: 'IBM Plex Mono' }}>OC-215</span>
          </div>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#12B76A' : '#7A8FA6', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#7A8FA6', fontFamily: 'IBM Plex Mono' }}>{connected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
