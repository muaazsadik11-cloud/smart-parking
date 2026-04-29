import { useState, useEffect } from 'react'
import { Images, Play, CheckCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getDataset, processDatasetImage } from '../utils/api'

function ImageCard({ image, onProcess }) {
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [imgError, setImgError] = useState(false)

  const handle = async () => {
    setLoading(true)
    try {
      const res = await processDatasetImage(image.filename)
      setResult(res.data)
      onProcess(res.data)
      toast.success(`${image.filename}: ${res.data.plate_text}`)
    } catch (e) {
      toast.error(`Failed: ${image.filename}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card-hover overflow-hidden group">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-carbon-900">
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-white/20" />
          </div>
        ) : (
          <img
            src={image.url}
            alt={image.filename}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-carbon-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={handle}
            disabled={loading}
            className="btn-primary flex items-center gap-2 text-sm shadow-lg">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              : <><Play className="w-4 h-4" /> Process</>
            }
          </button>
        </div>

        {/* Result overlay after processing */}
        {result && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-carbon-950 via-carbon-950/80 to-transparent p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-neon-green shrink-0" />
              <span className="font-mono text-neon-green text-sm font-bold tracking-widest truncate">
                {result.plate_text}
              </span>
              <span className={`ml-auto text-[10px] font-mono shrink-0
                ${result.event?.event_type === 'ENTRY' ? 'text-neon-green' : 'text-neon-blue'}`}>
                {result.event?.event_type}
              </span>
            </div>
          </div>
        )}

        {/* Loading scanner */}
        {loading && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="scan-line" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between">
        <p className="text-xs font-mono text-white/40 truncate">{image.filename}</p>
        <p className="text-xs font-mono text-white/20 shrink-0 ml-2">{image.size_kb}KB</p>
      </div>
    </div>
  )
}

export default function DatasetPage() {
  const [images,  setImages]  = useState([])
  const [loading, setLoading] = useState(true)
  const [processed, setProcessed] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getDataset()
      setImages(res.data.images)
    } catch (e) {
      toast.error('Failed to load dataset')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleProcess = (result) => {
    setProcessed(p => p + 1)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/30 text-xs font-mono tracking-widest uppercase mb-1">Gallery</p>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">Dataset</h2>
          <p className="text-white/40 text-sm mt-1">
            {images.length} images · {processed} processed this session
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-xs font-mono text-neon-green">{processed} processed</span>
          </div>
          <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
        </div>
      </div>

      {/* Instructions banner */}
      <div className="glass-card p-4 border border-neon-blue/10 flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center shrink-0">
          <Images className="w-4 h-4 text-neon-blue" />
        </div>
        <div>
          <p className="text-sm text-white/70 font-medium">Process any image from the dataset</p>
          <p className="text-xs text-white/30 mt-0.5">
            Hover over an image and click Process — the ANPR pipeline will detect the plate and log an entry or exit.
            Place your own images in the <span className="font-mono text-neon-green/60">backend/dataset/</span> folder.
          </p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-5">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="glass-card overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-white/5" />
              <div className="p-4">
                <div className="h-3 bg-white/5 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
          <Images className="w-12 h-12 text-white/10 mb-4" />
          <p className="text-white/30 font-medium mb-1">No dataset images found</p>
          <p className="text-white/15 text-sm font-mono">
            Add images to <span className="text-neon-green/40">backend/dataset/</span> and reload
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {images.map(img => (
            <ImageCard key={img.filename} image={img} onProcess={handleProcess} />
          ))}
        </div>
      )}
    </div>
  )
}
