import { useQuery } from '@tanstack/react-query'
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { fetchComplianceDashboard, fetchComplianceViolations } from '../api'
import { RadialBarChart, RadialBar, ResponsiveContainer, Cell } from 'recharts'
import type { ComplianceMetric } from '../types'

function GaugeCard({ metric }: { metric: ComplianceMetric }) {
  const pct = parseFloat(String(metric.utilisation_pct)) || 0
  const isViolation = !metric.is_compliant
  const isWarning = pct >= 85 && metric.is_compliant

  const color = isViolation ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981'
  const bgColor = isViolation ? 'border-red-200 bg-red-50/30' : isWarning ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white'

  const apiLabel: Record<string, string> = {
    check_transaction_status: 'Check Txn Status',
    initiate_payment: 'Initiate Payment',
    balance_enquiry: 'Balance Enquiry',
    validate_vpa: 'Validate VPA',
  }

  return (
    <div className={`border rounded-xl p-4 ${bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-800">
          {apiLabel[metric.api_name] || metric.api_name}
        </span>
        {isViolation ? (
          <AlertTriangle size={14} className="text-red-500" />
        ) : isWarning ? (
          <AlertTriangle size={14} className="text-amber-500" />
        ) : (
          <CheckCircle size={14} className="text-emerald-500" />
        )}
      </div>

      {/* Gauge */}
      <div className="h-28 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="90%"
            startAngle={180} endAngle={0} data={[{ value: Math.min(pct, 100) }]}>
            <RadialBar background={{ fill: '#F3F4F6' }} dataKey="value" cornerRadius={4}>
              <Cell fill={color} />
            </RadialBar>
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className="text-xl font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
          <span className="text-xs text-gray-400">utilised</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
        <div>
          <span className="block font-semibold text-gray-800">
            {parseFloat(String(metric.tps_current)).toFixed(2)}
          </span>
          <span>current TPS</span>
        </div>
        <div>
          <span className="block font-semibold text-gray-800">
            {parseFloat(String(metric.tps_limit)).toFixed(1)}
          </span>
          <span>OC-215 limit</span>
        </div>
        <div>
          <span className="block font-semibold text-gray-800">{metric.calls_last_minute}</span>
          <span>calls/min</span>
        </div>
        <div>
          <span className="block font-semibold text-gray-800">{metric.calls_last_hour.toLocaleString()}</span>
          <span>calls/hr</span>
        </div>
      </div>
    </div>
  )
}

export function Compliance() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['compliance'],
    queryFn: fetchComplianceDashboard,
    refetchInterval: 30000,
  })

  const { data: violations } = useQuery({
    queryKey: ['violations'],
    queryFn: fetchComplianceViolations,
    refetchInterval: 30000,
  })

  const allCompliant = metrics?.every(m => m.is_compliant) ?? true

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">OC-215 Compliance Monitor</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Citi's outgoing API call rates to NPCI · Post April 12 circular
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
          allCompliant ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {allCompliant ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {allCompliant ? 'All APIs compliant' : 'Violation detected'}
        </div>
      </div>

      {/* Context banner */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <span className="font-semibold">OC-215 background: </span>
          The April 12 2025 UPI outage was caused by banks flooding NPCI's Check Transaction Status API.
          NPCI issued OC-215 mandating all PSP banks limit this API to max 3 TPS with a 90-second minimum gap per transaction.
          Annual CERT-In audits from 2026. This dashboard is Citi's audit trail.
        </div>
      </div>

      {/* Gauge grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-60 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metrics?.map(m => <GaugeCard key={m.id} metric={m} />)}
        </div>
      )}

      {/* Violation audit log */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-gray-500" />
            <h2 className="font-semibold text-sm text-gray-800">Violation Audit Log</h2>
          </div>
          <span className="text-xs text-gray-400">Available for CERT-In audit</span>
        </div>

        {!violations || violations.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No OC-215 violations recorded</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {violations.map(v => (
              <div key={v.id} className="px-4 py-3 flex items-center gap-4">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  v.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  v.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {v.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800">{v.description}</div>
                </div>
                <div className="text-xs text-gray-400 text-right flex-shrink-0">
                  <div className="font-medium text-gray-600">
                    {parseFloat(String(v.tps_observed)).toFixed(2)} / {parseFloat(String(v.tps_limit)).toFixed(1)} TPS
                  </div>
                  <div>{new Date(v.occurred_at).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
