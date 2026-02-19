export function riskColor(s: number) {
  if (s <= 20) return 'hsl(160, 84%, 39%)'
  if (s <= 40) return 'hsl(38, 92%, 50%)'
  if (s <= 60) return 'hsl(25, 95%, 53%)'
  if (s <= 80) return 'hsl(0, 84%, 60%)'
  return 'hsl(0, 72%, 51%)'
}

export function riskLabel(s: number) {
  if (s <= 20) return 'LOW'
  if (s <= 40) return 'MODERATE'
  if (s <= 60) return 'ELEVATED'
  if (s <= 80) return 'HIGH'
  return 'CRITICAL'
}

export function getRiskLevel(score: number) {
  if (score <= 20) return { label: 'LOW', color: 'hsl(160, 84%, 39%)', bg: 'hsl(160, 84%, 39%, 0.07)', border: 'hsl(160, 84%, 39%, 0.19)' }
  if (score <= 40) return { label: 'MODERATE', color: 'hsl(38, 92%, 50%)', bg: 'hsl(38, 92%, 50%, 0.07)', border: 'hsl(38, 92%, 50%, 0.19)' }
  if (score <= 60) return { label: 'ELEVATED', color: 'hsl(25, 95%, 53%)', bg: 'hsl(25, 95%, 53%, 0.07)', border: 'hsl(25, 95%, 53%, 0.19)' }
  if (score <= 80) return { label: 'HIGH', color: 'hsl(0, 84%, 60%)', bg: 'hsl(0, 84%, 60%, 0.07)', border: 'hsl(0, 84%, 60%, 0.19)' }
  return { label: 'CRITICAL', color: 'hsl(0, 72%, 51%)', bg: 'hsl(0, 72%, 51%, 0.07)', border: 'hsl(0, 72%, 51%, 0.19)' }
}
