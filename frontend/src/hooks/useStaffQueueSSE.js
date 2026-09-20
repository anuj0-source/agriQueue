import { useState, useEffect, useRef } from 'react'
import { API_BASE_URL } from '../api'

/**
 * useStaffQueueSSE — subscribes to the SSE queue stream for the staff's center.
 * Returns { queueData, connected, error }
 */
export function useStaffQueueSSE() {
  const [queueData, setQueueData] = useState(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const esRef = useRef(null)
  const retryRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    function connect() {
      if (esRef.current) {
        esRef.current.close()
      }

      const url = `${API_BASE_URL}/staff/queue/stream`
      const es = new EventSource(url, { withCredentials: true })
      esRef.current = es

      es.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        setError(null)
        if (retryRef.current) {
          clearTimeout(retryRef.current)
          retryRef.current = null
        }
      }

      es.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const data = JSON.parse(event.data)
          if (!data.error) {
            setQueueData(data)
            setError(null)
          }
        } catch {
          // Ignore malformed messages
        }
      }

      es.onerror = () => {
        if (!mountedRef.current) return
        setConnected(false)
        es.close()
        // Reconnect after 8 seconds
        retryRef.current = setTimeout(() => {
          if (mountedRef.current) connect()
        }, 8000)
      }
    }

    connect()

    return () => {
      if (esRef.current) esRef.current.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [])

  return { queueData, connected, error }
}
