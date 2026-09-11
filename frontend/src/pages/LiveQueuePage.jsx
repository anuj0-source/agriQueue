import { useState, useEffect } from 'react'
import { Ticket } from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import { LiveQueueSkeleton } from '../components/Skeletons'
import { LIVE_QUEUE_DATA } from '../data/farmer-data'
import { getLiveQueue } from '../api'

export default function LiveQueuePage() {
  const [queueData, setQueueData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function fetchQueue() {
      try {
        const data = await getLiveQueue(1001)
        if (isMounted && data) {
          setQueueData(data)
        }
      } catch (err) {
        if (isMounted && !queueData) {
          setQueueData(LIVE_QUEUE_DATA)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchQueue()
    const timer = setInterval(fetchQueue, 15000)

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  return (
    <FarmerLayout activePath="/live-queue">
      {loading && !queueData ? (
        <LiveQueueSkeleton />
      ) : (
        <div className="live-queue-container">
          {/* Header with Live badge */}
          <div className="live-queue-header">
          <div>
            <h1 className="page-main-heading">Live Queue - {queueData.center}</h1>
            <p className="page-sub-heading">Last updated: {queueData.lastUpdated}</p>
          </div>
          <div className="live-pulse-badge">
            <span className="pulse-dot" />
            <span>Live</span>
          </div>
        </div>

        {/* Dual Cards: Now Serving & Your Token */}
        <div className="queue-status-grid">
          {/* Now Serving Card */}
          <div className="queue-card now-serving-card">
            <span className="queue-card-label">Now Serving</span>
            <div className="serving-token-display">{queueData.nowServing}</div>
          </div>

          {/* Your Token Card */}
          <div className="queue-card your-token-card">
            <span className="queue-card-label">Your Token</span>
            <div className="your-token-row">
              <Ticket size={24} className="ticket-icon" />
              <span className="your-token-number">{queueData.yourToken}</span>
            </div>
            <p className="queue-ahead-text">
              <span className="ahead-highlight">{queueData.farmersAhead} farmers ahead</span>
            </p>
            <p className="estimated-wait-text">Estimated wait: {queueData.estimatedWait}</p>
          </div>
        </div>

        {/* Upcoming Tokens List */}
        <div className="portal-card upcoming-tokens-card">
          <h2 className="card-section-title">Queue Status</h2>
          <div className="tokens-table-wrap">
            <table className="tokens-table">
              <tbody>
                {queueData.queue.map((item) => (
                  <tr
                    key={item.token}
                    className={`token-row ${item.isCurrent ? 'current-user-row' : ''}`}
                  >
                    <td className="token-code-cell">{item.token}</td>
                    <td className="token-status-cell">
                      <span
                        className={`status-pill ${
                          item.status === 'Completed'
                            ? 'completed'
                            : item.status === 'Waiting'
                            ? 'waiting'
                            : 'you'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
    </FarmerLayout>
  )
}
