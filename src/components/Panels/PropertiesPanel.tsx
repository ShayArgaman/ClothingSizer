import { useState } from 'react'
import { useWardrobeStore } from '../../store/wardrobeStore'
import { MATERIALS, DIM_LABELS, DOOR_TYPE_LABELS } from '../../types/wardrobe.types'
import type { Material, DoorType } from '../../types/wardrobe.types'
import { getUnusedSpace } from '../../utils/validation'

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #1e2d40' }}>
        <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #1e2d40' }}>
        {children}
      </div>
    </section>
  )
}

function DimInput({
  label, value, min = 5, max = 600,
  onChange,
}: { label: string; value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-400 w-14 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number" min={min} max={max} step={5} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 px-2 py-1.5 text-xs rounded-lg text-slate-200 text-center
                     focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
          style={{ background: '#0f1623', border: '1px solid #2d3f55' }}
        />
        <span className="text-[10px] text-slate-600">ס״מ</span>
      </div>
    </label>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative shrink-0 w-10 h-6 rounded-full transition-all duration-200"
      style={{ background: checked ? '#2563eb' : '#1e2d40', border: `1px solid ${checked ? '#3b82f6' : '#2d3f55'}` }}
    >
      <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
        style={{ background: checked ? '#fff' : '#475569', right: checked ? '2px' : 'auto', left: checked ? 'auto' : '2px' }} />
    </button>
  )
}

export default function PropertiesPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const {
    wardrobe, door, elements, selectedId,
    setWardrobeDimensions, setDoorConfig,
    updateElement, removeElement,
  } = useWardrobeStore()

  const selected  = elements.find((el) => el.id === selectedId)
  const unusedCm2 = getUnusedSpace(elements, wardrobe)
  const unusedPct = Math.round((unusedCm2 / (wardrobe.width * wardrobe.height)) * 100)
  const halfW     = wardrobe.width / 2
  const doorOptions: DoorType[] = ['none', 'hinged', 'sliding']

  if (collapsed) {
    return (
      <aside className="w-8 flex flex-col shrink-0 items-center pt-3 cursor-pointer"
        style={{ background: '#111827', borderRight: '1px solid #1e2d40' }}
        onClick={() => setCollapsed(false)}>
        <div className="text-slate-600 text-[10px]" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          ◀ מאפיינים
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-52 flex flex-col shrink-0 overflow-y-auto transition-all duration-200"
      style={{ background: '#111827', borderRight: '1px solid #1e2d40' }}>

      {/* Header with collapse button */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d40' }}>
        <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">מאפיינים</h2>
        <button onClick={() => setCollapsed(true)}
          className="text-slate-600 hover:text-slate-400 text-xs w-6 h-6 flex items-center justify-center rounded transition-colors">
          ◀
        </button>
      </div>

      {/* ── Wardrobe frame ── */}
      <PanelSection title="מסגרת הארון">
        <div className="space-y-2.5">
          <DimInput label={DIM_LABELS.width}  value={wardrobe.width}  min={60} max={600} onChange={(v) => setWardrobeDimensions({ width: v })} />
          <DimInput label={DIM_LABELS.height} value={wardrobe.height} min={60} max={300} onChange={(v) => setWardrobeDimensions({ height: v })} />
          <DimInput label={DIM_LABELS.depth}  value={wardrobe.depth}  min={30} max={120} onChange={(v) => setWardrobeDimensions({ depth: v })} />
          <div className="flex justify-between text-[10px] text-slate-600 px-0.5 pt-0.5">
            <span>כל תא: {halfW} ס״מ</span>
          </div>
        </div>
        <div className="mt-3 px-3 py-2.5 rounded-xl space-y-1.5"
          style={{ background: '#0f1623', border: '1px solid #1e2d40' }}>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">נפח</span>
            <span className="text-slate-400 font-medium">
              {Math.round(wardrobe.width * wardrobe.height * wardrobe.depth / 1000).toLocaleString('he-IL')} ל׳
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">שטח מנוצל</span>
            <span className={`font-medium ${unusedPct > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {100 - unusedPct}%
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e2d40' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${100 - unusedPct}%`,
                background: unusedPct > 50
                  ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                  : 'linear-gradient(90deg,#10b981,#34d399)',
              }} />
          </div>
        </div>
      </PanelSection>

      {/* ── Door config (unified) ── */}
      <PanelSection title="דלתות">
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {doorOptions.map((t) => (
              <button key={t} onClick={() => setDoorConfig({ doorType: t })}
                className="flex-1 py-2 text-[11px] rounded-xl transition-all min-h-[40px] font-medium"
                style={{
                  background: door.doorType === t ? '#1e3a5f' : '#0f1623',
                  border: `1px solid ${door.doorType === t ? '#3b82f6' : '#2d3f55'}`,
                  color: door.doorType === t ? '#93c5fd' : '#64748b',
                }}>
                {DOOR_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {door.doorType !== 'none' && (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🪞</span>
                <span className="text-[12px] text-slate-400">תוספת מראה</span>
              </div>
              <ToggleSwitch checked={door.hasMirror} onChange={(v) => setDoorConfig({ hasMirror: v })} />
            </div>
          )}
        </div>
      </PanelSection>

      {/* ── Selected element ── */}
      <section className="px-4 py-3 flex-1">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
          {selected ? selected.label : 'רכיב נבחר'}
        </div>

        {!selected ? (
          <p className="text-[11px] text-slate-600 leading-relaxed">לחץ על רכיב בלוח לעריכה</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2.5">
              <DimInput label={DIM_LABELS.width}  value={selected.width}  onChange={(v) => updateElement(selected.id, { width: v })} />
              <DimInput label={DIM_LABELS.height} value={selected.height} onChange={(v) => updateElement(selected.id, { height: v })} />
              <DimInput label={DIM_LABELS.depth}  value={selected.depth}  onChange={(v) => updateElement(selected.id, { depth: v })} />
              <DimInput label={DIM_LABELS.x} value={selected.x} min={0} onChange={(v) => updateElement(selected.id, { x: v })} />
              <DimInput label={DIM_LABELS.y} value={selected.y} min={0} onChange={(v) => updateElement(selected.id, { y: v })} />
            </div>

            <div className="h-px" style={{ background: '#1e2d40' }} />

            <div>
              <div className="text-[11px] text-slate-500 mb-2">חומר</div>
              <div className="space-y-1">
                {MATERIALS.map((mat) => (
                  <button key={mat.value}
                    onClick={() => updateElement(selected.id, { material: mat.value as Material, color: mat.color })}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] w-full text-right transition-all min-h-[36px]"
                    style={{
                      background: selected.material === mat.value ? '#1e3a5f' : '#1a2535',
                      border: `1px solid ${selected.material === mat.value ? '#3b82f6' : '#1e2d40'}`,
                      color: selected.material === mat.value ? '#93c5fd' : '#94a3b8',
                    }}>
                    <span className="w-3.5 h-3.5 rounded shrink-0" style={{ background: mat.color, border: '1px solid rgba(0,0,0,0.2)' }} />
                    {mat.label}
                    {selected.material === mat.value && <span className="mr-auto text-blue-400 text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px" style={{ background: '#1e2d40' }} />

            <div>
              <div className="text-[11px] text-slate-500 mb-2">צבע מותאם</div>
              <div className="flex items-center gap-3">
                <input type="color" value={selected.color}
                  onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent"
                  style={{ outline: '1px solid #2d3f55', padding: '2px', border: 'none' }} />
                <span className="text-[11px] text-slate-500 font-mono">{selected.color.toUpperCase()}</span>
              </div>
            </div>

            <button onClick={() => removeElement(selected.id)}
              className="w-full py-2.5 text-xs rounded-xl transition-all min-h-[40px]"
              style={{ background: 'transparent', border: '1px solid #7f1d1d44', color: '#f87171aa' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#7f1d1d22'; e.currentTarget.style.color = '#f87171' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f87171aa' }}>
              הסר רכיב
            </button>
          </div>
        )}
      </section>
    </aside>
  )
}
