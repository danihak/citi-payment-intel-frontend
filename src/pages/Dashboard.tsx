import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Zap, AlertTriangle, Activity } from 'lucide-react'
import { fetchRailStatus, fetchIncidents, simulateIncident } from '../api'
import { RailCard } from '../components/RailCard'
import { IncidentRow } from '../components/IncidentRow'

interface DashboardProps {
  onSelectIncident: (id: string) => void
}

export function Dashboard({ onSelectIncident }: DashboardProps) {
  const qc = useQueryClient()

  const { data: rails, isLoading: railsLoading, dataUpdatedAt } = useQuery({
    queryKey: ['rails'],
    queryFn: fetchRailStatus,
    refetchInterval: 30000,
    staleTime: 20000,
  })

  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => fetchIncidents(),
    refetchInterval: 15000,
  })

  const simulateMutation = useMutation({
    mutationFn: () => simulateIncident('UPI', 71.3),
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['incidents'] }), 3000)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['rails'] }), 1000)
    },
  })

  const activeIncidents = incidents?.filter(i => i.status === 'active' || i.status === 'investigating') || []

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payment Rail Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            India payments infrastructure · Real-time monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            Updated {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}
          </span>
          <button
            onClick={() => simulateMutation.mutate()}
            disabled={simulateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200 transition-colors border border-orange-200"
          >
            <Zap size={12} />
            {simulateMutation.isPending ? 'Triggering…' : 'Simulate incident'}
          </button>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['rails'] })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors border border-gray-200"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* System status banner */}
      {activeIncidents.length > 0 ? (
        <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <div>
            <span className="font-semibold text-red-800 text-sm">
              {activeIncidents.length} active incident{activeIncidents.length > 1 ? 's' : ''}
            </span>
            <span className="text-red-600 text-sm"> — payment rail degradation in progress</span>
          </div>
        </div>
      ) : (
        <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Activity size={18} className="text-emerald-500 flex-shrink-0" />
          <span className="text-emerald-800 text-sm font-medium">All payment rails operating normally</span>
        </div>
      )}

      {/* Rail health cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {railsLoading
          ? Array(5).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-44 animate-pulse" />
            ))
          : rails?.map(rail => <RailCard key={rail.rail_name} rail={rail} />)
        }
      </div>

      {/* Hero metric strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {activeIncidents.length > 0 ? '<2 min' : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Root cause time target</div>
          <div className="text-xs text-emerald-600 font-medium mt-0.5">↓ from 18–25 min</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {incidents?.filter(i => i.status === 'resolved').length ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Resolved today</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {rails?.filter(r => r.status === 'healthy').length ?? 0}/{rails?.length ?? 5}
          </div>
          <div className="text-xs text-gray-500 mt-1">Rails healthy</div>
        </div>
      </div>

      {/* Incident feed */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Incident Feed</h2>
          {activeIncidents.length > 0 && (
            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {activeIncidents.length} active
            </span>
          )}
        </div>
        {incidentsLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading incidents…</div>
        ) : incidents?.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No incidents recorded yet</div>
        ) : (
          <div>
            {incidents?.slice(0, 10).map(incident => (
              <IncidentRow
                key={incident.id}
                incident={incident}
                onClick={() => onSelectIncident(incident.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
