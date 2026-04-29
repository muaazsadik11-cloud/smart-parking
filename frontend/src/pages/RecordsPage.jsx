import { useState, useEffect } from 'react'
import { Activity, Search, Car, Filter, Download } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { getRecords } from '../utils/api'

function StatusBadge({ status }) {
  return status === 'active'
    ? <span className="status-active">● PARKED</span>
    : <span className="status-completed">✓ DEPARTED</span>
}

function MethodBadge({ method }) {
  const colors = {
    yolo:        'text-neon-green  bg-neon-green/10  border-neon-green/20',
    contour:     'text-neon-blue   bg-neon-blue/10   border-neon-blue/20',
    full_image:  'text-neon-amber  bg-neon-amber/10  border-neon-amber/20',
    filename:    'text-neon-purple bg-neon-purple/10 border-neon-purple/20',
    synthetic:   'text-red-400     bg-red-400/10     border-red-400/20',
  }
  const cls = colors[method] || 'text-white/40 bg-white/5 border-white/10'
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>
      {method?.toUpperCase() || 'UNKNOWN'}
    </span>
  )
}

export default function RecordsPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')  // all | active | completed

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getRecords(200)
        setRecords(res.data.records)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = records.filter(r => {
    const matchSearch = r.plate_number.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || r.status === filter
    return matchSearch && matchFilter
  })

  const exportCsv = () => {
    const headers = 'Plate,Entry,Exit,Duration,Status,Method\n'
    const rows = filtered.map(r =>
      `${r.plate_number},${r.entry_time || ''},${r.exit_time || ''},${r.duration_str || ''},${r.status},${r.detect_method || ''}`
    ).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `parking_records_${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">Logs</p>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">Parking Records</h2>
        </div>
        <button onClick={exportCsv} className="btn-ghost flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            placeholder="Search by plate number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-carbon-900/80 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder-white/20 outline-none focus:border-neon-green/30 font-mono tracking-wide transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wide transition-all
                ${filter === f ? 'bg-neon-green/10 border border-neon-green/30 text-neon-green' : 'border border-white/10 text-white/40 hover:text-white/70'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-white/30 text-xs font-mono ml-auto">
          <Filter className="w-3.5 h-3.5" />
          {filtered.length} records
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/8">
                {['Plate Number', 'Entry Time', 'Exit Time', 'Duration', 'Confidence', 'Method', 'Status'].map(h => (
                  <th key={h} className="px-5 py-4 text-xs font-mono text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-white/5 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Car className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-white/25 font-mono text-sm">No records found</p>
                  </td>
                </tr>
              ) : filtered.map((rec, i) => (
                <tr key={rec.id}
                  className="border-b border-white/5 hover:bg-white/2 transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 20}ms` }}>
                  <td className="px-5 py-4">
                    <span className="font-mono text-neon-green text-sm tracking-widest font-bold">
                      {rec.plate_number}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white/50 text-sm font-mono">
                    {rec.entry_time ? format(parseISO(rec.entry_time), 'dd MMM yyyy HH:mm') : '—'}
                  </td>
                  <td className="px-5 py-4 text-white/50 text-sm font-mono">
                    {rec.exit_time  ? format(parseISO(rec.exit_time),  'dd MMM yyyy HH:mm') : <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-5 py-4 text-white/70 text-sm font-mono">
                    {rec.duration_str || <span className="text-neon-green/60 animate-pulse-slow">Live...</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-neon-green rounded-full transition-all"
                          style={{ width: `${Math.round((rec.confidence || 0) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-white/40">
                        {Math.round((rec.confidence || 0) * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <MethodBadge method={rec.detect_method} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={rec.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
