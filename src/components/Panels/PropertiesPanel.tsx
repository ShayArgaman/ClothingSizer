import { useState, useMemo } from 'react'
import { useClosetStore } from '../../store/closetStore'
import {
  MATERIALS, FRONT_FINISH_LABELS,
  ELEMENT_KIND_LABELS,
  HINGE_DOOR_MIN_WIDTH, HINGE_DOOR_MAX_WIDTH,
  SLIDING_DOOR_MIN_WIDTH, SLIDING_DOOR_MAX_WIDTH,
} from '../../types/closet.types'
import type {
  ClosetType, FrontFinish, HandleStyle,
  DrawerElement, SectionElement, SingleDoorPlacement,
} from '../../types/closet.types'
import { validateCloset, countBySeverity, errorsForElement, errorsForSection } from '../../utils/closetValidation'
import { adjustDoorWidth, getInnerWidth, computeEqualDoorWidths } from '../../utils/closetUtils'

// ── Shared UI components ────────────────────────────────────

function PanelSection({
  title, badge, children,
}: {
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #1e2d40' }}>
        <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{title}</h2>
        {badge}
      </div>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #1e2d40' }}>
        {children}
      </div>
    </section>
  )
}

function DimInput({
  label, value, min = 5, max = 600, step = 5,
  onChange, disabled = false,
}: {
  label: string; value: number; min?: number; max?: number; step?: number
  onChange: (v: number) => void; disabled?: boolean
}) {
  const [localValue, setLocalValue] = useState<string>(String(value))
  const [focused, setFocused] = useState(false)

  // Sync from parent when not focused
  const displayValue = focused ? localValue : String(value)

  const commit = () => {
    const n = Number(localValue)
    if (!isNaN(n) && n >= min && n <= max) {
      onChange(n)
    } else {
      setLocalValue(String(value)) // revert
    }
  }

  const stepBy = (dir: 1 | -1) => {
    const next = Math.min(max, Math.max(min, value + step * dir))
    onChange(next)
    setLocalValue(String(next))
  }

  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-400 w-14 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => stepBy(-1)}
          disabled={disabled || value <= min}
          className="w-6 h-6 flex items-center justify-center rounded-md text-xs text-slate-400
                     hover:text-slate-200 hover:bg-slate-700/50 transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: '#0f1623', border: '1px solid #2d3f55' }}
        >−</button>
        <input
          type="number" min={min} max={max} step={step} value={displayValue}
          disabled={disabled}
          onFocus={() => { setFocused(true); setLocalValue(String(value)) }}
          onBlur={() => { setFocused(false); commit() }}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur() } }}
          className="w-14 px-1 py-1.5 text-xs rounded-lg text-slate-200 text-center
                     focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed
                     [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{ background: '#0f1623', border: '1px solid #2d3f55' }}
        />
        <button
          type="button"
          onClick={() => stepBy(1)}
          disabled={disabled || value >= max}
          className="w-6 h-6 flex items-center justify-center rounded-md text-xs text-slate-400
                     hover:text-slate-200 hover:bg-slate-700/50 transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: '#0f1623', border: '1px solid #2d3f55' }}
        >+</button>
        <span className="text-[10px] text-slate-600">ס״מ</span>
      </div>
    </label>
  )
}

function ToggleButton({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="flex-1 py-2 text-[11px] rounded-xl transition-all min-h-[40px] font-medium"
          style={{
            background: value === opt.value ? '#1e3a5f' : '#0f1623',
            border: `1px solid ${value === opt.value ? '#3b82f6' : '#2d3f55'}`,
            color: value === opt.value ? '#93c5fd' : '#64748b',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Door Width Bar ──────────────────────────────────────────

function DoorWidthBar({ widths }: { widths: number[] }) {
  const total = widths.reduce((a, b) => a + b, 0)
  if (total === 0) return null

  return (
    <div className="flex gap-0.5 h-5 rounded-lg overflow-hidden" style={{ border: '1px solid #2d3f55' }}>
      {widths.map((w, i) => {
        const pct = (w / total) * 100
        return (
          <div
            key={i}
            className="flex items-center justify-center text-[9px] font-mono text-slate-400 transition-all"
            style={{
              width: `${pct}%`,
              background: i % 2 === 0 ? '#1a2535' : '#1e2d40',
              minWidth: 20,
            }}
          >
            {w}
          </div>
        )
      })}
    </div>
  )
}

// ── Main panel ──────────────────────────────────────────────

export default function PropertiesPanel() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024)

  const {
    closet,
    selectedSectionId,
    selectedElementId,
    setClosetType,
    setDimensions,
    setBodyMaterial,
    setFrontMaterial,
    setFrontFinish,
    setDoorCount,
    setDoorWidths,
    setSingleDoorPlacement,
    setHandleStyle,
    setCenterHandleDoor,
    updateElement,
    removeElement,
    distributeShelvesEqually,
    getDoorConfigurations,
  } = useClosetStore()

  const errors = useMemo(() => validateCloset(closet), [closet])
  const errorCounts = useMemo(() => countBySeverity(errors), [errors])

  const selectedSection = closet.sections.find(s => s.id === selectedSectionId)
  const selectedElement = selectedSection?.elements.find(e => e.id === selectedElementId)
  const selectedElementErrors = selectedElementId ? errorsForElement(errors, selectedElementId) : []
  const sectionErrors = selectedSectionId ? errorsForSection(errors, selectedSectionId) : []

  const validDoorCounts = getDoorConfigurations()
  const innerWidth = getInnerWidth(closet.dimensions)

  const [minDoor, maxDoor] = closet.closetType === 'hinge'
    ? [HINGE_DOOR_MIN_WIDTH, HINGE_DOOR_MAX_WIDTH]
    : [SLIDING_DOOR_MIN_WIDTH, SLIDING_DOOR_MAX_WIDTH]

  const isAsymmetric = useMemo(() => {
    const w = closet.doors.widths
    return w.length > 1 && !w.every(v => v === w[0])
  }, [closet.doors.widths])

  const handleDoorWidthChange = (index: number, newWidth: number) => {
    const result = adjustDoorWidth(
      closet.closetType,
      closet.doors.widths,
      index,
      newWidth,
      innerWidth,
    )
    setDoorWidths(result)
  }

  const resetToEqualWidths = () => {
    setDoorWidths(computeEqualDoorWidths(closet.closetType, innerWidth, closet.doors.count))
  }

  if (collapsed) {
    return (
      <aside
        className="w-10 flex flex-col shrink-0 items-center pt-4 cursor-pointer"
        style={{ background: '#111827', borderRight: '1px solid #1e2d40' }}
        onClick={() => setCollapsed(false)}
      >
        <div className="text-slate-500 text-[11px]"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          ◀ מאפיינים
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="w-56 flex flex-col shrink-0 transition-all duration-200"
      style={{ background: '#111827', borderRight: '1px solid #1e2d40' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d40' }}>
        <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">מאפיינים</h2>
        <button onClick={() => setCollapsed(true)}
          className="text-slate-600 hover:text-slate-400 text-xs w-6 h-6 flex items-center justify-center rounded transition-colors">
          ◀
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Closet Type ── */}
        <PanelSection title="סוג ארון">
          <ToggleButton
            options={[
              { value: 'hinge', label: 'צירים' },
              { value: 'sliding', label: 'הזזה' },
            ]}
            value={closet.closetType}
            onChange={(v) => setClosetType(v as ClosetType)}
          />
        </PanelSection>

        {/* ── Dimensions ── */}
        <PanelSection title="מידות">
          <div className="space-y-2.5">
            <DimInput label="רוחב" value={closet.dimensions.width} min={60} max={600}
              onChange={(v) => setDimensions({ width: v })} />
            <DimInput label="גובה" value={closet.dimensions.height} min={100} max={300}
              onChange={(v) => setDimensions({ height: v })} />
            <DimInput label="עומק" value={closet.dimensions.depth} min={50} max={60}
              onChange={(v) => setDimensions({ depth: v })} />
            <div className="flex justify-between text-[10px] text-slate-600 px-0.5 pt-1">
              <span>{closet.sections.length} סקציות</span>
              <span>נפח: {Math.round(closet.dimensions.width * closet.dimensions.height * closet.dimensions.depth / 1000).toLocaleString('he-IL')} ל׳</span>
            </div>
          </div>
        </PanelSection>

        {/* ── Doors ── */}
        <PanelSection title="דלתות">
          <div className="space-y-3">
            {/* Door count */}
            <div>
              <div className="text-[10px] text-slate-500 mb-1.5">מספר דלתות</div>
              <div className="flex gap-1.5">
                {validDoorCounts.map(n => (
                  <button key={n}
                    onClick={() => setDoorCount(n)}
                    className="flex-1 py-2 text-[12px] rounded-lg transition-all min-h-[36px] font-medium"
                    style={{
                      background: closet.doors.count === n ? '#1e3a5f' : '#0f1623',
                      border: `1px solid ${closet.doors.count === n ? '#3b82f6' : '#2d3f55'}`,
                      color: closet.doors.count === n ? '#93c5fd' : '#64748b',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual door width bar */}
            <DoorWidthBar widths={closet.doors.widths} />

            {/* Per-door width sliders */}
            {closet.doors.count > 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-slate-500">רוחב דלתות</div>
                  {isAsymmetric && (
                    <button
                      onClick={resetToEqualWidths}
                      className="text-[9px] px-2 py-0.5 rounded-md transition-all"
                      style={{ background: '#1e3a5f33', border: '1px solid #3b82f633', color: '#93c5fd' }}
                    >
                      איפוס שווה
                    </button>
                  )}
                </div>
                {closet.doors.widths.map((w, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">דלת {i + 1}</span>
                      <span className="text-slate-400 font-mono">{w} ס״מ</span>
                    </div>
                    <input
                      type="range"
                      min={minDoor}
                      max={maxDoor}
                      step={1}
                      value={w}
                      onChange={(e) => handleDoorWidthChange(i, Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to left, #3b82f6 ${((w - minDoor) / (maxDoor - minDoor)) * 100}%, #1e2d40 0%)`,
                        accentColor: '#3b82f6',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Single door — just show width */}
            {closet.doors.count === 1 && (
              <div className="text-[10px] text-slate-600">
                דלת 1: {closet.doors.widths[0]} ס״מ
              </div>
            )}

            {/* Single door placement (hinge + odd count) */}
            {closet.closetType === 'hinge' && closet.doors.count > 1 && closet.doors.count % 2 !== 0 && (
              <div>
                <div className="text-[10px] text-slate-500 mb-1.5">מיקום דלת בודדת</div>
                <ToggleButton
                  options={[
                    { value: 'right', label: 'ימין' },
                    { value: 'left', label: 'שמאל' },
                  ]}
                  value={closet.doors.singleDoorPlacement ?? 'right'}
                  onChange={(v) => setSingleDoorPlacement(v as SingleDoorPlacement)}
                />
              </div>
            )}

            {/* Handle style (hinge only) */}
            {closet.closetType === 'hinge' && (
              <div>
                <div className="text-[10px] text-slate-500 mb-1.5">ידיות</div>
                <ToggleButton
                  options={[
                    { value: 'point', label: 'נקודה' },
                    { value: 'long', label: 'מאורכת' },
                    { value: 'center', label: 'מרכזית' },
                  ]}
                  value={closet.doors.handleStyle}
                  onChange={(v) => setHandleStyle(v as HandleStyle)}
                />
                {closet.doors.handleStyle === 'center' && (
                  <div className="mt-2">
                    <div className="text-[10px] text-slate-500 mb-1">דלת מרכזית</div>
                    <div className="flex gap-1">
                      {closet.doors.widths.map((_, i) => (
                        <button key={i}
                          onClick={() => setCenterHandleDoor(i)}
                          className="flex-1 py-1 text-[10px] rounded-lg transition-all"
                          style={{
                            background: closet.doors.centerHandleDoorIndex === i ? '#1e3a5f' : '#0f1623',
                            border: `1px solid ${closet.doors.centerHandleDoorIndex === i ? '#3b82f6' : '#2d3f55'}`,
                            color: closet.doors.centerHandleDoorIndex === i ? '#93c5fd' : '#64748b',
                          }}>
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </PanelSection>

        {/* ── Materials ── */}
        <PanelSection title="חומרים">
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-slate-500 mb-1.5">גוף (פנים)</div>
              <div className="flex gap-1.5 flex-wrap">
                {MATERIALS.map(mat => (
                  <button key={mat.value}
                    onClick={() => setBodyMaterial({ material: mat.value, color: mat.color })}
                    title={mat.label}
                    className="w-7 h-7 rounded-lg transition-all"
                    style={{
                      background: mat.color,
                      border: closet.bodyMaterial.material === mat.value
                        ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.3)',
                      boxShadow: closet.bodyMaterial.material === mat.value
                        ? '0 0 0 2px #3b82f644' : 'none',
                    }} />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1.5">חזית (דלתות)</div>
              <div className="flex gap-1.5 flex-wrap">
                {MATERIALS.map(mat => (
                  <button key={mat.value}
                    onClick={() => setFrontMaterial({ material: mat.value, color: mat.color })}
                    title={mat.label}
                    className="w-7 h-7 rounded-lg transition-all"
                    style={{
                      background: mat.color,
                      border: closet.frontMaterial.material === mat.value
                        ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.3)',
                      boxShadow: closet.frontMaterial.material === mat.value
                        ? '0 0 0 2px #3b82f644' : 'none',
                    }} />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1.5">גמר חזית</div>
              <ToggleButton
                options={Object.entries(FRONT_FINISH_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                value={closet.frontFinish}
                onChange={(v) => setFrontFinish(v as FrontFinish)}
              />
            </div>
          </div>
        </PanelSection>

        {/* ── Selected Section ── */}
        {selectedSection && (
          <PanelSection
            title={`סקציה ${selectedSection.index + 1}`}
            badge={sectionErrors.length > 0 ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: sectionErrors.some(e => e.severity === 'error')
                    ? 'rgba(239,68,68,0.15)' : 'rgba(250,204,21,0.12)',
                  color: sectionErrors.some(e => e.severity === 'error')
                    ? '#fca5a5' : '#fde68a',
                }}>
                {sectionErrors.length}
              </span>
            ) : undefined}
          >
            <div className="space-y-2.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">רוחב</span>
                <span className="text-slate-400">{Math.round(selectedSection.width)} ס״מ</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">רכיבים</span>
                <span className="text-slate-400">{selectedSection.elements.length}</span>
              </div>

              {/* Section validation errors */}
              {sectionErrors.length > 0 && (
                <div className="space-y-1">
                  {sectionErrors.map((err, i) => (
                    <div key={i} className="text-[10px] px-2 py-1 rounded-md"
                      style={{
                        background: err.severity === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(250,204,21,0.06)',
                        border: `1px solid ${err.severity === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(250,204,21,0.15)'}`,
                        color: err.severity === 'error' ? '#fca5a5' : '#fde68a',
                      }}>
                      {err.message}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => distributeShelvesEqually(selectedSection.id)}
                className="w-full py-2 text-[11px] rounded-lg transition-all min-h-[36px]"
                style={{ background: '#0f1623', border: '1px solid #2d3f55', color: '#94a3b8' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1e3a5f'
                  e.currentTarget.style.color = '#93c5fd'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0f1623'
                  e.currentTarget.style.color = '#94a3b8'
                }}>
                חלק מדפים שווה
              </button>
            </div>
          </PanelSection>
        )}

        {/* ── Selected Element ── */}
        <section className="px-4 py-3 flex-1">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
            {selectedElement ? ELEMENT_KIND_LABELS[selectedElement.kind] : 'רכיב נבחר'}
          </div>

          {!selectedElement ? (
            <p className="text-[11px] text-slate-600 leading-relaxed">לחץ על רכיב בלוח לעריכה</p>
          ) : (
            <div className="space-y-3">
              {selectedElementErrors.length > 0 && (
                <div className="space-y-1">
                  {selectedElementErrors.map((err, i) => (
                    <div key={i} className="text-[10px] px-2.5 py-1.5 rounded-lg"
                      style={{
                        background: err.severity === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(250,204,21,0.08)',
                        border: `1px solid ${err.severity === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(250,204,21,0.2)'}`,
                        color: err.severity === 'error' ? '#fca5a5' : '#fde68a',
                      }}>
                      {err.message}
                    </div>
                  ))}
                </div>
              )}

              {selectedElement.fixed && (
                <div className="text-[10px] text-slate-500 px-2 py-1.5 rounded-lg"
                  style={{ background: '#0f1623', border: '1px solid #2d3f55' }}>
                  🔒 רכיב קבוע — לא ניתן לגרירה
                </div>
              )}

              <div className="space-y-2.5">
                <DimInput label="גובה" value={selectedElement.height}
                  disabled={selectedElement.fixed}
                  onChange={(v) => {
                    if (selectedSectionId) updateElement(selectedSectionId, selectedElement.id, { height: v })
                  }} />
                <DimInput label="מיקום Y" value={Math.round(selectedElement.y)} min={0}
                  disabled={selectedElement.fixed}
                  onChange={(v) => {
                    if (selectedSectionId) updateElement(selectedSectionId, selectedElement.id, { y: v })
                  }} />
              </div>

              {(selectedElement.kind === 'drawer-pair' || selectedElement.kind === 'drawer-single')
                && closet.closetType === 'hinge' && (
                <div>
                  <div className="text-[10px] text-slate-500 mb-1.5">מיקום מגירה</div>
                  <ToggleButton
                    options={[
                      { value: 'internal', label: 'פנימית' },
                      { value: 'external', label: 'חיצונית' },
                    ]}
                    value={(selectedElement as DrawerElement).placement}
                    onChange={(v) => {
                      if (selectedSectionId) {
                        updateElement(selectedSectionId, selectedElement.id, { placement: v } as Partial<SectionElement>)
                      }
                    }}
                  />
                </div>
              )}

              {!selectedElement.fixed && (
                <>
                  <div className="h-px" style={{ background: '#1e2d40' }} />
                  <button
                    onClick={() => {
                      if (selectedSectionId) removeElement(selectedSectionId, selectedElement.id)
                    }}
                    className="w-full py-2.5 text-xs rounded-xl transition-all min-h-[40px]"
                    style={{ background: 'transparent', border: '1px solid #7f1d1d44', color: '#f87171aa' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#7f1d1d22'
                      e.currentTarget.style.color = '#f87171'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#f87171aa'
                    }}>
                    הסר רכיב
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── Validation Summary ── */}
      {errors.length > 0 && (
        <div
          className="px-4 py-3 shrink-0"
          style={{ borderTop: '1px solid #1e2d40' }}
        >
          <div className="px-2.5 py-2 rounded-lg text-[10px]"
            style={{
              background: errorCounts.errors > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(250,204,21,0.06)',
              border: `1px solid ${errorCounts.errors > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(250,204,21,0.15)'}`,
              color: errorCounts.errors > 0 ? '#fca5a5' : '#fde68a',
            }}>
            {errorCounts.errors > 0 && <span>{errorCounts.errors} שגיאות</span>}
            {errorCounts.errors > 0 && errorCounts.warnings > 0 && <span> · </span>}
            {errorCounts.warnings > 0 && <span>{errorCounts.warnings} אזהרות</span>}
          </div>
        </div>
      )}
    </aside>
  )
}
