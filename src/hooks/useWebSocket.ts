import { useEffect, useRef, useCallback, useState } from 'react'
import type { WSMessage } from '../types'
import { useQueryClient } from '@tanstack/react-query'

const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/ws/rail-updates/'

export function useRailWebSocket() {
  const ws = useRef<WebSocket | null>(null)
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    try {
      ws.current = new WebSocket(WS_URL)

      ws.current.onopen = () => {
        setConnected(true)
        clearTimeout(reconnectTimer.current)
      }

      ws.current.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data)
          setLastMessage(msg)

          switch (msg.type) {
            case 'rail.update':
              // Invalidate rail status query so dashboard auto-refreshes
              queryClient.invalidateQueries({ queryKey: ['rails'] })
              break
            case 'incident.new':
              // Invalidate incidents list
              queryClient.invalidateQueries({ queryKey: ['incidents'] })
              break
            case 'compliance.update':
              queryClient.invalidateQueries({ queryKey: ['compliance'] })
              break
            case 'comms.ready':
              queryClient.invalidateQueries({ queryKey: ['communications'] })
              queryClient.invalidateQueries({ queryKey: ['incidents'] })
              break
          }
        } catch { /* ignore parse errors */ }
      }

      ws.current.onclose = () => {
        setConnected(false)
        // Auto-reconnect after 3s
        reconnectTimer.current = setTimeout(() => connect(), 3000)
      }

      ws.current.onerror = () => {
        ws.current?.close()
      }
    } catch {
      reconnectTimer.current = setTimeout(() => connect(), 3000)
    }
  }, [queryClient])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  const ping = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'ping' }))
    }
  }, [])

  return { connected, lastMessage, ping }
}
