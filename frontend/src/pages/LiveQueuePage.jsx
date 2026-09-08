import { Ticket } from 'lucide-react'
import FarmerLayout from '../components/FarmerLayout'
import { LIVE_QUEUE_DATA } from '../data/farmer-data'

export default function LiveQueuePage() {
  return (
    <FarmerLayout activePath="/live-queue">
      <div className="live-queue-container">
        {/* Header with Live badge */}
        <div className="live-queue-header">
          <div>
            <h1 className="page-main-heading">Live Queue - {LIVE_QUEUE_DATA.center}</h1>
            <p className="page-sub-heading">Last updated: {LIVE_QUEUE_DATA.lastUpdated}</p>
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
            <div className="serving-token-display">{LIVE_QUEUE_DATA.nowServing}</div>
          </div>

          {/* Your Token Card */}
          <div className="queue-card your-token-card">
            <span className="queue-card-label">Your Token</span>
            <div className="your-token-row">
              <Ticket size={24} className="ticket-icon" />
              <span className="your-token-number">{LIVE_QUEUE_DATA.yourToken}</span>
            </div>
            <p className="queue-ahead-text">
              <span className="ahead-highlight">{LIVE_QUEUE_DATA.farmersAhead} farmers ahead</span>
            </p>
            <p className="estimated-wait-text">Estimated wait: {LIVE_QUEUE_DATA.estimatedWait}</p>
          </div>
        </div>

        {/* Upcoming Tokens List */}
        <div className="portal-card upcoming-tokens-card">
          <h2 className="card-section-title">Upcoming Tokens</h2>
          <div className="tokens-table-wrap">
            <table className="tokens-table">
              <tbody>
                {LIVE_QUEUE_DATA.queue.map((item) => (
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
    </FarmerLayout>
  )
}
