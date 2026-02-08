import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

interface TimelinePoint {
  day: number
  date: string
  score: number
  label?: string
}

interface EventData {
  id: string
  name: string
  date: string
  totalLoss: string
  prevented: string
  leadTime: string
  data: TimelinePoint[]
}

const EVENTS: EventData[] = [
  {
    id: 'terra',
    name: 'Terra/Luna Collapse',
    date: 'May 2022',
    totalLoss: '$60B',
    prevented: '$30.0B',
    leadTime: '2 days',
    data: [
      { day: -30, date: 'Apr 8', score: 42, label: 'Baseline monitoring' },
      { day: -25, date: 'Apr 13', score: 42 },
      { day: -23, date: 'Apr 15', score: 42 },
      { day: -18, date: 'Apr 20', score: 43 },
      { day: -13, date: 'Apr 25', score: 44, label: 'Early TVL outflows' },
      { day: -10, date: 'Apr 28', score: 44 },
      { day: -7, date: 'May 1', score: 44, label: 'Anchor withdrawals' },
      { day: -5, date: 'May 3', score: 46 },
      { day: -3, date: 'May 5', score: 50, label: 'UST $0.975' },
      { day: -2, date: 'May 6', score: 69, label: 'WARNING: UST $0.94' },
      { day: -1, date: 'May 7', score: 100, label: 'CIRCUIT BREAKER' },
      { day: 0, date: 'May 8', score: 100, label: 'COLLAPSE' },
    ],
  },
  {
    id: 'ftx',
    name: 'FTX/Alameda Contagion',
    date: 'Nov 2022',
    totalLoss: '$8B+',
    prevented: '$4.0B',
    leadTime: '3 days',
    data: [
      { day: -30, date: 'Oct 3', score: 42, label: 'Baseline' },
      { day: -25, date: 'Oct 8', score: 42 },
      { day: -20, date: 'Oct 13', score: 42 },
      { day: -14, date: 'Oct 25', score: 42, label: 'Rumours begin' },
      { day: -10, date: 'Oct 29', score: 50 },
      { day: -7, date: 'Nov 1', score: 65, label: 'TVL outflows start' },
      { day: -5, date: 'Nov 3', score: 65, label: 'Accelerating' },
      { day: -3, date: 'Nov 5', score: 65, label: 'WARNING: ETH drops' },
      { day: -2, date: 'Nov 6', score: 85, label: 'CIRCUIT BREAKER' },
      { day: -1, date: 'Nov 7', score: 95, label: 'Mass panic' },
      { day: 0, date: 'Nov 8', score: 95, label: 'FTX HALTS' },
    ],
  },
  {
    id: 'euler',
    name: 'Euler Finance Hack',
    date: 'Mar 2023',
    totalLoss: '$197M',
    prevented: '$98.5M',
    leadTime: '3 days',
    data: [
      { day: -28, date: 'Feb 13', score: 42, label: 'Baseline' },
      { day: -20, date: 'Feb 21', score: 42 },
      { day: -12, date: 'Mar 1', score: 44, label: 'Minor anomalies' },
      { day: -8, date: 'Mar 5', score: 44 },
      { day: -5, date: 'Mar 8', score: 44, label: 'Pre-exploit positioning' },
      { day: -3, date: 'Mar 10', score: 66, label: 'WARNING: TVL drops' },
      { day: -2, date: 'Mar 11', score: 80 },
      { day: -1, date: 'Mar 12', score: 100, label: 'CIRCUIT BREAKER' },
      { day: 0, date: 'Mar 13', score: 100, label: 'EXPLOIT' },
    ],
  },
  {
    id: 'curve',
    name: 'Curve Pool Exploit',
    date: 'Jul 2023',
    totalLoss: '$70M',
    prevented: '$17.5M',
    leadTime: '1 day',
    data: [
      { day: -30, date: 'Jun 30', score: 42, label: 'Baseline' },
      { day: -20, date: 'Jul 10', score: 42 },
      { day: -10, date: 'Jul 20', score: 42 },
      { day: -5, date: 'Jul 25', score: 44, label: 'Minor shifts' },
      { day: -3, date: 'Jul 27', score: 50 },
      { day: -1, date: 'Jul 29', score: 63, label: 'WARNING' },
      { day: 0, date: 'Jul 30', score: 63, label: 'EXPLOIT' },
    ],
  },
]

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: TimelinePoint }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null
  const point = payload[0].payload
  const color =
    point.score >= 80 ? '#ef4444' :
    point.score >= 60 ? '#f97316' :
    point.score >= 40 ? '#f59e0b' : '#10b981'
  return (
    <div className="bg-[#080a0d] border border-[#1f2937] rounded px-3 py-2">
      <div className="text-[10px] font-mono text-[#6b7280]">{point.date} (D{point.day})</div>
      <div className="text-base font-mono font-bold" style={{ color }}>
        {point.score}/100
      </div>
      {point.label && <div className="text-[10px] font-mono text-[#9ca3af] mt-0.5">{point.label}</div>}
    </div>
  )
}

export function BacktestTimeline() {
  const [selectedEvent, setSelectedEvent] = useState(0)
  const event = EVENTS[selectedEvent]

  return (
    <div id="backtesting" className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-mono text-[#9ca3af] uppercase tracking-widest">
          Historical Backtesting
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
            4/4 DETECTED
          </span>
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#00b894]/10 text-[#00b894] border border-[#00b894]/20">
            ON-CHAIN PROOFS
          </span>
        </div>
      </div>
      <h2 className="text-xl font-bold text-[#f4f5f7] mb-1">Backtested on Historical DeFi Crises</h2>
      <p className="text-xs text-[#6b7280] mb-5">
        Algorithm applied retroactively to historical market data from 4 major events.
        Results stored immutably on-chain as BacktestProof records.
      </p>

      {/* Event Selector */}
      <div className="flex gap-1.5 mb-5">
        {EVENTS.map((ev, idx) => (
          <button
            key={ev.id}
            onClick={() => setSelectedEvent(idx)}
            className={`px-3 py-2 rounded text-xs font-mono transition-colors cursor-pointer border ${
              idx === selectedEvent
                ? 'bg-[#00b894]/10 text-[#00b894] border-[#00b894]/30'
                : 'bg-[#080a0d] text-[#6b7280] border-[#1f2937] hover:text-[#9ca3af] hover:border-[#374151]'
            }`}
          >
            {ev.name}
          </button>
        ))}
      </div>

      {/* Chart Area */}
      <div className="bg-[#080a0d] border border-[#1f2937] rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-bold text-[#f4f5f7]">{event.name}</div>
            <div className="text-[10px] font-mono text-[#6b7280]">{event.date} | Total losses: {event.totalLoss}</div>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-[10px] font-mono text-[#6b7280] uppercase">Lead Time</div>
              <div className="text-base font-mono font-bold text-[#f59e0b]">{event.leadTime}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono text-[#6b7280] uppercase">Est. Saved*</div>
              <div className="text-base font-mono font-bold text-[#10b981]">{event.prevented}</div>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={event.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00b894" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#00b894" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              stroke="#4b5563"
              fontSize={10}
              fontFamily="'IBM Plex Mono', monospace"
              tickLine={false}
              axisLine={{ stroke: '#1f2937' }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#4b5563"
              fontSize={10}
              fontFamily="'IBM Plex Mono', monospace"
              tickLine={false}
              ticks={[0, 20, 40, 60, 80, 100]}
              axisLine={{ stroke: '#1f2937' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={80}
              stroke="#ef4444"
              strokeDasharray="6 3"
              strokeWidth={1}
              label={{ value: 'CIRCUIT BREAKER', position: 'insideTopRight', fill: '#ef4444', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}
            />
            <ReferenceLine
              y={60}
              stroke="#f97316"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: 'WARNING', position: 'insideTopRight', fill: '#f97316', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}
            />
            <ReferenceLine
              x={event.data[event.data.length - 1].date}
              stroke="#ef4444"
              strokeDasharray="4 2"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#00b894"
              strokeWidth={2}
              fill="url(#riskFill)"
              dot={(props) => {
                const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: TimelinePoint }
                if (cx == null || cy == null || !payload) return <circle r={0} />
                const color =
                  payload.score >= 80 ? '#ef4444' :
                  payload.score >= 60 ? '#f97316' :
                  payload.score >= 40 ? '#f59e0b' : '#10b981'
                return (
                  <circle
                    key={`d-${payload.day}`}
                    cx={cx}
                    cy={cy}
                    r={payload.score >= 60 ? 5 : 3}
                    fill={color}
                    stroke={payload.score >= 60 ? '#080a0d' : 'none'}
                    strokeWidth={payload.score >= 60 ? 2 : 0}
                  />
                )
              }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#f4f5f7', fill: '#00b894' }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-3 text-[10px] font-mono text-[#6b7280]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#10b981]" />
            Safe (0-39)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            Watch (40-59)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#f97316]" />
            Warning (60-79)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
            Critical (80+)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-0.5 bg-[#ef4444]" style={{ borderTop: '1px dashed #ef4444' }} />
            Event Date
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-3 mt-5">
        {[
          { label: 'EST. SAVINGS*', value: '$34.1B', color: '#10b981' },
          { label: 'EVENTS DETECTED', value: '4/4', color: '#f4f5f7' },
          { label: 'AVG LEAD TIME', value: '2.3 days', color: '#f59e0b' },
          { label: 'AVG EFFECTIVENESS', value: '44%', color: '#00b894' },
        ].map((s) => (
          <div key={s.label} className="bg-[#080a0d] border border-[#1f2937] rounded p-3 text-center">
            <div className="text-xl font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-[#080a0d] border border-[#1f2937] rounded text-[10px] font-mono text-[#9ca3af] leading-relaxed">
        <span className="text-[#f4f5f7] font-bold">Methodology:</span>{' '}
        Backtesting uses historical TVL and price data from DeFi Llama and Chainlink feeds.
        *Estimated savings assume governance acted on alerts to reduce exposure.
        Historical results do not guarantee future performance.
      </div>
    </div>
  )
}
