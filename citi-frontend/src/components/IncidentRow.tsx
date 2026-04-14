import { AlertTriangle, CheckCircle, HelpCircle, Clock } from 'lucide-react'
import type { Incident } from '../types'

interface IncidentRowProps {
  incident: Incident
  onClick: () => void
}

function classificationLabel(c: string) {
  if (c === 'NPCI_SIDE') return 'NPCI infrastructure'
  if (c === 'BANK_SIDE') return 'Bank-side failure'
  if (c === 'FALSE_POSITIVE') return 'False positive'
  return 'Under investigation'
}

function ClassificationIcon({ c }: { c: string }) {
  if (c === 'NPCI_SIDE') return <AlertTriangle size={14} className="text-red-500" />
  if (c === 'BANK_SIDE') return <AlertTriangle size={14} className="text-orange-500" />
  if (c === 'FALSE_POSITIVE') return <CheckCircle size={14} className="text-green-500" />
  return <HelpCircle size={14} className="text-gray-400" />
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  return `${Math.round(diff / 3600)}h ago`
}

export function IncidentRow({ incident, onClick }: IncidentRowProps) {
  const isActive = incident.status === 'active' || incident.status === 'investigating'

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
        isActive ? 'bg-red-50/30' : ''
      }`}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0">
        <span className={`w-2 h-2 rounded-full inline-block ${
          isActive ? 'bg-red-500 live-dot' : 'bg-gray-300'
        }`} />
      </div>

      {/* Rail + severity */}
      <div className="flex-shrink-0 w-28">
        <div className="font-semibold text-sm text-gray-900">{incident.rail_name}</div>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium badge-${incident.severity}`}>
          {incident.severity}
        </span>
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-800 truncate">{incident.title}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <ClassificationIcon c={incident.classification} />
          <span className="text-xs text-gray-500">{classificationLabel(incident.classification)}</span>
          {incident.confidence_score > 0 && (
            <span className="text-xs text-gray-400">· {parseFloat(String(incident.confidence_score)).toFixed(0)}% confidence</span>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={11} />
          {timeAgo(incident.detected_at)}
        </div>
        <div className={`text-xs mt-0.5 font-medium ${isActive ? 'text-red-600' : 'text-emerald-600'}`}>
          {isActive ? incident.status : 'resolved'}
        </div>
      </div>
    </div>
  )
}
