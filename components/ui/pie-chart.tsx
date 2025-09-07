import React from 'react'

type Slice = {
  label: string
  value: number
  color?: string
}

type PieChartProps = {
  data: Slice[]
  size?: number
  innerRadius?: number // 0..1, fraction of radius for donut hole
}

const defaultColors = [
  '#4f46e5', // indigo
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4',
]

export default function PieChart({ data, size = 220, innerRadius = 0.5 }: PieChartProps) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0)
  const radius = size / 2
  const center = radius

  let cumulative = 0

  const slices = data.map((d, i) => {
    const value = Math.max(0, d.value)
    const start = (cumulative / total) * Math.PI * 2
    cumulative += value
    const end = (cumulative / total) * Math.PI * 2
    const largeArc = end - start > Math.PI ? 1 : 0
    const r = radius
    const x1 = center + r * Math.cos(start - Math.PI / 2)
    const y1 = center + r * Math.sin(start - Math.PI / 2)
    const x2 = center + r * Math.cos(end - Math.PI / 2)
    const y2 = center + r * Math.sin(end - Math.PI / 2)
    const path = `M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
    const color = d.color || defaultColors[i % defaultColors.length]
    return { path, color, label: d.label, value }
  })

  const hole = innerRadius > 0 ? radius * innerRadius : 0

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        <g>
          {total === 0 ? (
            // empty circle
            <circle cx={center} cy={center} r={radius * 0.9} fill="#f3f4f6" />
          ) : (
            slices.map((s, idx) => (
              <path key={idx} d={s.path} fill={s.color} stroke="#fff" strokeWidth={1} />
            ))
          )}
          {hole > 0 && total > 0 && <circle cx={center} cy={center} r={hole} fill="#fff" />}
        </g>
      </svg>

      <div className="flex flex-col text-base">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <span style={{ background: d.color || defaultColors[i % defaultColors.length] }} className="w-4 h-4 rounded-sm block" />
            <div className="text-gray-700">
              <div className="font-medium text-lg">{d.label}</div>
              <div className="text-sm text-gray-500">{d.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
