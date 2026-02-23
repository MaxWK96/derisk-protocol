const ROWS = [
  {
    event: 'Terra · May 2022',
    without: '$40B wiped in 72h',
    withDR: 'Circuit breaker fires at T−36h',
    saved: '~$12B',
  },
  {
    event: 'FTX · Nov 2022',
    without: '$10B contagion across DeFi',
    withDR: 'Contagion alert flagged at T−24h',
    saved: '~$6B',
  },
  {
    event: 'USDC Depeg · Mar 2023',
    without: 'USDC crashed to $0.87',
    withDR: 'Depeg alert fired at $0.97 — 6h early',
    saved: '~$3.3B',
  },
]

const RED = 'hsl(0, 84%, 60%)'
const GREEN = 'hsl(160, 84%, 39%)'

export function BeforeAfterStrip() {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Column headers */}
      <div className="grid border-b border-border" style={{ gridTemplateColumns: '1fr 36px 1fr' }}>
        <div
          className="px-5 py-2.5 text-center border-r border-border"
          style={{ backgroundColor: `${RED}08` }}
        >
          <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color: RED }}>
            WITHOUT DERISK
          </span>
        </div>
        <div />
        <div
          className="px-5 py-2.5 text-center"
          style={{ backgroundColor: `${GREEN}08` }}
        >
          <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color: GREEN }}>
            WITH DERISK
          </span>
        </div>
      </div>

      {/* Data rows */}
      {ROWS.map((row, i) => (
        <div
          key={i}
          className="grid"
          style={{
            gridTemplateColumns: '1fr 36px 1fr',
            borderTop: i > 0 ? '1px solid hsl(215,25%,16%)' : undefined,
          }}
        >
          {/* Without */}
          <div
            className="px-5 py-4 flex items-center gap-3 border-r border-border"
            style={{ backgroundColor: `${RED}03` }}
          >
            <span className="text-lg shrink-0">💥</span>
            <div>
              <div className="text-[9px] font-mono text-muted-foreground mb-0.5">{row.event}</div>
              <div className="text-sm font-mono font-bold" style={{ color: 'hsl(0,84%,72%)' }}>
                {row.without}
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center text-muted-foreground text-xs font-mono">
            →
          </div>

          {/* With */}
          <div
            className="px-5 py-4 flex items-center gap-3"
            style={{ backgroundColor: `${GREEN}03` }}
          >
            <span className="text-lg shrink-0">🛡️</span>
            <div>
              <div className="text-[9px] font-mono font-bold mb-0.5" style={{ color: GREEN }}>
                {row.saved} protected
              </div>
              <div className="text-sm font-mono font-bold" style={{ color: 'hsl(160,84%,62%)' }}>
                {row.withDR}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Total footer */}
      <div
        className="border-t border-border px-5 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: `${GREEN}05` }}
      >
        <span className="text-[10px] font-mono text-muted-foreground">
          3 real events · backtested on Chainlink CRE
        </span>
        <span className="text-base font-mono font-bold" style={{ color: GREEN }}>
          ~$21B protected
        </span>
      </div>
    </div>
  )
}
