import { useState } from 'react'
import { searchDesigns, type DesignRecord } from '../../services/designService'

interface Props {
  onLoad: (record: DesignRecord) => void
  onClose: () => void
}

export default function SearchModal({ onLoad, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DesignRecord[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    const data = await searchDesigns(query)
    setResults(data)
    setSearched(true)
    setSearching(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        dir="rtl"
        className="w-full max-w-md mx-4 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col"
        style={{
          background: '#111827',
          border: '1px solid #1e2d40',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #1e2d40' }}>
          <h2 className="text-sm font-semibold text-slate-200">חיפוש עיצוב קיים</h2>
          <p className="text-[11px] text-slate-500 mt-1">חפש לפי שם לקוח או מספר טלפון</p>
        </div>

        {/* Search */}
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #1e2d40' }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              placeholder="שם או טלפון..."
              autoFocus
              className="flex-1 px-3 py-2.5 text-sm rounded-xl text-slate-200
                         focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
              style={{ background: '#0f1623', border: '1px solid #2d3f55' }}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all disabled:opacity-40"
              style={{ background: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd' }}
            >
              {searching ? '...' : 'חפש'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {searched && results.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">לא נמצאו תוצאות</p>
          )}
          {results.map(rec => (
            <button
              key={rec.id}
              onClick={() => onLoad(rec)}
              className="w-full text-right px-4 py-3 rounded-xl mb-2 transition-all hover:bg-slate-800/50"
              style={{ border: '1px solid #1e2d40' }}
            >
              <div className="text-sm text-slate-200 font-medium">{rec.customer_name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {rec.customer_phone} · {new Date(rec.updated_at).toLocaleDateString('he-IL')}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                {(rec.closet_config as any).dimensions?.width}×{(rec.closet_config as any).dimensions?.height} ס״מ
                {' · '}
                {(rec.closet_config as any).closetType === 'hinge' ? 'צירים' : 'הזזה'}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 shrink-0" style={{ borderTop: '1px solid #1e2d40' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm rounded-xl transition-all"
            style={{ background: 'transparent', border: '1px solid #2d3f55', color: '#64748b' }}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  )
}
