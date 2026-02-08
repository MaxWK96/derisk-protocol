/**
 * DeRisk Protocol - Run Historical Backtests
 *
 * Usage:
 *   npx ts-node run-backtest.ts              # Run all backtests
 *   npx ts-node run-backtest.ts terra-luna    # Run specific event
 *   npx ts-node run-backtest.ts ftx
 *   npx ts-node run-backtest.ts euler
 *   npx ts-node run-backtest.ts curve
 */

import {
	runAllBacktests,
	backtestTerraLuna,
	backtestFTX,
	backtestEuler,
	backtestCurve,
	formatBacktestResult,
	formatBacktestReport,
} from './lib/historical-backtester'

const event = process.argv[2] || 'all'

if (event === 'all') {
	const report = runAllBacktests()

	// Print individual results
	for (const result of report.results) {
		console.log(formatBacktestResult(result))
		console.log('')
	}

	// Print summary report
	console.log(formatBacktestReport(report))
} else {
	const backtestFn = {
		'terra-luna': backtestTerraLuna,
		'ftx': backtestFTX,
		'euler': backtestEuler,
		'curve': backtestCurve,
	}[event]

	if (!backtestFn) {
		console.error(`Unknown event: ${event}`)
		console.log('Available events: terra-luna, ftx, euler, curve, all')
		process.exit(1)
	}

	const result = backtestFn()
	console.log(formatBacktestResult(result))
}
