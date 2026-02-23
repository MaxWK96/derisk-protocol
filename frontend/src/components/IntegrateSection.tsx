import { motion } from 'framer-motion'
import { DERISK_ORACLE_ADDRESS } from '../lib/contract'

const kw = (t: string) => (
  <span style={{ color: 'hsl(217, 91%, 70%)' }}>{t}</span>
)
const type_ = (t: string) => (
  <span style={{ color: 'hsl(38, 92%, 68%)' }}>{t}</span>
)
const str = (t: string) => (
  <span style={{ color: 'hsl(142, 71%, 55%)' }}>{t}</span>
)
const fn_ = (t: string) => (
  <span style={{ color: 'hsl(60, 80%, 68%)' }}>{t}</span>
)
const comment = (t: string) => (
  <span style={{ color: 'hsl(215, 20%, 48%)' }}>{t}</span>
)
const addr = (t: string) => (
  <span style={{ color: 'hsl(271, 91%, 75%)' }}>{t}</span>
)
const num = (t: string) => (
  <span style={{ color: 'hsl(25, 95%, 65%)' }}>{t}</span>
)
const dim = (t: string) => (
  <span style={{ color: 'hsl(215, 20%, 60%)' }}>{t}</span>
)

const shortAddr = `${DERISK_ORACLE_ADDRESS.slice(0, 10)}...${DERISK_ORACLE_ADDRESS.slice(-6)}`

const STEPS = [
  {
    num: 1,
    label: 'Import the interface',
    desc: 'One file — no dependencies, no API keys',
    badge: 'IDeRiskOracle.sol',
    badgeColor: 'hsl(217, 91%, 60%)',
  },
  {
    num: 2,
    label: 'Connect to the oracle',
    desc: 'Already deployed on Sepolia — free to read, permissionless',
    badge: 'Permissionless',
    badgeColor: 'hsl(160, 84%, 39%)',
  },
  {
    num: 3,
    label: 'Protect any function',
    desc: 'Add whenSafe() — your protocol auto-pauses when risk exceeds 80',
    badge: 'Circuit Breaker',
    badgeColor: 'hsl(0, 84%, 60%)',
  },
]

export function IntegrateSection() {
  return (
    <section className="mb-6">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
            Integration
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Protect Your Protocol in 3 Lines
          </h2>
          <p className="text-sm text-muted-foreground">
            Read on-chain risk scores from any Solidity contract. No backend, no API key, no trust assumptions.
          </p>
        </div>

        <div className="p-5 sm:p-6">
          {/* Step pills */}
          <div className="flex flex-wrap gap-3 mb-5">
            {STEPS.map((step) => (
              <motion.div
                key={step.num}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border"
                style={{
                  borderColor: `${step.badgeColor}25`,
                  backgroundColor: `${step.badgeColor}08`,
                }}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: step.num * 0.08 }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold shrink-0"
                  style={{ backgroundColor: step.badgeColor, color: '#000' }}
                >
                  {step.num}
                </span>
                <div>
                  <div className="text-[10px] font-mono font-bold" style={{ color: step.badgeColor }}>
                    {step.label}
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground">{step.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Code block */}
          <motion.div
            className="rounded-lg border border-border overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            {/* Code toolbar */}
            <div
              className="flex items-center justify-between px-4 py-2 border-b border-border"
              style={{ backgroundColor: 'hsl(215, 25%, 10%)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: 'hsl(38, 92%, 50%, 0.15)', color: 'hsl(38, 92%, 65%)' }}
                >
                  SOLIDITY
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">MyProtocol.sol</span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">^0.8.19</span>
            </div>

            {/* Code body */}
            <div style={{ backgroundColor: 'hsl(215, 25%, 9%)' }}>
              <pre className="px-5 py-5 text-[12px] sm:text-[13px] font-mono leading-[1.8] overflow-x-auto">
                {comment('// ── Line 1: Import the interface ─────────────────────────────────────')}{'\n'}
                {kw('import ')}{str('"./IDeRiskOracle.sol"')}{dim(';')}{'\n'}
                {'\n'}
                {comment('// ── Line 2: Connect to the deployed oracle ───────────────────────────')}{'\n'}
                {type_('IDeRiskOracle')} {dim('oracle = ')}{type_('IDeRiskOracle')}{dim('(')}{'\n'}
                {'    '}{addr(shortAddr)}{'\n'}
                {dim(');')}{'\n'}
                {'\n'}
                {comment('// ── Line 3: Add the modifier — auto-pauses when risk > 80 ───────────')}{'\n'}
                {kw('modifier ')}{fn_('whenSafe')}{dim('() \u007b')}{'\n'}
                {'    '}{kw('require')}{dim('(')}{'\n'}
                {'        '}{dim('oracle.')}{fn_('riskScore')}{dim('() < ')}{num('80')}{dim(', ')}{str('"Risk too high"')}{'\n'}
                {'    '}{dim(');')}{'\n'}
                {'    '}{kw('require')}{dim('(')}{'\n'}
                {'        '}{dim('!')}{dim('oracle.')}{fn_('circuitBreakerActive')}{dim('(), ')}{str('"Breaker active"')}{'\n'}
                {'    '}{dim(');')}{'\n'}
                {'    '}{dim('_;')}{'\n'}
                {dim('\u007d')}{'\n'}
                {'\n'}
                {comment('// ── Apply to any function — done ─────────────────────────────────────')}{'\n'}
                {kw('function ')}{fn_('deposit')}{dim('(')}{type_('uint256')} {dim('amount) ')}{kw('external ')}{fn_('whenSafe')}{dim(' \u007b')}{'\n'}
                {'    '}{comment('// your logic here — safe to run, risk is within bounds')}{'\n'}
                {dim('\u007d')}
              </pre>
            </div>

            {/* Footer bar */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-border"
              style={{ backgroundColor: 'hsl(215, 25%, 10%)' }}
            >
              <div className="flex flex-wrap gap-4 text-[9px] font-mono">
                <span className="text-muted-foreground">
                  Oracle:{' '}
                  <a
                    href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-primary"
                    style={{ color: 'hsl(271, 91%, 75%)' }}
                  >
                    {shortAddr}
                  </a>
                </span>
                <span className="text-muted-foreground">Sepolia Testnet</span>
                <span className="text-muted-foreground">Read-only · No gas</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono" style={{ color: 'hsl(160, 84%, 50%)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block animate-pulse" />
                Live on-chain
              </div>
            </div>
          </motion.div>

          {/* Benefits row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {[
              { icon: '⛓️', title: 'Fully On-Chain', desc: 'Risk scores written to Sepolia every 15 min. Read from any contract, free.', color: 'hsl(217, 91%, 60%)' },
              { icon: '🤖', title: 'Multi-AI Consensus', desc: 'Claude + rule-based + contagion model. Weighted median, outlier-resistant.', color: 'hsl(271, 91%, 65%)' },
              { icon: '⚡', title: 'Zero Config', desc: 'No API keys, no off-chain dependencies, no trust assumptions. Just Solidity.', color: 'hsl(160, 84%, 39%)' },
            ].map((item) => (
              <motion.div
                key={item.title}
                className="rounded-lg border border-border p-4"
                style={{ backgroundColor: `${item.color}06` }}
                whileHover={{ borderColor: `${item.color}40`, backgroundColor: `${item.color}10` }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-xl mb-2">{item.icon}</div>
                <div className="text-[11px] font-bold text-foreground mb-1">{item.title}</div>
                <div className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
