// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title DeRisk Protocol - AI-Powered Multi-Protocol DeFi Risk Oracle
/// @notice Receives AI-generated risk assessments from Chainlink CRE,
///         monitors 3 DeFi protocols, and manages circuit breakers
/// @dev Implements IReceiver (CRE), AutomationCompatibleInterface (Chainlink Automation)
/// @custom:hackathon Chainlink Convergence Hackathon 2026
contract DeRiskOracle {
    // ========== State Variables ==========

    // Aggregate risk
    uint256 public riskScore;
    bool public circuitBreakerActive;

    // DeFi metrics
    uint256 public tvl;
    uint256 public utilizationRate;
    uint256 public ethPrice;

    // Oracle metadata
    uint256 public lastUpdateTimestamp;
    uint256 public updateCount;

    // Per-protocol risk scores (0-100 each)
    uint256 public aaveRiskScore;
    uint256 public compoundRiskScore;
    uint256 public makerRiskScore;

    // Per-protocol TVLs
    uint256 public aaveTvl;
    uint256 public compoundTvl;
    uint256 public makerTvl;

    // Cross-protocol contagion analysis
    uint256 public contagionRiskScore;     // 0-100: systemic cascade risk
    uint256 public worstCaseSystemLoss;    // USD: worst-case cascade loss
    uint256 public contagionLastUpdated;

    // Historical backtest proofs (immutable record of algorithm effectiveness)
    struct BacktestProof {
        string eventName;
        uint256 alertLeadTimeHours;
        uint256 peakRiskScore;
        uint256 actualLossesUsd;
        uint256 preventedLossesUsd;
        uint256 effectivenessPercent;
    }

    BacktestProof[] public backtestResults;

    // Owner for admin functions
    address public owner;

    // ========== Constants ==========

    uint256 public constant CIRCUIT_BREAKER_THRESHOLD = 80;
    uint256 public constant STALENESS_THRESHOLD = 600;   // 10 minutes
    uint256 public constant UPDATE_INTERVAL = 300;       // 5 minutes

    // Protocol weights for weighted average (out of 100)
    // Aave dominates TVL so gets highest weight
    uint256 public constant AAVE_WEIGHT = 50;
    uint256 public constant COMPOUND_WEIGHT = 25;
    uint256 public constant MAKER_WEIGHT = 25;

    // ========== Events ==========

    event RiskScoreUpdated(
        uint256 indexed score,
        uint256 tvl,
        uint256 ethPrice,
        uint256 timestamp
    );
    event ProtocolScoresUpdated(
        uint256 aaveScore,
        uint256 compoundScore,
        uint256 makerScore,
        uint256 aggregateScore,
        uint256 timestamp
    );
    event CircuitBreakerTriggered(uint256 score, uint256 timestamp);
    event CircuitBreakerReset(uint256 score, uint256 timestamp);
    event StalenessAlert(uint256 lastUpdate, uint256 currentTime);
    event ContagionScoreUpdated(
        uint256 contagionScore,
        uint256 worstCaseLoss,
        uint256 timestamp
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ========== Constructor ==========

    constructor() {
        owner = msg.sender;
    }

    // ========== Modifiers ==========

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ========== CRE Receiver Interface ==========

    /// @notice Called by CRE writeReport - receives the consensus report
    function onReport(bytes calldata /* metadata */, bytes calldata report) external {
        // CRE reports include a 4-byte function selector prefix
        bytes calldata payload = report.length > 4 ? report[4:] : report;
        (
            uint256 _riskScore,
            uint256 _tvl,
            uint256 _utilizationRate,
            uint256 _ethPrice
        ) = abi.decode(payload, (uint256, uint256, uint256, uint256));
        _updateRiskData(_riskScore, _tvl, _utilizationRate, _ethPrice);
    }

    /// @notice Direct update function for CRE workflow and testing
    function updateRiskData(
        uint256 _riskScore,
        uint256 _tvl,
        uint256 _utilizationRate,
        uint256 _ethPrice
    ) external {
        _updateRiskData(_riskScore, _tvl, _utilizationRate, _ethPrice);
    }

    /// @notice Update per-protocol risk scores and TVLs
    /// @dev Computes weighted aggregate score automatically
    function updateProtocolScores(
        uint256 _aaveScore,
        uint256 _compoundScore,
        uint256 _makerScore
    ) external {
        require(_aaveScore <= 100 && _compoundScore <= 100 && _makerScore <= 100, "Scores must be 0-100");

        aaveRiskScore = _aaveScore;
        compoundRiskScore = _compoundScore;
        makerRiskScore = _makerScore;

        // Weighted average aggregate score
        uint256 aggregate = (
            _aaveScore * AAVE_WEIGHT +
            _compoundScore * COMPOUND_WEIGHT +
            _makerScore * MAKER_WEIGHT
        ) / 100;

        emit ProtocolScoresUpdated(
            _aaveScore, _compoundScore, _makerScore,
            aggregate, block.timestamp
        );
    }

    /// @notice Update per-protocol TVLs (called by CRE workflow)
    function updateProtocolTvls(
        uint256 _aaveTvl,
        uint256 _compoundTvl,
        uint256 _makerTvl
    ) external {
        aaveTvl = _aaveTvl;
        compoundTvl = _compoundTvl;
        makerTvl = _makerTvl;
        tvl = _aaveTvl + _compoundTvl + _makerTvl;
    }

    /// @notice Update cross-protocol contagion analysis results
    function updateContagionScore(
        uint256 _contagionScore,
        uint256 _worstCaseLoss
    ) external {
        require(_contagionScore <= 100, "Score must be 0-100");
        contagionRiskScore = _contagionScore;
        worstCaseSystemLoss = _worstCaseLoss;
        contagionLastUpdated = block.timestamp;
        emit ContagionScoreUpdated(_contagionScore, _worstCaseLoss, block.timestamp);
    }

    // ========== Chainlink Automation Interface ==========

    /// @notice Called by Chainlink Automation to check if upkeep is needed
    /// @dev Returns true if oracle data is stale (no update in STALENESS_THRESHOLD)
    /// @return upkeepNeeded true if oracle data is stale and needs attention
    /// @return performData encoded staleness info for performUpkeep
    function checkUpkeep(bytes calldata)
        external
        view
        returns (bool upkeepNeeded, bytes memory performData)
    {
        bool dataIsStale = lastUpdateTimestamp > 0 &&
            (block.timestamp - lastUpdateTimestamp) > STALENESS_THRESHOLD;
        upkeepNeeded = dataIsStale;
        performData = abi.encode(lastUpdateTimestamp, block.timestamp);
    }

    /// @notice Called by Chainlink Automation when upkeep is needed
    /// @dev Re-validates staleness to prevent manipulation, auto-escalates risk
    function performUpkeep(bytes calldata /* performData */) external {
        // Re-validate staleness on-chain (prevent stale performData replay)
        require(
            lastUpdateTimestamp > 0 &&
            (block.timestamp - lastUpdateTimestamp) > STALENESS_THRESHOLD,
            "Not stale"
        );

        emit StalenessAlert(lastUpdateTimestamp, block.timestamp);

        // Auto-escalate risk score if oracle is stale
        if (riskScore < 60) {
            riskScore = 60; // Elevate to at least ELEVATED
            emit RiskScoreUpdated(60, tvl, ethPrice, block.timestamp);
        }

        // Trigger circuit breaker if risk is already high and data is stale
        if (riskScore > CIRCUIT_BREAKER_THRESHOLD && !circuitBreakerActive) {
            circuitBreakerActive = true;
            emit CircuitBreakerTriggered(riskScore, block.timestamp);
        }
    }

    // ========== Admin Functions ==========

    /// @notice Transfer ownership to a new address
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Emergency: manually trigger circuit breaker
    function emergencyCircuitBreaker(bool _active) external onlyOwner {
        circuitBreakerActive = _active;
        if (_active) {
            emit CircuitBreakerTriggered(riskScore, block.timestamp);
        } else {
            emit CircuitBreakerReset(riskScore, block.timestamp);
        }
    }

    // ========== Backtest Proofs ==========

    /// @notice Submit a backtest proof (owner only, immutable record)
    function submitBacktestProof(
        string calldata _eventName,
        uint256 _alertLeadTimeHours,
        uint256 _peakRiskScore,
        uint256 _actualLossesUsd,
        uint256 _preventedLossesUsd,
        uint256 _effectivenessPercent
    ) external onlyOwner {
        backtestResults.push(BacktestProof({
            eventName: _eventName,
            alertLeadTimeHours: _alertLeadTimeHours,
            peakRiskScore: _peakRiskScore,
            actualLossesUsd: _actualLossesUsd,
            preventedLossesUsd: _preventedLossesUsd,
            effectivenessPercent: _effectivenessPercent
        }));
    }

    /// @notice Get number of backtest proofs stored
    function getBacktestCount() external view returns (uint256) {
        return backtestResults.length;
    }

    // ========== Internal Logic ==========

    function _updateRiskData(
        uint256 _riskScore,
        uint256 _tvl,
        uint256 _utilizationRate,
        uint256 _ethPrice
    ) internal {
        require(_riskScore <= 100, "Risk score must be 0-100");

        riskScore = _riskScore;
        tvl = _tvl;
        utilizationRate = _utilizationRate;
        ethPrice = _ethPrice;
        lastUpdateTimestamp = block.timestamp;
        updateCount++;

        emit RiskScoreUpdated(_riskScore, _tvl, _ethPrice, block.timestamp);

        // Circuit breaker logic
        if (_riskScore > CIRCUIT_BREAKER_THRESHOLD && !circuitBreakerActive) {
            circuitBreakerActive = true;
            emit CircuitBreakerTriggered(_riskScore, block.timestamp);
        } else if (_riskScore <= CIRCUIT_BREAKER_THRESHOLD && circuitBreakerActive) {
            circuitBreakerActive = false;
            emit CircuitBreakerReset(_riskScore, block.timestamp);
        }
    }

    // ========== View Functions ==========

    /// @notice Get complete risk assessment data in a single call
    function getRiskData()
        external
        view
        returns (
            uint256 _riskScore,
            bool _circuitBreakerActive,
            uint256 _tvl,
            uint256 _utilizationRate,
            uint256 _ethPrice,
            uint256 _lastUpdateTimestamp,
            uint256 _updateCount
        )
    {
        return (
            riskScore,
            circuitBreakerActive,
            tvl,
            utilizationRate,
            ethPrice,
            lastUpdateTimestamp,
            updateCount
        );
    }

    /// @notice Get per-protocol risk breakdown
    function getProtocolScores()
        external
        view
        returns (uint256 _aave, uint256 _compound, uint256 _maker)
    {
        return (aaveRiskScore, compoundRiskScore, makerRiskScore);
    }

    /// @notice Get per-protocol TVL breakdown
    function getProtocolTvls()
        external
        view
        returns (uint256 _aaveTvl, uint256 _compoundTvl, uint256 _makerTvl)
    {
        return (aaveTvl, compoundTvl, makerTvl);
    }

    /// @notice Compute weighted aggregate from per-protocol scores
    function getAggregateScore() external view returns (uint256) {
        return (
            aaveRiskScore * AAVE_WEIGHT +
            compoundRiskScore * COMPOUND_WEIGHT +
            makerRiskScore * MAKER_WEIGHT
        ) / 100;
    }

    /// @notice Check if oracle data is stale (no update in STALENESS_THRESHOLD)
    function isStale() external view returns (bool) {
        return lastUpdateTimestamp > 0 &&
            (block.timestamp - lastUpdateTimestamp) > STALENESS_THRESHOLD;
    }

    /// @notice Check if a new update is needed (UPDATE_INTERVAL elapsed)
    function needsUpdate() external view returns (bool) {
        if (lastUpdateTimestamp == 0) return true;
        return (block.timestamp - lastUpdateTimestamp) > UPDATE_INTERVAL;
    }

    /// @notice Seconds since last update
    function timeSinceUpdate() external view returns (uint256) {
        if (lastUpdateTimestamp == 0) return type(uint256).max;
        return block.timestamp - lastUpdateTimestamp;
    }

    /// @notice Get contagion analysis data
    function getContagionData()
        external
        view
        returns (
            uint256 _contagionScore,
            uint256 _worstCaseLoss,
            uint256 _lastUpdated
        )
    {
        return (contagionRiskScore, worstCaseSystemLoss, contagionLastUpdated);
    }

    /// @notice ERC-165 interface detection
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7; // ERC-165
    }
}
