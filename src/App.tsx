import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from './components/Navbar'
import { Dashboard } from './pages/Dashboard'
import { IncidentDetail } from './pages/IncidentDetail'
import { Compliance } from './pages/Compliance'
import { useRailWebSocket } from './hooks/useWebSocket'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 10000, refetchOnWindowFocus: true } },
})

type Page = 'dashboard' | 'incidents' | 'compliance'

function AppInner() {
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)
  const { connected } = useRailWebSocket()

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id)
    setPage('incidents')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628' }}>
      <Navbar
        currentPage={page}
        onNavigate={(p) => { setPage(p); setSelectedIncidentId(null) }}
        connected={connected}
      />
      <main>
        {page === 'dashboard' && <Dashboard onSelectIncident={handleSelectIncident} />}
        {page === 'incidents' && selectedIncidentId && (
          <IncidentDetail incidentId={selectedIncidentId} onBack={() => { setSelectedIncidentId(null); setPage('dashboard') }} />
        )}
        {page === 'incidents' && !selectedIncidentId && <Dashboard onSelectIncident={handleSelectIncident} />}
        {page === 'compliance' && <Compliance />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  )
}
