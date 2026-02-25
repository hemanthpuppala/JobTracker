import { useEffect, useRef, useState } from 'react'
import { useJobsStore } from './useJobs'

export function useWebSocket() {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const addJob = useJobsStore(s => s.addJob)
  const loadStats = useJobsStore(s => s.loadStats)

  useEffect(() => {
    let mounted = true

    function connect() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${location.host}/ws`)
      wsRef.current = ws

      ws.onopen = () => { if (mounted) setConnected(true) }
      ws.onclose = () => {
        if (mounted) {
          setConnected(false)
          setTimeout(connect, 2000)
        }
      }
      ws.onerror = () => ws.close()
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'new_job') {
          addJob(msg.job)
          loadStats()
        }
      }
    }

    connect()
    return () => {
      mounted = false
      wsRef.current?.close()
    }
  }, [addJob, loadStats])

  return connected
}
