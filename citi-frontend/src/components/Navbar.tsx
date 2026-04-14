import { Activity } from 'lucide-react'

interface NavbarProps {
  currentPage: 'dashboard' | 'incidents' | 'compliance'
  onNavigate: (page: 'dashboard' | 'incidents' | 'compliance') => void
  connected: boolean
}

export function Navbar({ currentPage, onNavigate, connected }: NavbarProps) {
  return (
    <nav className="bg-[#003B7E] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-red-400" />
            <span className="font-semibold text-sm tracking-wide">
              India Payment Intelligence Hub
            </span>
          </div>
          <span className="text-blue-300 text-xs">| Citi TTS</span>
        </div>

        <div className="flex items-center gap-1">
          {(['dashboard', 'incidents', 'compliance'] as const).map(page => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors capitalize ${
                currentPage === page
                  ? 'bg-white text-[#003B7E]'
                  : 'text-blue-200 hover:text-white hover:bg-blue-700'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 live-dot' : 'bg-gray-400'}`} />
          <span className="text-blue-200">{connected ? 'Live' : 'Connecting…'}</span>
        </div>
      </div>
    </nav>
  )
}
