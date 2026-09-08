import { useEffect, useState } from 'react'
import CreateAccountPage from './pages/CreateAccountPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import './App.css'

const PAGE_BY_PATH = {
  '/': HomePage,
  '/create-account': CreateAccountPage,
  '/login': LoginPage,
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
