import { useEffect, useState } from 'react'
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
import AdminReportsPage from './pages/AdminReportsPage'
import AdminAddCenterPage from './pages/AdminAddCenterPage'
import AdminCenterDetailsPage from './pages/AdminCenterDetailsPage'
import './App.css'

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
  '/admin/dashboard': AdminDashboardPage,
  '/admin/centers': AdminCentersPage,
  '/admin/users': AdminUsersPage,
  '/admin/slots': AdminSlotsPage,
  '/admin/procurements': AdminProcurementsPage,
  '/admin/payments': AdminPaymentsPage,
  '/admin/reports': AdminReportsPage,
  '/admin/centers/new': AdminAddCenterPage,
  '/admin/centers/details': AdminCenterDetailsPage,
}

function useCurrentPath() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname)
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  return path
}

export default function App() {
  const path = useCurrentPath()
  
  // Basic query param stripping for routing
  const cleanPath = path.split('?')[0]
  
  const Page = PAGE_BY_PATH[cleanPath] ?? HomePage
  return <Page />
}
