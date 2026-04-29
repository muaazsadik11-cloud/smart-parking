import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Scan, CheckCircle, XCircle, ArrowRight, Loader2, FileImage } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadImage } from '../utils/api'

// ─────────────────────────────────────────────
// SCANNING ANIMATION
// ─────────────────────────────────────────────
function ScanAnimation() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="w-48 h-28 border-2 border-neon-green/50 rounded-lg relative overflow-hidden">
        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-neon-green to-transparent animate-scan" />
        {/* Corner marks */}
        {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-4 h-4 border-neon-green ${
            i === 0 ? 'border-t-2 border-l-2' :
            i === 1 ? 'border-t-2 border-r-2' :
            i === 2 ? 'border-b-2 border-l-2' :
                      'border-b-2 border-r-2'
          }`} />
        ))}
        <div className="flex items-center justify-center h-full">
          <span className="font-mono text-neon-green/50 text-sm tracking-widest">SCANNING...</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// RESULT CARD
// ─────────────────────────────────────────────
function ResultCard({ result }) {
  const isEntry = result.event?.event_type === 'ENTRY'
  const conf    = Math.round((result.confidence || 0) * 100)

  return (
    <div className="glass-card p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-6">
        <CheckCircle className="w-5 h-5 text-neon-green" />
        <h3 className="font-semibold text-white">Detection Result</h3>
      </div>

      {/* Plate Display */}
      <div className="bg-carbon-950 border-2 border-neon-green/30 rounded-xl p-5 mb-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-neon-green/5 to-transparent" />
        <p className="text-xs font-mono text-white/30 mb-2 tracking-widest">DETECTED PLATE</p>
        <div className="text-4xl font-display font-bold text-neon-green tracking-[0.3em] animate-glow">
          {result.plate_text}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Confidence', value: `${conf}%`, color: conf > 60 ? 'text-neon-green' : conf > 30 ? 'text-neon-amber' : 'text-red-400' },
          { label: 'Method',     value: result.method?.toUpperCase() || '—', color: 'text-neon-blue' },
          { label: 'Time',       value: `${result.processing_time_ms}ms`, color: 'text-neon-purple' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-carbon-900/80 rounded-xl p-3 text-center">
            <p className="text-xs text-white/30 mb-1 font-mono">{label}</p>
            <p className={`font-mono font-bold text-sm ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Event Badge */}
      <div className={`flex items-center justify-between p-4 rounded-xl border
        ${isEntry ? 'bg-neon-green/10 border-neon-green/20' : 'bg-neon-blue/10 border-neon-blue/20'}`}>
        <div>
          <p className="text-xs text-white/40 font-mono mb-0.5">EVENT</p>
          <p className={`font-bold text-lg font-mono ${isEntry ? 'text-neon-green' : 'text-neon-blue'}`}>
            {isEntry ? '↗ VEHICLE ENTRY' : '↙ VEHICLE EXIT'}
          </p>
          {result.event?.entry_time && (
            <p className="text-xs text-white/30 font-mono mt-1">
              Entered: {new Date(result.event.entry_time).toLocaleTimeString()}
            </p>
          )}
          {result.event?.duration && (
            <p className="text-xs text-neon-amber font-mono mt-1">
              Duration: {result.event.duration}
            </p>
          )}
        </div>
        <div className={`w-14 h-14 rounded-xl ${isEntry ? 'bg-neon-green/20' : 'bg-neon-blue/20'} flex items-center justify-center`}>
          <ArrowRight className={`w-6 h-6 ${isEntry ? 'text-neon-green' : 'text-neon-blue rotate-180'}`} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// UPLOAD PAGE
// ─────────────────────────────────────────────
export default function UploadPage() {
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)

  const onDrop = useCallback(acceptedFiles => {
    const f = acceptedFiles[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.webp'] },
    multiple: false,
    maxSize: 16 * 1024 * 1024,
  })

  const handleProcess = async () => {
    if (!file) return
    setLoading(true)
    setProgress(0)
    setError(null)

    try {
      const res = await uploadImage(file, setProgress)
      setResult(res.data)
      toast.success(`Plate detected: ${res.data.plate_text}`)
    } catch (e) {
      const msg = e.response?.data?.error || 'Processing failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setError(null); setProgress(0)
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <p className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">ANPR</p>
        <h2 className="text-3xl font-display font-bold text-white tracking-tight">Scan Plate</h2>
        <p className="text-white/40 text-sm mt-1">Upload a vehicle image to detect and log the number plate</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upload Zone */}
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`relative overflow-hidden border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
              ${isDragActive ? 'border-neon-green bg-neon-green/10' : 'border-white/10 hover:border-neon-green/40 hover:bg-white/2'}`}
            style={{ minHeight: '280px' }}>
            <input {...getInputProps()} />

            {preview ? (
              <div className="relative w-full h-full">
                <img src={preview} alt="Preview"
                  className="w-full h-full object-cover rounded-xl opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-carbon-950/80 to-transparent rounded-xl" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-mono text-xs text-neon-green">{file.name}</p>
                  <p className="font-mono text-xs text-white/40">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-10 h-full">
                {isDragActive ? (
                  <>
                    <Scan className="w-14 h-14 text-neon-green mb-4 animate-pulse" />
                    <p className="text-neon-green font-semibold">Drop to scan</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
                      <FileImage className="w-7 h-7 text-white/30" />
                    </div>
                    <p className="text-white/60 font-medium mb-2">Drag & drop vehicle image</p>
                    <p className="text-white/25 text-sm">or click to browse files</p>
                    <p className="text-white/15 text-xs mt-3 font-mono">JPG · PNG · BMP · WEBP · max 16MB</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={handleProcess}
              disabled={!file || loading}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing... {progress > 0 && `${progress}%`}
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4" />
                  Detect Plate
                </>
              )}
            </button>
            {file && (
              <button onClick={reset} className="btn-ghost px-4">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {loading && progress > 0 && (
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-neon-green rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {/* Result / Scan animation */}
        <div>
          {loading ? (
            <div className="glass-card h-full flex flex-col items-center justify-center gap-6 p-8">
              <ScanAnimation />
              <div className="text-center">
                <p className="text-white/60 text-sm font-medium">Running ANPR Pipeline</p>
                <p className="text-white/25 text-xs font-mono mt-1">Multi-layer detection active...</p>
              </div>
              <div className="w-full space-y-2">
                {['YOLO Detection', 'Contour Analysis', 'OCR Engine', 'Text Validation'].map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                    <p className="text-xs font-mono text-white/40">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : result ? (
            <ResultCard result={result} />
          ) : error ? (
            <div className="glass-card p-6 border border-red-500/20">
              <XCircle className="w-8 h-8 text-red-400 mb-3" />
              <p className="text-red-400 font-medium mb-1">Detection Error</p>
              <p className="text-white/40 text-sm">{error}</p>
            </div>
          ) : (
            <div className="glass-card h-full flex flex-col items-center justify-center p-8 text-center">
              <Upload className="w-12 h-12 text-white/15 mb-4" />
              <p className="text-white/30 font-medium">Upload an image to begin</p>
              <p className="text-white/15 text-sm mt-1 font-mono">ANPR result will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white/60 mb-4 uppercase tracking-wider font-mono">Pipeline Stages</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { step: '01', title: 'YOLOv8',     desc: 'Deep learning plate detection with confidence tuning' },
            { step: '02', title: 'Contour',     desc: 'Edge detection fallback with aspect ratio filtering' },
            { step: '03', title: 'Tesseract',   desc: 'Multi-variant OCR with 7 preprocessing modes' },
            { step: '04', title: 'Validation',  desc: 'Text cleaning, scoring and event logging' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-carbon-900/60 rounded-xl p-4 border border-white/5">
              <p className="text-xs font-mono text-neon-green/50 mb-2">{step}</p>
              <p className="font-semibold text-white/80 text-sm mb-1">{title}</p>
              <p className="text-xs text-white/30">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
