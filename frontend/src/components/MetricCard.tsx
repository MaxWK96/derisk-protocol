interface MetricCardProps {
  label: string
  value: string
  sub?: string
  icon: string
}

export function MetricCard({ label, value, sub, icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5">
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
        <span>{icon}</span>
        <span className="uppercase tracking-wider text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}
