import { useEffect, useState, Component } from 'react'
import CreateAccountPage from './pages/CreateAccountPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import FarmerDashboard from './pages/FarmerDashboard'
import BookSlotPage from './pages/BookSlotPage'
import LiveQueuePage from './pages/LiveQueuePage'
import ProcurementHistoryPage from './pages/ProcurementHistoryPage'
import PaymentStatusPage from './pages/PaymentStatusPage'
import ProfilePage from './pages/ProfilePage'
import MyBookingsPage from './pages/MyBookingsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminCentersPage from './pages/AdminCentersPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminSlotsPage from './pages/AdminSlotsPage'
import AdminProcurementsPage from './pages/AdminProcurementsPage'
import AdminPaymentsPage from './pages/AdminPaymentsPage'
import AdminAddCenterPage from './pages/AdminAddCenterPage'
import AdminCenterDetailsPage from './pages/AdminCenterDetailsPage'
import StaffDashboardPage from './pages/StaffDashboardPage'
import StaffQueuePage from './pages/StaffQueuePage'
import StaffProcurementPage from './pages/StaffProcurementPage'
import StaffPaymentsPage from './pages/StaffPaymentsPage'
import StaffProfilePage from './pages/StaffProfilePage'
import { NotificationProvider } from './context/NotificationContext'
import CommandAgent from './components/CommandAgent'
import { registerPushNotifications } from './api'
import './App.css'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('=== APP CRASH ===', error, info.componentStack)
    this.setState({ info })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px', background: '#fff1f2', color: '#9f1239',
          fontFamily: 'monospace', minHeight: '100vh'
        }}>
          <h2 style={{ marginBottom: '16px' }}>⚠️ Something crashed</h2>
          <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>{this.state.error?.toString()}</p>
          <pre style={{
            background: '#fff', padding: '16px', borderRadius: '8px',
            overflow: 'auto', fontSize: '12px', border: '1px solid #fecdd3'
          }}>
            {this.state.info?.componentStack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null, info: null })}
            style={{
              marginTop: '16px', padding: '10px 20px', background: '#be123c',
              color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const PAGE_BY_PATH = {
  '/': HomePage,
  '/login': LoginPage,
  '/create-account': CreateAccountPage,
  '/dashboard': FarmerDashboard,
  '/book-slot': BookSlotPage,
  '/live-queue': LiveQueuePage,
  '/procurement-history': ProcurementHistoryPage,
  '/payments': PaymentStatusPage,
  '/profile': ProfilePage,
  '/my-bookings': MyBookingsPage,
  '/admin': AdminDashboardPage,
  '/admin/dashboard': AdminDashboardPage,
  '/admin/centers': AdminCentersPage,
  '/admin/users': AdminUsersPage,
  '/admin/slots': AdminSlotsPage,
  '/admin/procurements': AdminProcurementsPage,
  '/admin/payments': AdminPaymentsPage,
  '/admin/centers/new': AdminAddCenterPage,
  '/admin/centers/details': AdminCenterDetailsPage,
  '/staff': StaffDashboardPage,
  '/staff/dashboard': StaffDashboardPage,
  '/staff/queue': StaffQueuePage,
  '/staff/procurement': StaffProcurementPage,
  '/staff/payments': StaffPaymentsPage,
  '/staff/profile': StaffProfilePage,
}


function useCurrentPath() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname)
    window.addEventListener('popstate', syncPath)

    // Intercept internal link clicks for seamless SPA navigation
    const handleLinkClick = (e) => {
      const anchor = e.target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !anchor.hasAttribute('download') &&
        anchor.target !== '_blank' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey &&
        e.button === 0
      ) {
        e.preventDefault()
        if (window.location.pathname !== href) {
          window.history.pushState(null, '', href)
          setPath(window.location.pathname)
          window.scrollTo(0, 0)
        }
      }
    }

    document.addEventListener('click', handleLinkClick)

    return () => {
      window.removeEventListener('popstate', syncPath)
      document.removeEventListener('click', handleLinkClick)
    }
  }, [])

  return path
}

export default function App() {
  const path = useCurrentPath()
  
  useEffect(() => {
    // Silent re-sync on route changes: refreshes an existing subscription with
    // the backend. Interactive prompting is handled in FarmerDashboard after login.
    try {
      const stored = localStorage.getItem('currentUser')
      if (stored) {
        const u = JSON.parse(stored)
        if (!u.role || u.role === 'farmer') {
          registerPushNotifications(false) // non-interactive — won't prompt
        }
      }
    } catch {}
  }, [path])


  // Basic query param stripping and trailing slash normalization for routing
  const rawPath = path.split('?')[0]
  const cleanPath = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath
  
  const Page = PAGE_BY_PATH[cleanPath] ?? HomePage
  return (
    <AppErrorBoundary>
      <NotificationProvider>
        <Page />
        <CommandAgent />
      </NotificationProvider>
    </AppErrorBoundary>
  )
}
