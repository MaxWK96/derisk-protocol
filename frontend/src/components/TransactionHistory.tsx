import type { RiskEvent } from '../lib/contract'

interface TransactionHistoryProps {
  events: RiskEvent[]
  loading: boolean
}

const getRiskColor = (score: number) => {
  if (score <= 20) return '#10b981'
  if (score <= 40) return '#f59e0b'
  if (score <= 60) return '#f97316'
  if (score <= 80) return '#ef4444'
  return '#dc2626'
}

const getRiskLabel = (score: number) => {
  if (score <= 20) return 'LOW'
  if (score <= 40) return 'MODERATE'
  if (score <= 60) return 'ELEVATED'
  if (score <= 80) return 'HIGH'
  return 'CRITICAL'
}

export function TransactionHistory({ events, loading }: TransactionHistoryProps) {
  return (
    <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-mono text-[#9ca3af] uppercase tracking-widest">
          Assessment History
        </div>
        {events.length > 0 && (
          <span className="text-[11px] font-mono text-[#6b7280]">
            {events.length} events
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-[#6b7280] text-center py-8 text-sm font-mono">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-[#1f2937] rounded">
          <div className="text-[#6b7280] text-sm font-mono mb-1">
            Event logs outside current block range
          </div>
          <div className="text-[#4b5563] text-xs font-mono">
            Live assessments reflected in dashboard above
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1f2937]">
                {['Score', 'Level', 'TVL', 'ETH/USD', 'Timestamp', 'Tx'].map((h) => (
                  <th key={h} className="pb-2 text-left text-[10px] font-mono text-[#6b7280] uppercase tracking-wider font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events
                .slice()
                .reverse()
                .slice(0, 20)
                .map((event, i) => (
                  <tr key={i} className="border-b border-[#1f2937]/50 hover:bg-[#080a0d] transition-colors">
                    <td className="py-3 font-mono font-bold" style={{ color: getRiskColor(event.score) }}>
                      {event.score}
                    </td>
                    <td className="py-3 text-xs font-mono" style={{ color: getRiskColor(event.score) }}>
                      {getRiskLabel(event.score)}
                    </td>
                    <td className="py-3 text-[#9ca3af] font-mono text-xs">
                      ${(Number(event.tvl) / 1e9).toFixed(2)}B
                    </td>
                    <td className="py-3 text-[#9ca3af] font-mono text-xs">
                      ${(Number(event.ethPrice) / 1e8).toFixed(2)}
                    </td>
                    <td className="py-3 text-[#6b7280] font-mono text-xs">
                      {event.timestamp > 0n
                        ? new Date(Number(event.timestamp) * 1000).toLocaleString()
                        : '-'}
                    </td>
                    <td className="py-3">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00b894] hover:text-[#00a29b] font-mono text-xs transition-colors"
                      >
                        {event.txHash.slice(0, 10)}...
                      </a>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
