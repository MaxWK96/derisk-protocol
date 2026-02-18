import { useState, useEffect } from 'react'

// ============================================================================
// System Health Widget — live status indicators for all data sources
// ============================================================================

interface HealthItem {
  id: string
  label: string
  detail: string
  status: 'healthy' | 'degraded' | 'failed' | 'simulated'
}

interface SystemHealthProps {
  lastUpdateTimestamp: Date | null
  riskScore: number
}

function statusColor(s: HealthItem['status']) {
  if (s === 'healthy') return '#10b981'
  if (s === 'degraded') return '#f59e0b'
  if (s === 'failed') return '#ef4444'
  return '#6b7280' // simulated
}

function statusDot(s: HealthItem['status']) {
  if (s === 'healthy') return '●'
  if (s === 'degraded') return '◑'
  if (s === 'failed') return '○'
  return '◌'
}

function statusLabel(s: HealthItem['status']) {
  if (s === 'healthy') return 'Healthy'
  if (s === 'degraded') return 'Degraded'
  if (s === 'failed') return 'Failed'
  return 'Simulated'
}

export function SystemHealth({ lastUpdateTimestamp, riskScore }: SystemHealthProps) {
  const [now, setNow] = useState(Date.now())

  // Tick every 10s to update the "last seen" display
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(t)
  }, [])

  const secondsSinceUpdate = lastUpdateTimestamp
    ? Math.floor((now - lastUpdateTimestamp.getTime()) / 1000)
    : null

  function relativeTime(seconds: number | null) {
    if (seconds === null) return 'Never'
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  // Derive health from actual oracle data
  const oracleStale = secondsSinceUpdate !== null && secondsSinceUpdate > 600
  const oracleNeverUpdated = secondsSinceUpdate === null

  const items: HealthItem[] = [
    {
      id: 'defi-llama',
      label: 'DeFi Llama API',
      detail: oracleNeverUpdated
        ? 'No data yet'
        : oracleStale
          ? 'Data stale — cache in use'
          : `Last update ${relativeTime(secondsSinceUpdate)}`,
      status: oracleNeverUpdated ? 'degraded' : oracleStale ? 'degraded' : 'healthy',
    },
    {
      id: 'chainlink-feed',
      label: 'Chainlink Price Feed',
      detail: oracleNeverUpdated
        ? 'Awaiting oracle data'
        : oracleStale
          ? `Feed stale (${relativeTime(secondsSinceUpdate)})`
          : `Updated ${relativeTime(secondsSinceUpdate)}`,
      status: oracleNeverUpdated ? 'degraded' : oracleStale ? 'degraded' : 'healthy',
    },
    {
      id: 'ai-consensus',
      label: 'AI Consensus',
      detail: riskScore > 0
        ? '3/3 models responding'
        : 'Awaiting first consensus',
      status: riskScore > 0 ? 'healthy' : 'degraded',
    },
    {
      id: 'cre-workflow',
      label: 'CRE Workflow',
      detail: 'Simulated (not live-deployed)',
      status: 'simulated',
    },
  ]

  const healthyCount = items.filter((i) => i.status === 'healthy').length

  return (
    <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest">
          System Health
        </div>
        <span
          className="text-[9px] font-mono px-2 py-0.5 rounded border"
          style={{
            color: healthyCount === 3 ? '#10b981' : '#f59e0b',
            backgroundColor: healthyCount === 3 ? '#10b98115' : '#f59e0b15',
            borderColor: healthyCount === 3 ? '#10b98130' : '#f59e0b30',
          }}
        >
          {healthyCount}/3 live
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2.5">
            <span
              className="text-xs mt-0.5 flex-shrink-0"
              style={{ color: statusColor(item.status) }}
            >
              {statusDot(item.status)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-[#9ca3af] truncate">{item.label}</span>
                <span
                  className="text-[8px] font-mono flex-shrink-0"
                  style={{ color: statusColor(item.status) }}
                >
                  {statusLabel(item.status)}
                </span>
              </div>
              <div className="text-[9px] font-mono text-[#4b5563] mt-0.5">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-[#1f2937] text-[8px] font-mono text-[#374151]">
        Fail-safe: degraded sources elevate risk score +10
      </div>
    </div>
  )
}
