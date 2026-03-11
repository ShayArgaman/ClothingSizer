import { Group, Rect, Text, Line } from 'react-konva'
import type { WardrobeElement } from '../../types/wardrobe.types'
import { cmToPx, formatCm, PX_PER_CM, GRID_CM, snapCm } from '../../utils/dimensions'

interface Props {
  element: WardrobeElement
  isSelected: boolean
  onSelect: () => void
  onChange: (updates: Partial<WardrobeElement>) => void
}

const EH = 10    // handle thin axis px
const EL = 28    // handle long axis px
const HIT = 14   // extra hit area (hitStrokeWidth) for touch

function ElementShape({ element }: { element: WardrobeElement; isSelected: boolean }) {
  const w = cmToPx(element.width)
  const h = cmToPx(element.height)

  switch (element.type) {
    case 'shelf':
      return (
        <>
          <Rect width={w} height={h} fill={element.color} cornerRadius={2} />
          {Array.from({ length: Math.floor(w / 20) }).map((_, i) => (
            <Line key={i} points={[(i + 1) * 20, 1, (i + 1) * 20, h - 1]}
              stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
          ))}
        </>
      )
    case 'hanging-rail':
      return (
        <>
          <Rect width={w} height={h} fill="rgba(148,163,184,0.08)"
            stroke={element.color} strokeWidth={1} cornerRadius={4} />
          <Rect x={4} y={6} width={w - 8} height={4} fill={element.color} cornerRadius={2} />
          {Array.from({ length: Math.min(10, Math.floor(w / 22)) }).map((_, i) => {
            const hx = 10 + i * 22
            return (
              <Group key={i} x={hx} y={10}>
                <Line points={[0, 0, 0, 18]} stroke="rgba(148,163,184,0.55)" strokeWidth={1.5} />
                <Line points={[-7, 18, 7, 18, 0, 8]} stroke="rgba(148,163,184,0.55)" strokeWidth={1.5} closed />
              </Group>
            )
          })}
        </>
      )
    case 'drawer':
      return (
        <>
          <Rect width={w} height={h} fill={element.color} cornerRadius={3} />
          <Rect x={4} y={3} width={w - 8} height={h - 6} fill="rgba(0,0,0,0.07)" cornerRadius={2} />
          <Rect x={w / 2 - 16} y={h / 2 - 3} width={32} height={6} fill="rgba(0,0,0,0.22)" cornerRadius={3} />
        </>
      )
    case 'shoe-rack':
      return (
        <>
          <Rect width={w} height={h} fill={element.color} cornerRadius={3} />
          {Array.from({ length: Math.floor(w / 16) }).map((_, i) => (
            <Line key={i} points={[(i + 1) * 16, 0, (i + 1) * 16 - 5, h]}
              stroke="rgba(0,0,0,0.14)" strokeWidth={1.5} />
          ))}
        </>
      )
    case 'corner-unit':
      return (
        <>
          <Rect width={w} height={h} fill={element.color} cornerRadius={4} />
          <Line points={[0, h, w, 0]} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
        </>
      )
    default:
      return <Rect width={w} height={h} fill={element.color} />
  }
}

export default function WardrobeElementNode({ element, isSelected, onSelect, onChange }: Props) {
  const x = cmToPx(element.x)
  const y = cmToPx(element.y)
  const w = cmToPx(element.width)
  const h = cmToPx(element.height)

  const handleDragEnd = (e: { target: { x: () => number; y: () => number } }) => {
    const rawXcm = Math.round(e.target.x() / PX_PER_CM / GRID_CM) * GRID_CM
    const rawYcm = Math.max(0, Math.round(e.target.y() / PX_PER_CM / GRID_CM) * GRID_CM)
    onChange({ x: rawXcm, y: rawYcm })
  }

  return (
    <Group x={x} y={y} draggable onClick={onSelect} onTap={onSelect} onDragEnd={handleDragEnd}>
      <ElementShape element={element} isSelected={isSelected} />

      {isSelected && (
        <Rect width={w} height={h} stroke="#60a5fa" strokeWidth={2}
          fill="transparent" cornerRadius={3} dash={[4, 3]} />
      )}

      {/* Width dimension */}
      <Line points={[0, -9, w, -9]} stroke="#60a5fa" strokeWidth={0.7} opacity={0.5} />
      <Line points={[0, -13, 0, -5]} stroke="#60a5fa" strokeWidth={0.7} opacity={0.5} />
      <Line points={[w, -13, w, -5]} stroke="#60a5fa" strokeWidth={0.7} opacity={0.5} />
      <Text text={formatCm(element.width)} x={w / 2 - 14} y={-19}
        fontSize={9} fill="#93c5fd" fontStyle="bold" />

      {/* Height dimension */}
      {element.height >= 15 && (
        <>
          <Line points={[w + 7, 0, w + 7, h]} stroke="#60a5fa" strokeWidth={0.7} opacity={0.4} />
          <Line points={[w + 4, 0, w + 10, 0]} stroke="#60a5fa" strokeWidth={0.7} opacity={0.4} />
          <Line points={[w + 4, h, w + 10, h]} stroke="#60a5fa" strokeWidth={0.7} opacity={0.4} />
          <Text text={formatCm(element.height)} x={w + 12} y={h / 2 - 6}
            fontSize={9} fill="#93c5fd" fontStyle="bold" rotation={90} />
        </>
      )}

      <Text text={element.label} x={4} y={4} fontSize={8} fill="rgba(255,255,255,0.45)" />

      {isSelected && (
        <>
          {/* BOTTOM edge */}
          <Rect x={w / 2 - EL / 2} y={h - EH / 2} width={EL} height={EH}
            fill="#60a5fa" cornerRadius={3} hitStrokeWidth={HIT}
            draggable
            onDragMove={(e) => {
              e.cancelBubble = true
              const newH = Math.max(cmToPx(5), e.target.y() + EH / 2)
              const newHcm = Math.round(newH / PX_PER_CM / GRID_CM) * GRID_CM
              onChange({ height: newHcm })
              e.target.x(cmToPx(element.width) / 2 - EL / 2)
              e.target.y(cmToPx(newHcm) - EH / 2)
            }}
          />

          {/* TOP edge — snap on dragEnd */}
          <Rect x={w / 2 - EL / 2} y={-EH / 2} width={EL} height={EH}
            fill="#60a5fa" cornerRadius={3} hitStrokeWidth={HIT}
            draggable
            onDragEnd={(e) => {
              e.cancelBubble = true
              const centerDeltaPx = e.target.y() + EH / 2
              const deltaYcm = centerDeltaPx / PX_PER_CM
              const newYcm = Math.max(0, snapCm(element.y + deltaYcm))
              const actualDelta = newYcm - element.y
              const newHeightCm = element.height - actualDelta
              if (newHeightCm >= 5) onChange({ y: newYcm, height: newHeightCm })
              e.target.x(cmToPx(element.width) / 2 - EL / 2)
              e.target.y(-EH / 2)
            }}
          />
        </>
      )}
    </Group>
  )
}
