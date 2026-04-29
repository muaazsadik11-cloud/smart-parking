import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LayoutDashboard, Upload, Images, Activity, Car, Wifi, WifiOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import DatasetPage from './pages/DatasetPage'
import RecordsPage from './pages/RecordsPage'
import { healthCheck } from './utils/api'

const NAV_ITEMS = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload',  icon: Upload,          label: 'Scan Plate' },
  { to: '/records', icon: Activity,        label: 'Records'   },
  { to: '/dataset', icon: Images,          label: 'Dataset'   },
]

function Sidebar({ online }) {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-carbon-900/90 backdrop-blur-md border-r border-white/5 flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-7 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center relative overflow-hidden">
            <Car className="w-5 h-5 text-neon-green" />
            <div className="scan-line" />
          </div>
          <div>
            <h1 className="font-display font-bold text-sm text-white tracking-wider uppercase">ANPR</h1>
            <p className="text-[10px] text-white/30 font-mono tracking-widest">SMART PARKING</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to
          return (
            <NavLink key={to} to={to}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${active
                  ? 'bg-neon-green/10 border border-neon-green/20 text-neon-green'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
                <Icon className={`w-4 h-4 ${active ? 'text-neon-green' : 'group-hover:text-white/70'}`} />
                <span className="text-sm font-medium">{label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />}
              </div>
            </NavLink>
          )
        })}
      </nav>

      {/* System Status */}
      <div className="px-6 py-5 border-t border-white/5">
        <div className="flex items-center gap-2.5">
          {online
            ? <Wifi className="w-3.5 h-3.5 text-neon-green" />
            : <WifiOff className="w-3.5 h-3.5 text-neon-red" />
          }
          <span className={`text-xs font-mono ${online ? 'text-neon-green' : 'text-red-400'}`}>
            {online ? 'SYSTEM ONLINE' : 'OFFLINE'}
          </span>
          {online && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />}
        </div>
        <p className="text-[10px] text-white/20 font-mono mt-1.5">
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </aside>
  )
}

export default function App() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const check = async () => {
      try { await healthCheck(); setOnline(true) }
      catch { setOnline(false) }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-carbon-950 bg-grid-pattern bg-grid">
        <Sidebar online={online} />
        <main className="ml-64 min-h-screen">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <Routes>
              <Route path="/"        element={<Dashboard />} />
              <Route path="/upload"  element={<UploadPage />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/dataset" element={<DatasetPage />} />
            </Routes>
          </div>
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#131318',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: 'Syne, sans-serif',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#00ff88', secondary: '#070709' } },
          error:   { iconTheme: { primary: '#ff4757', secondary: '#070709' } },
        }}
      />
    </Router>
  )
}
