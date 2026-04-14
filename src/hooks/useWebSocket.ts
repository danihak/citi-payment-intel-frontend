import { useEffect, useRef, useCallback, useState } from 'react'
import type { WSMessage } from '../types'
import { useQueryClient } from '@tanstack/react-query'
import { WS_URL } from '../api'

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
              queryClient.invalidateQueries({ queryKey: ['rails'] })
              break
            case 'incident.new':
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
        } catch { /* ignore */ }
      }
      ws.current.onclose = () => {
        setConnected(false)
        reconnectTimer.current = setTimeout(() => connect(), 5000)
      }
      ws.current.onerror = () => { ws.current?.close() }
    } catch {
      reconnectTimer.current = setTimeout(() => connect(), 5000)
    }
  }, [queryClient])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  return { connected, lastMessage }
}
