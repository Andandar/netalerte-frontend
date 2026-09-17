import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { OPERATORS, OPERATOR_CHART_BG, OPERATOR_STROKE } from './constants'
import type { PublicOperator } from './types'

const TEXT_MUTED = '#898781'
const GRID_COLOR = '#e1e0d9'

interface TrendChartProps {
  labels: string[]
  series: Record<PublicOperator, number[]>
}

export default function TrendChart({ labels, series }: TrendChartProps) {
  const data = useMemo(
    () => labels.map((label, index) => ({ name: label, ...Object.fromEntries(OPERATORS.map((op) => [op, series[op][index]])) })),
    [labels, series],
  )

  return (
    <div className="panel flex h-[150px] flex-col rounded-[10px] border bg-white p-2" style={{ borderColor: '#DCE3E8' }}>
      <p className="m-0 mb-1 flex-none text-[11px]" style={{ color: TEXT_MUTED }}>
        Evolution
      </p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: TEXT_MUTED }} />
            <YAxis tick={{ fontSize: 9, fill: TEXT_MUTED }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 9, color: '#52514e' }} iconSize={8} verticalAlign="top" align="right" />
            {OPERATORS.map((operator) => (
              <Area
                key={operator}
                type="monotone"
                dataKey={operator}
                name={operator}
                stackId="1"
                stroke={OPERATOR_STROKE[operator]}
                fill={OPERATOR_CHART_BG[operator]}
                strokeWidth={1.5}
                dot={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
