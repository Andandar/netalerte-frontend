import type { ReactNode } from 'react'

export type KpiColor = 'blue' | 'green' | 'red'

interface KpiCardProps {
  label: string
  value: string | number
  color: KpiColor
  icon: ReactNode
}

const COLOR_CLASSES: Record<KpiColor, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  green: { bg: 'bg-green-100', text: 'text-green-600' },
  red: { bg: 'bg-red-100', text: 'text-red-600' },
}

export default function KpiCard({ label, value, color, icon }: KpiCardProps) {
  const colorClasses = COLOR_CLASSES[color]

  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${colorClasses.bg} ${colorClasses.text}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}
