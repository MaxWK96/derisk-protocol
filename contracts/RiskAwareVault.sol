// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title MockERC20Minimal - Minimal ERC20 interface for vault asset
interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title IDeRiskOracle - Interface for reading DeRisk risk data
interface IDeRiskOracleVault {
    function riskScore() external view returns (uint256);
    function circuitBreakerActive() external view returns (bool);
    function contagionRiskScore() external view returns (uint256);
}

/// @title RiskAwareVault
/// @notice Example yield vault that dynamically adjusts max LTV based on systemic DeFi risk.
/// @dev Demonstrates composability — a different use case from SimpleLendingPool (circuit-breaker
///      pause). Instead of binary pause, this vault *continuously* adjusts risk parameters,
///      showing that DeRisk can serve as a real-time risk dial, not just an emergency switch.
/// @custom:hackathon Chainlink Convergence Hackathon 2026
contract RiskAwareVault {

    // ========== State ==========

    IDeRiskOracleVault public immutable deRiskOracle;
    IERC20Minimal public immutable asset;

    address public owner;
    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;

    // ========== Constants ==========

    /// @notice Base LTV in basis points: 75.00%
    uint256 public constant BASE_LTV_BPS = 7500;

    /// @notice Minimum LTV in basis points: 40.00% (critical risk conditions)
    uint256 public constant MIN_LTV_BPS = 4000;

    /// @notice LTV reduction per risk point above zero (in basis points)
    /// Derivation: at risk=80, LTV should be MIN_LTV_BPS
    /// => (BASE_LTV_BPS - MIN_LTV_BPS) / 80 = 3500/80 = 43.75 bps/point
    /// We store as fixed-point (/100): 4375
    uint256 public constant LTV_REDUCTION_PER_RISK = 4375; // divide by 1000 to get bps

    // ========== Events ==========

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event LTVSnapshot(address indexed caller, uint256 riskScore, uint256 maxLtvBps);

    // ========== Constructor ==========

    constructor(address _deRiskOracle, address _asset) {
        require(_deRiskOracle != address(0), "Zero oracle address");
        require(_asset != address(0), "Zero asset address");
        deRiskOracle = IDeRiskOracleVault(_deRiskOracle);
        asset = IERC20Minimal(_asset);
        owner = msg.sender;
    }

    // ========== Modifiers ==========

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ========== Core: Dynamic LTV ==========

    /// @notice Get current maximum LTV based on live systemic risk score.
    /// @dev LTV decreases linearly as risk increases:
    ///   risk = 0  → LTV = 75.00%
    ///   risk = 40 → LTV = 57.50%
    ///   risk = 80 → LTV = 40.00%  (floor)
    ///   risk > 80 → LTV = 40.00%  (circuit breaker territory)
    /// @return maxLtvBps Maximum LTV in basis points (e.g. 7500 = 75.00%)
    function getCurrentMaxLTV() public view returns (uint256 maxLtvBps) {
        uint256 risk = deRiskOracle.riskScore();

        if (risk >= 80) {
            return MIN_LTV_BPS;
        }

        // Linear decrease: bps reduction = risk * LTV_REDUCTION_PER_RISK / 1000
        uint256 reduction = (risk * LTV_REDUCTION_PER_RISK) / 1000;
        return BASE_LTV_BPS - reduction;
    }

    /// @notice Check whether vault is in a leverage-reduction regime.
    /// @return reduce     true when current LTV is below base (risk > 0)
    /// @return currentLtv current max LTV in basis points
    /// @return baseLtv    baseline LTV (risk = 0) in basis points
    function shouldReduceLeverage()
        external
        view
        returns (bool reduce, uint256 currentLtv, uint256 baseLtv)
    {
        currentLtv = getCurrentMaxLTV();
        baseLtv = BASE_LTV_BPS;
        reduce = currentLtv < BASE_LTV_BPS;
    }

    /// @notice Get a human-readable risk tier label and recommended action.
    function getRiskTier()
        external
        view
        returns (string memory tier, string memory action, uint256 maxLtvBps)
    {
        uint256 risk = deRiskOracle.riskScore();
        maxLtvBps = getCurrentMaxLTV();

        if (risk <= 20) {
            return ("LOW", "Normal operations - 75% LTV", maxLtvBps);
        } else if (risk <= 40) {
            return ("MODERATE", "Reduce new positions - ~66% LTV", maxLtvBps);
        } else if (risk <= 60) {
            return ("ELEVATED", "Conservative mode - ~57% LTV", maxLtvBps);
        } else if (risk <= 80) {
            return ("HIGH", "Minimum LTV - consider deleveraging", maxLtvBps);
        } else {
            return ("CRITICAL", "Circuit breaker zone - 40% LTV floor", maxLtvBps);
        }
    }

    // ========== Vault Operations ==========

    /// @notice Deposit assets into the vault.
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(!deRiskOracle.circuitBreakerActive(), "Vault: circuit breaker active");

        asset.transferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        totalDeposits += amount;

        emit Deposited(msg.sender, amount);
        emit LTVSnapshot(msg.sender, deRiskOracle.riskScore(), getCurrentMaxLTV());
    }

    /// @notice Withdraw assets from the vault.
    function withdraw(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "Insufficient balance");

        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        asset.transfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    // ========== View Helpers ==========

    /// @notice Return current oracle risk score for convenience.
    function currentRisk() external view returns (uint256) {
        return deRiskOracle.riskScore();
    }

    /// @notice Return current contagion score.
    function currentContagion() external view returns (uint256) {
        return deRiskOracle.contagionRiskScore();
    }

    /// @notice Owner can transfer ownership.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
