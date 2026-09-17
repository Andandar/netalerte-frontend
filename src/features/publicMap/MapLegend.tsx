import { OPERATORS, OPERATOR_FILL } from './constants'
import type { PublicOperator } from './types'

interface MapLegendProps {
  values: Record<PublicOperator, number>
  selectedOperator: PublicOperator | null
  onSelect: (operator: PublicOperator | null) => void
}

export default function MapLegend({ values, selectedOperator, onSelect }: MapLegendProps) {
  return (
    <div
      className="absolute top-2.5 right-2.5 z-[1000] flex min-w-[120px] flex-col gap-1 rounded-lg border p-2"
      style={{ background: 'rgba(255,255,255,0.95)', borderColor: '#DCE3E8', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
    >
      <p className="m-0 mb-0.5 text-[10px] font-medium" style={{ color: '#898781' }}>
        Par operateur
      </p>
      {OPERATORS.map((operator) => {
        const active = selectedOperator === operator
        const dimmed = selectedOperator !== null && !active
        return (
          <button
            key={operator}
            type="button"
            onClick={() => onSelect(active ? null : operator)}
            className="flex w-full items-center gap-1.5 rounded-md border-0 px-1 py-0.5 text-left"
            style={{ background: active ? '#E6F1FB' : 'transparent', opacity: dimmed ? 0.4 : 1, fontFamily: 'inherit' }}
          >
            <span className="h-[9px] w-[9px] flex-none rounded-[3px]" style={{ background: OPERATOR_FILL[operator] }} />
            <span className="flex-1 text-[11px]" style={{ color: '#1A2530' }}>
              {operator}
            </span>
            <span className="text-[11px] font-semibold" style={{ color: '#1A2530' }}>
              {values[operator]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
