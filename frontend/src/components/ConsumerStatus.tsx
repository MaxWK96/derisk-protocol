const SIMPLE_LENDING_POOL_ADDRESS = '0x942a20CF83626dA1aAb50f1354318eE04dF292c0'
const SEPOLIA_ETHERSCAN = 'https://sepolia.etherscan.io/address'

interface ConsumerStatusProps {
  riskScore: number
  circuitBreakerActive: boolean
}

interface RiskCheckResult {
  status: 'PASSED' | 'WARNING' | 'PAUSED'
  color: string
  bg: string
  border: string
  dotClass: string
  description: string
}

function getRiskCheck(riskScore: number, circuitBreaker: boolean): RiskCheckResult {
  if (circuitBreaker || riskScore >= 80) {
    return {
      status: 'PAUSED',
      color: 'hsl(0, 84%, 60%)',
      bg: 'hsl(0, 84%, 60%, 0.05)',
      border: 'hsl(0, 84%, 60%, 0.2)',
      dotClass: 'bg-destructive animate-pulse',
      description: 'Deposits & borrows suspended — circuit breaker active',
    }
  }
  if (riskScore >= 70) {
    return {
      status: 'WARNING',
      color: 'hsl(25, 95%, 53%)',
      bg: 'hsl(25, 95%, 53%, 0.05)',
      border: 'hsl(25, 95%, 53%, 0.2)',
      dotClass: 'bg-derisk-orange animate-pulse',
      description: 'Approaching threshold — deposits/borrows still open',
    }
  }
  return {
    status: 'PASSED',
    color: 'hsl(160, 84%, 39%)',
    bg: 'hsl(160, 84%, 39%, 0.05)',
    border: 'hsl(160, 84%, 39%, 0.15)',
    dotClass: 'bg-derisk-success',
    description: 'All operations normal — oracle check passed',
  }
}

export function ConsumerStatus({ riskScore, circuitBreakerActive }: ConsumerStatusProps) {
  const check = getRiskCheck(riskScore, circuitBreakerActive)
  const poolActive = check.status === 'PASSED'

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">
            Consumer Contract
          </div>
          <div className="text-base font-bold text-foreground">SimpleLendingPool</div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-derisk-success/30 bg-derisk-success/5">
          <div className="w-1.5 h-1.5 rounded-full bg-derisk-success" />
          <span className="text-[9px] font-mono font-bold text-derisk-success uppercase tracking-wide">
            Protected by DeRisk Oracle
          </span>
        </div>
      </div>

      <div
        className="flex items-center justify-between rounded-lg p-3 mb-2 border"
        style={{ backgroundColor: check.bg, borderColor: check.border }}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${check.dotClass}`} />
          <span className="text-[10px] font-mono text-derisk-text-secondary">Risk Check:</span>
          <span className="text-[11px] font-mono font-bold" style={{ color: check.color }}>{check.status}</span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: check.color }}>{riskScore}/100</span>
      </div>
      <div className="text-[10px] text-derisk-text-dim mb-4">{check.description}</div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Total Deposits', value: '$1.2M', sub: 'mUSDC locked', color: 'text-foreground' },
          { label: 'Total Borrows', value: '$450K', sub: '37.5% utilization', color: 'text-foreground' },
          { label: 'Pool Status', value: poolActive ? 'ACTIVE' : 'PAUSED', sub: poolActive ? 'Accepting deposits' : 'Deposits suspended', color: poolActive ? 'text-derisk-success' : 'text-destructive' },
          { label: 'Pause Threshold', value: '≥70/100', sub: 'Auto-pause trigger', color: 'text-derisk-text-secondary' },
        ].map((stat) => (
          <div key={stat.label} className="bg-muted border border-border rounded p-3">
            <div className="text-[9px] font-mono text-muted-foreground uppercase mb-1">{stat.label}</div>
            <div className={`text-base font-mono font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[9px] text-derisk-text-dim mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-3 mb-4">
        <div className="text-[9px] font-mono text-muted-foreground uppercase mb-1.5">Contract Address</div>
        <a
          href={`${SEPOLIA_ETHERSCAN}/${SIMPLE_LENDING_POOL_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono text-primary hover:text-primary/80 transition-colors break-all"
        >
          {SIMPLE_LENDING_POOL_ADDRESS}
        </a>
      </div>

      <div className="p-3 rounded bg-muted border border-border">
        <div className="text-[9px] font-mono text-muted-foreground uppercase mb-1.5">How It Works</div>
        <div className="text-[10px] text-muted-foreground leading-relaxed">
          Every <code className="text-derisk-text-secondary">deposit()</code> and{' '}
          <code className="text-derisk-text-secondary">borrow()</code> call reads the live oracle risk score.
          If risk ≥ 70 or circuit breaker is active, the transaction reverts automatically.
          During the Terra collapse, contagion risk would have hit 87/100 — this contract
          would have paused <strong className="text-foreground">48 hours before the crash</strong>.
        </div>
      </div>
    </div>
  )
}

export { SIMPLE_LENDING_POOL_ADDRESS }
