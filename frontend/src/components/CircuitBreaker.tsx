interface CircuitBreakerProps {
  active: boolean
  score: number
}

export function CircuitBreaker({ active, score }: CircuitBreakerProps) {
  return (
    <div
      className={`rounded-lg border p-5 text-center transition-colors ${
        active
          ? 'border-[#ef4444] bg-[#ef4444]/5'
          : 'border-[#1f2937] bg-[#0d1117]'
      }`}
    >
      <div className="mb-2 text-[11px] font-mono text-[#9ca3af] uppercase tracking-widest">
        Circuit Breaker
      </div>
      <div className="flex items-center justify-center gap-3">
        <div
          className={`h-3 w-3 rounded-full ${
            active ? 'bg-[#ef4444] animate-pulse' : 'bg-[#10b981]'
          }`}
        />
        <span
          className={`text-xl font-mono font-bold tracking-wider ${
            active ? 'text-[#ef4444]' : 'text-[#10b981]'
          }`}
        >
          {active ? 'TRIGGERED' : 'INACTIVE'}
        </span>
      </div>
      <div className="mt-2 text-[11px] font-mono text-[#6b7280]">
        Threshold: 80 | Current: <span className={active ? 'text-[#ef4444]' : 'text-[#f4f5f7]'}>{score}</span>
      </div>
    </div>
  )
}
