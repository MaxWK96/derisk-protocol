interface CircuitBreakerProps {
  active: boolean
  score: number
}

export function CircuitBreaker({ active, score }: CircuitBreakerProps) {
  return (
    <div
      className={`rounded-lg border p-5 text-center transition-colors ${
        active
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-border bg-card'
      }`}
    >
      <div className="mb-2 text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
        Circuit Breaker
      </div>
      <div className="flex items-center justify-center gap-3">
        <div
          className={`h-3 w-3 rounded-full ${
            active ? 'bg-destructive animate-pulse' : 'bg-derisk-success'
          }`}
        />
        <span
          className={`text-xl font-mono font-bold tracking-wider ${
            active ? 'text-destructive' : 'text-derisk-success'
          }`}
        >
          {active ? 'TRIGGERED' : 'INACTIVE'}
        </span>
      </div>
      <div className="mt-2 text-[11px] font-mono text-muted-foreground">
        Threshold: 80 | Current: <span className={active ? 'text-destructive' : 'text-foreground'}>{score}</span>
      </div>
    </div>
  )
}
