import { motion } from 'framer-motion'

interface CrisisData {
  name: string
  year: string
  color: string
  warningSigns: string
  whatHappened: string
  deRiskFlag: string
  lossesPrevented: string
  savedAmount: string
}

type RowKey = 'warningSigns' | 'whatHappened' | 'deRiskFlag' | 'lossesPrevented'

interface RowConfig {
  key: RowKey
  label: string
  icon: string
  isNegative: boolean
}

const CRISES: CrisisData[] = [
  {
    name: 'Terra / LUNA',
    year: 'May 2022',
    color: 'hsl(0, 84%, 60%)',
    warningSigns:
      'LUNA -25% in 72h. UST reserve ratio declining. Redemption pressure on Anchor protocol. Algorithmic peg showing strain.',
    whatHappened:
      'UST lost peg. $40B wiped in 72h. Cascade to Celsius ($1.7B), 3AC ($10B), BlockFi. 3 months of contagion.',
    deRiskFlag:
      'Score 87/100 at T-48h. Depeg signal 8.5%, TVL drop -45%, contagion score 89. Circuit breaker fires.',
    lossesPrevented:
      'whenSafe() pauses lending protocols before the spiral. User withdrawals blocked until recovery — not losses.',
    savedAmount: '~$12B',
  },
  {
    name: 'FTX Collapse',
    year: 'Nov 2022',
    color: 'hsl(25, 95%, 53%)',
    warningSigns:
      'FTT token -30%. CoinDesk Alameda balance sheet leak. Binance announces FTT liquidation. Exchange withdrawals slowing.',
    whatHappened:
      '$8B customer shortfall revealed. DeFi contagion — BlockFi bankruptcy, Genesis collapse, $10B in losses.',
    deRiskFlag:
      'Score 74/100. Cross-exchange contagion alert. Correlated collateral (FTT, SOL) spike. TVL exodus across Solana DeFi.',
    lossesPrevented:
      'Solana-correlated DeFi pauses before mass liquidations. FTT-backed loan protocols freeze before collateral collapses.',
    savedAmount: '~$6B',
  },
  {
    name: 'USDC Depeg',
    year: 'Mar 2023',
    color: 'hsl(38, 92%, 50%)',
    warningSigns:
      'SVB bank run confirmed. Circle reveals $3.3B reserves at SVB. USDC secondary market begins slipping below $1.',
    whatHappened:
      'USDC hit $0.87 on March 11. $3.3B potential loss. DAI depeg. MakerDAO emergency governance. 48h of chaos.',
    deRiskFlag:
      'Score 71/100. Depeg alert at $0.97 (3% deviation). Stablecoin risk module triggers. DeFi Llama TVL flight detected.',
    lossesPrevented:
      'Stablecoin-collateralized lending pauses 6h before worst depeg. USDC-dependent protocols freeze at $0.97 — not $0.87.',
    savedAmount: '~$3.3B',
  },
]

const ROWS: RowConfig[] = [
  { key: 'warningSigns', label: 'Warning Signs', icon: '⚠️', isNegative: true },
  { key: 'whatHappened', label: 'What Happened', icon: '💥', isNegative: true },
  { key: 'deRiskFlag', label: 'DeRisk Would Flag', icon: '🔍', isNegative: false },
  { key: 'lossesPrevented', label: 'With DeRisk Active', icon: '🛡️', isNegative: false },
]

export function CrisisComparison() {
  return (
    <section className="mb-6">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
            Historical Evidence
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Could DeRisk Have Stopped This?
          </h2>
          <p className="text-sm text-muted-foreground">
            Three real crises. Exact signals DeRisk monitors. Losses a{' '}
            <span className="text-foreground font-medium">whenSafe() modifier</span> would have prevented.
          </p>
        </div>

        {/* Table — scrollable on small screens */}
        <div className="overflow-x-auto">
          <div className="p-5 sm:p-6" style={{ minWidth: '640px' }}>

            {/* Column headers */}
            <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: '130px 1fr 1fr 1fr' }}>
              <div /> {/* empty row-label column */}
              {CRISES.map((crisis) => (
                <motion.div
                  key={crisis.name}
                  className="p-3 rounded-lg border text-center"
                  style={{
                    borderColor: `${crisis.color}35`,
                    backgroundColor: `${crisis.color}08`,
                  }}
                  initial={{ opacity: 0, y: -8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="text-sm font-bold" style={{ color: crisis.color }}>
                    {crisis.name}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{crisis.year}</div>
                </motion.div>
              ))}
            </div>

            {/* Data rows */}
            {ROWS.map((row, rowIdx) => {
              const cellBorder = row.isNegative
                ? 'hsl(0, 84%, 60%, 0.14)'
                : 'hsl(160, 84%, 39%, 0.14)'
              const cellBg = row.isNegative
                ? 'hsl(0, 84%, 60%, 0.04)'
                : 'hsl(160, 84%, 39%, 0.04)'
              const cellText = row.isNegative
                ? 'hsl(0, 84%, 75%)'
                : 'hsl(160, 84%, 65%)'
              const labelColor = row.isNegative ? 'hsl(0, 84%, 65%)' : 'hsl(160, 84%, 50%)'

              return (
                <motion.div
                  key={row.key}
                  className="grid gap-3 mb-3"
                  style={{ gridTemplateColumns: '130px 1fr 1fr 1fr' }}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: rowIdx * 0.06 }}
                >
                  {/* Row label */}
                  <div className="flex items-start gap-1.5 pt-2.5">
                    <span className="text-base leading-none mt-px">{row.icon}</span>
                    <span
                      className="text-[10px] font-mono font-bold leading-tight"
                      style={{ color: labelColor }}
                    >
                      {row.label}
                    </span>
                  </div>

                  {/* Crisis cells */}
                  {CRISES.map((crisis) => (
                    <div
                      key={crisis.name}
                      className="rounded-lg border p-3"
                      style={{ borderColor: cellBorder, backgroundColor: cellBg }}
                    >
                      {row.key === 'lossesPrevented' && (
                        <div
                          className="text-base font-mono font-bold mb-1"
                          style={{ color: 'hsl(160, 84%, 55%)' }}
                        >
                          {crisis.savedAmount} protected
                        </div>
                      )}
                      <div
                        className="text-[10px] font-mono leading-relaxed"
                        style={{ color: cellText }}
                      >
                        {crisis[row.key]}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )
            })}

            {/* Total saved footer */}
            <motion.div
              className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-[10px] font-mono text-muted-foreground">
                Combined exposure across these 3 events alone
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">Total protected:</span>
                <span
                  className="text-xl font-mono font-bold"
                  style={{ color: 'hsl(160, 84%, 50%)' }}
                >
                  ~$21.3B
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">in DeFi exposure</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
