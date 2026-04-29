import { useState, useEffect } from 'react'
import { Car, Users, Clock, TrendingUp, Activity, ArrowUpRight, RefreshCw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getStats, getRecords } from '../utils/api'
import { format, parseISO } from 'date-fns'

// ─────────────────────────────────────────────
// KPI CARD COMPONENT
// ─────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color = 'neon-green', trend }) {
  const colorMap = {
    'neon-green':  { text: 'text-neon-green',  bg: 'bg-neon-green/10',  border: 'border-neon-green/20'  },
    'neon-blue':   { text: 'text-neon-blue',   bg: 'bg-neon-blue/10',   border: 'border-neon-blue/20'   },
    'neon-amber':  { text: 'text-neon-amber',  bg: 'bg-neon-amber/10',  border: 'border-neon-amber/20'  },
    'neon-purple': { text: 'text-neon-purple', bg: 'bg-neon-purple/10', border: 'border-neon-purple/20' },
  }
  const c = colorMap[color] || colorMap['neon-green']

  return (
    <div className="glass-card p-6 hover:border-white/10 transition-all duration-300 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        {trend !== undefined && (
          <span className="flex items-center gap-1 text-xs text-neon-green font-mono">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <div className={`kpi-value ${c.text} mb-1`}>{value ?? '—'}</div>
      <p className="text-white/50 text-sm font-medium">{label}</p>
      {sub && <p className="text-white/25 text-xs mt-1 font-mono">{sub}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────
// LIVE RECORD ROW
// ─────────────────────────────────────────────
function RecordRow({ rec, index }) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/2 transition-colors group"
        style={{ animationDelay: `${index * 30}ms` }}>
      <td className="py-3.5 px-4">
        <span className="font-mono text-sm text-neon-green tracking-widest">{rec.plate_number}</span>
      </td>
      <td className="py-3.5 px-4 text-white/50 text-sm font-mono">
        {rec.entry_time ? format(parseISO(rec.entry_time), 'dd MMM HH:mm') : '—'}
      </td>
      <td className="py-3.5 px-4 text-white/50 text-sm font-mono">
        {rec.exit_time  ? format(parseISO(rec.exit_time),  'dd MMM HH:mm') : '—'}
      </td>
      <td className="py-3.5 px-4 text-white/70 text-sm font-mono">
        {rec.duration_str || '—'}
      </td>
      <td className="py-3.5 px-4">
        <span className={rec.status === 'active' ? 'status-active' : 'status-completed'}>
          {rec.status === 'active' ? '● ACTIVE' : '✓ DONE'}
        </span>
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────
// CUSTOM CHART TOOLTIP
// ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-4 py-3 text-xs">
      <p className="text-white/40 mb-1 font-mono">{label}</p>
      <p className="text-neon-green font-bold">{payload[0].value} vehicles</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────
export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState([])

  const load = async () => {
    try {
      const [s, r] = await Promise.all([getStats(), getRecords(200)])
      setStats(s.data)
      setRecords(r.data.records.slice(0, 8))

      // Build hourly chart data from records
      const hourly = {}
      r.data.records.forEach(rec => {
        if (!rec.entry_time) return
        const h = format(parseISO(rec.entry_time), 'HH:00')
        hourly[h] = (hourly[h] || 0) + 1
      })
      const cData = Object.entries(hourly)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([hour, count]) => ({ hour, count }))
      setChartData(cData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">Overview</p>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">Dashboard</h2>
        </div>
        <button onClick={load}
          className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5">
        <KpiCard label="Total Vehicles"    value={stats?.total_vehicles   ?? '—'} icon={Car}        color="neon-green"  />
        <KpiCard label="Active Now"        value={stats?.active_vehicles  ?? '—'} icon={Users}       color="neon-blue"   sub="Currently parked" />
        <KpiCard label="Entries Today"     value={stats?.entries_today    ?? '—'} icon={TrendingUp}  color="neon-amber"  />
        <KpiCard label="Avg Duration"      value={stats?.avg_duration_str ?? '—'} icon={Clock}       color="neon-purple" sub="Per session" />
      </div>

      {/* Chart + Table row */}
      <div className="grid grid-cols-5 gap-6">
        {/* Activity Chart */}
        <div className="col-span-2 glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-4 h-4 text-neon-green" />
            <h3 className="text-sm font-semibold text-white/80">Entry Volume by Hour</h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00ff88" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#00ff88" strokeWidth={2} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-white/20 font-mono text-sm">No data yet</p>
            </div>
          )}
        </div>

        {/* System Stats */}
        <div className="col-span-3 glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white/80">Recent Activity</h3>
            <span className="font-mono text-xs text-white/30">{records.length} records shown</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/20">
              <Car className="w-10 h-10 mb-3 opacity-20" />
              <p className="font-mono text-sm">No records yet. Upload a plate image to begin.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-64">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Plate', 'Entry', 'Exit', 'Duration', 'Status'].map(h => (
                      <th key={h} className="pb-3 px-4 text-xs font-mono text-white/30 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec, i) => <RecordRow key={rec.id} rec={rec} index={i} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
