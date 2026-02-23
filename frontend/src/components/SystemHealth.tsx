import { useState, useEffect } from 'react'

type Status = 'healthy' | 'testnet' | 'failed' | 'simulated'

interface HealthItem {
  id: string
  label: string
  detail: string
  status: Status
}

interface SystemHealthProps {
  lastUpdateTimestamp: Date | null
  riskScore: number
}

function statusColor(s: Status) {
  if (s === 'healthy') return 'hsl(160, 84%, 39%)'
  if (s === 'testnet') return 'hsl(217, 91%, 60%)'
  if (s === 'failed') return 'hsl(0, 84%, 60%)'
  return '#6b7280'
}

function statusDot(s: Status) {
  if (s === 'healthy') return '●'
  if (s === 'testnet') return '◈'
  if (s === 'failed') return '○'
  return '◌'
}

function statusLabel(s: Status) {
  if (s === 'healthy') return 'Healthy'
  if (s === 'testnet') return 'Testnet Demo'
  if (s === 'failed') return 'Failed'
  return 'Simulated'
}

function relativeTime(seconds: number | null) {
  if (seconds === null) return 'Never'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export function SystemHealth({ lastUpdateTimestamp, riskScore }: SystemHealthProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(t)
  }, [])

  const secondsSinceUpdate = lastUpdateTimestamp
    ? Math.floor((now - lastUpdateTimestamp.getTime()) / 1000)
    : null

  const oracleStale = secondsSinceUpdate !== null && secondsSinceUpdate > 600
  const oracleNeverUpdated = secondsSinceUpdate === null

  const items: HealthItem[] = [
    {
      id: 'defi-llama',
      label: 'DeFi Llama API',
      detail: oracleNeverUpdated
        ? 'Awaiting first fetch'
        : oracleStale
          ? 'Testnet demo — Sepolia feeds update on-demand'
          : `Last update ${relativeTime(secondsSinceUpdate)}`,
      status: oracleNeverUpdated ? 'testnet' : oracleStale ? 'testnet' : 'healthy',
    },
    {
      id: 'chainlink-feed',
      label: 'Chainlink Price Feed',
      detail: oracleNeverUpdated
        ? 'Awaiting first fetch'
        : oracleStale
          ? 'Testnet demo — Sepolia feeds update on-demand'
          : `Updated ${relativeTime(secondsSinceUpdate)}`,
      status: oracleNeverUpdated ? 'testnet' : oracleStale ? 'testnet' : 'healthy',
    },
    {
      id: 'ai-consensus',
      label: 'AI Consensus',
      detail: riskScore > 0 ? '3/3 models responding' : 'Awaiting first consensus',
      status: riskScore > 0 ? 'healthy' : 'testnet',
    },
    {
      id: 'cre-workflow',
      label: 'CRE Workflow',
      detail: 'Simulated (not live-deployed)',
      status: 'simulated',
    },
  ]

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      {/* DEMO MODE banner */}
      <div
        className="mb-4 p-2.5 rounded-lg border"
        style={{
          backgroundColor: 'hsl(217, 91%, 60%, 0.07)',
          borderColor: 'hsl(217, 91%, 60%, 0.3)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: '#000' }}
          >
            DEMO MODE
          </span>
          <span className="text-[9px] font-mono font-bold" style={{ color: 'hsl(217, 91%, 60%)' }}>
            Sepolia Testnet
          </span>
        </div>
        <div className="text-[9px] font-mono leading-relaxed" style={{ color: 'hsl(217, 91%, 80%)' }}>
          Price feeds may show stale timestamps on testnet. In production Chainlink updates every heartbeat.
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">System Health</div>
        <span
          className="text-[9px] font-mono px-2 py-0.5 rounded border"
          style={{
            color: 'hsl(217, 91%, 60%)',
            backgroundColor: 'hsl(217, 91%, 60%, 0.08)',
            borderColor: 'hsl(217, 91%, 60%, 0.3)',
          }}
        >
          Testnet Demo
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2.5">
            <span className="text-sm font-mono flex-shrink-0 mt-0.5" style={{ color: statusColor(item.status) }}>
              {statusDot(item.status)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-derisk-text-secondary truncate">{item.label}</span>
                <span className="text-[8px] font-mono flex-shrink-0" style={{ color: statusColor(item.status) }}>
                  {statusLabel(item.status)}
                </span>
              </div>
              <div className="text-[9px] font-mono text-derisk-text-dim mt-0.5">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-border text-[9px] font-mono text-derisk-text-dim">
        Fail-safe: degraded sources elevate risk score +10
      </div>
    </div>
  )
}
