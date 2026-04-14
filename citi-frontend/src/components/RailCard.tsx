import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { fetchRailHistory } from '../api'
import type { RailStatus } from '../types'

interface RailCardProps {
  rail: RailStatus
}

function statusColor(status: string) {
  if (status === 'healthy') return 'border-l-emerald-500'
  if (status === 'degraded') return 'border-l-amber-500'
  return 'border-l-red-500'
}

function statusDot(status: string) {
  if (status === 'healthy') return 'bg-emerald-500'
  if (status === 'degraded') return 'bg-amber-500'
  return 'bg-red-500'
}

function chartColor(status: string) {
  if (status === 'healthy') return '#10B981'
  if (status === 'degraded') return '#F59E0B'
  return '#EF4444'
}

export function RailCard({ rail }: RailCardProps) {
  const { data: history } = useQuery({
    queryKey: ['rail-history', rail.rail_name],
    queryFn: () => fetchRailHistory(rail.rail_name),
    refetchInterval: 30000,
    staleTime: 20000,
  })

  const chartData = (history || [])
    .slice(0, 40)
    .reverse()
    .map(s => ({ rate: parseFloat(String(s.success_rate)) }))

  const isDown = rail.status === 'down'
  const isDegraded = rail.status === 'degraded'

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${statusColor(rail.status)} p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusDot(rail.status)} ${rail.status !== 'healthy' ? 'live-dot' : ''}`} />
          <span className="font-semibold text-sm text-gray-900">{rail.rail_name}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium badge-${rail.status}`}>
          {rail.status}
        </span>
      </div>

      {/* Big metric */}
      <div className={`text-3xl font-bold mb-1 ${isDown ? 'text-red-600' : isDegraded ? 'text-amber-600' : 'text-gray-900'}`}>
        {typeof rail.success_rate === 'number' ? rail.success_rate.toFixed(1) : parseFloat(String(rail.success_rate)).toFixed(1)}%
      </div>
      <div className="text-xs text-gray-500 mb-3">success rate</div>

      {/* Sparkline */}
      <div className="h-14 mb-3">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${rail.rail_name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor(rail.status)} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColor(rail.status)} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{ fontSize: '11px', padding: '4px 8px', border: 'none', background: '#1F2937', color: '#fff', borderRadius: '4px' }}
                formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'Success']}
                labelFormatter={() => ''}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke={chartColor(rail.status)}
                strokeWidth={1.5}
                fill={`url(#grad-${rail.rail_name})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full bg-gray-50 rounded animate-pulse" />
        )}
      </div>

      {/* Sub metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div>
          <span className="block font-medium text-gray-700">{rail.latency_ms}ms</span>
          <span>latency</span>
        </div>
        <div>
          <span className="block font-medium text-gray-700">{(rail.transactions_per_min / 1000).toFixed(1)}k</span>
          <span>txn/min</span>
        </div>
      </div>
    </div>
  )
}
