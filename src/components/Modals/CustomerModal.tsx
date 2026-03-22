import { useState } from 'react'
import type { CustomerDetails } from '../../types/closet.types'

interface Props {
  onSubmit: (details: CustomerDetails) => void
  onClose: () => void
  initial?: CustomerDetails | null
}

export default function CustomerModal({ onSubmit, onClose, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!name.trim()) e.name = 'שם מלא הוא שדה חובה'
    if (!phone.trim()) {
      e.phone = 'מספר טלפון הוא שדה חובה'
    } else if (!/^0[0-9]{8,9}$/.test(phone.replace(/[-\s]/g, ''))) {
      e.phone = 'מספר טלפון לא תקין'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({ name: name.trim(), phone: phone.replace(/[-\s]/g, '') })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        dir="rtl"
        className="w-full max-w-sm mx-4 rounded-2xl shadow-2xl"
        style={{
          background: '#111827',
          border: '1px solid #1e2d40',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #1e2d40' }}>
          <h2 className="text-sm font-semibold text-slate-200">פרטי לקוח</h2>
          <p className="text-[11px] text-slate-500 mt-1">נדרש לשמירה ולייצוא PDF</p>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">שם מלא *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ישראל ישראלי"
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-xl text-slate-200
                         focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
              style={{ background: '#0f1623', border: `1px solid ${errors.name ? '#ef4444' : '#2d3f55'}` }}
            />
            {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">טלפון *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="050-1234567"
              dir="ltr"
              className="w-full px-3 py-2.5 text-sm rounded-xl text-slate-200 text-left
                         focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
              style={{ background: '#0f1623', border: `1px solid ${errors.phone ? '#ef4444' : '#2d3f55'}` }}
            />
            {errors.phone && <p className="text-[10px] text-red-400 mt-1">{errors.phone}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex gap-2" style={{ borderTop: '1px solid #1e2d40' }}>
          <button
            type="submit"
            className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all"
            style={{ background: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd' }}
          >
            המשך
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm rounded-xl transition-all"
            style={{ background: 'transparent', border: '1px solid #2d3f55', color: '#64748b' }}
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  )
}
