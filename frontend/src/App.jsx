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
import './App.css'

const PAGE_BY_PATH = {
  '/': HomePage,
  '/create-account': CreateAccountPage,
  '/login': LoginPage,
  '/dashboard': FarmerDashboard,
  '/book-slot': BookSlotPage,
  '/live-queue': LiveQueuePage,
  '/procurement-history': ProcurementHistoryPage,
  '/payments': PaymentStatusPage,
  '/profile': ProfilePage,
  '/my-bookings': MyBookingsPage,
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
  const Page = PAGE_BY_PATH[path] ?? HomePage
  return <Page />
}
