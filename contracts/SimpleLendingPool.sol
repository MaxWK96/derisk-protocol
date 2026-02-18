// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title MockERC20 - Minimal ERC20 for testing
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public constant decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
}

/// @title IDeRiskOracle - Minimal interface for reading risk data
interface IDeRiskOracle {
    function riskScore() external view returns (uint256);
    function circuitBreakerActive() external view returns (bool);
    function contagionRiskScore() external view returns (uint256);
}

/// @title SimpleLendingPool
/// @notice Example DeFi lending protocol using DeRisk Oracle for auto-pause protection.
/// @dev Demonstrates: "If deployed before Terra collapse (May 2022), this contract would have
///      automatically paused deposits/borrows 48 hours before the crash, protecting user funds."
/// @custom:hackathon Chainlink Convergence Hackathon 2026
contract SimpleLendingPool {

    // ========== State ==========

    IDeRiskOracle public immutable oracle;
    MockERC20 public immutable token;

    address public owner;

    /// @notice Total deposits in the pool (token units)
    uint256 public totalDeposits;

    /// @notice Total borrows outstanding (token units)
    uint256 public totalBorrows;

    /// @notice Per-user deposit balances
    mapping(address => uint256) public deposits;

    /// @notice Per-user borrow balances
    mapping(address => uint256) public borrows;

    /// @notice Emergency pause flag set by owner or checkRiskAndPause()
    bool public emergencyPaused;

    /// @notice Timestamp of the last emergency pause
    uint256 public pausedAt;

    /// @notice Address that triggered the last pause
    address public pausedBy;

    // ========== Constants ==========

    /// @notice Risk score threshold above which deposits/borrows are blocked
    uint256 public constant SAFE_RISK_THRESHOLD = 70;

    /// @notice Risk score at which anyone can trigger an emergency pause
    uint256 public constant PAUSE_RISK_THRESHOLD = 80;

    /// @notice Collateral ratio: borrowers need 200% collateral (2x overcollateralized)
    uint256 public constant COLLATERAL_RATIO = 200;

    // ========== Events ==========

    event Deposited(address indexed user, uint256 amount, uint256 totalDeposits);
    event Borrowed(address indexed user, uint256 amount, uint256 collateral, uint256 totalBorrows);
    event Repaid(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event EmergencyPause(address indexed triggeredBy, uint256 riskScore, uint256 timestamp);
    event Unpaused(address indexed owner, uint256 timestamp);

    // ========== Constructor ==========

    /// @param _oracle Address of the deployed DeRiskOracle
    /// @param _token  Address of the ERC20 token used for deposits/borrows
    constructor(address _oracle, address _token) {
        require(_oracle != address(0), "Zero oracle address");
        require(_token != address(0), "Zero token address");
        oracle = IDeRiskOracle(_oracle);
        token = MockERC20(_token);
        owner = msg.sender;
    }

    // ========== Modifiers ==========

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @notice Guards any state-changing operation.
    /// Blocks if:
    ///   - Oracle risk score >= SAFE_RISK_THRESHOLD (70)
    ///   - Circuit breaker is active on the oracle
    ///   - Emergency pause is active on this pool
    modifier whenSafe() {
        uint256 currentRisk = oracle.riskScore();
        require(!emergencyPaused,               "Pool: emergency paused");
        require(!oracle.circuitBreakerActive(), "Pool: circuit breaker active");
        require(currentRisk < SAFE_RISK_THRESHOLD, "Pool: risk score too high");
        _;
    }

    // ========== Core Functions ==========

    /// @notice Deposit tokens into the lending pool.
    /// @dev Protected by whenSafe - reverts if systemic risk is elevated.
    ///      Illustrates: if risk had been monitored during Terra collapse,
    ///      this would have rejected new deposits 48h before the crash.
    /// @param amount Token amount to deposit (in token decimals)
    function deposit(uint256 amount) external whenSafe {
        require(amount > 0, "Amount must be > 0");
        token.transferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        totalDeposits += amount;
        emit Deposited(msg.sender, amount, totalDeposits);
    }

    /// @notice Borrow tokens from the pool against deposited collateral.
    /// @dev Requires 200% collateral ratio. Protected by whenSafe.
    /// @param amount Token amount to borrow
    function borrow(uint256 amount) external whenSafe {
        require(amount > 0, "Amount must be > 0");

        // 200% collateral: user must have deposited at least 2x what they borrow
        uint256 requiredCollateral = (amount * COLLATERAL_RATIO) / 100;
        uint256 availableCollateral = deposits[msg.sender];
        require(availableCollateral >= requiredCollateral, "Insufficient collateral (200% required)");

        // Ensure pool has enough liquidity
        uint256 poolLiquidity = totalDeposits - totalBorrows;
        require(poolLiquidity >= amount, "Insufficient pool liquidity");

        borrows[msg.sender] += amount;
        totalBorrows += amount;
        token.transfer(msg.sender, amount);
        emit Borrowed(msg.sender, amount, availableCollateral, totalBorrows);
    }

    /// @notice Repay outstanding borrow (no risk check - repayments always allowed).
    /// @param amount Amount to repay
    function repay(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(borrows[msg.sender] >= amount, "Repay exceeds borrow");
        token.transferFrom(msg.sender, address(this), amount);
        borrows[msg.sender] -= amount;
        totalBorrows -= amount;
        emit Repaid(msg.sender, amount);
    }

    /// @notice Withdraw deposited tokens (allowed even during pause for exits).
    /// @param amount Amount to withdraw
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(deposits[msg.sender] >= amount, "Insufficient deposits");

        // Ensure withdraw does not break collateral on outstanding borrows
        uint256 newDeposit = deposits[msg.sender] - amount;
        uint256 requiredCollateral = (borrows[msg.sender] * COLLATERAL_RATIO) / 100;
        require(newDeposit >= requiredCollateral, "Would break collateral ratio");

        // Ensure liquidity
        uint256 available = totalDeposits - totalBorrows;
        require(available >= amount, "Insufficient liquidity");

        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        token.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // ========== Risk Management ==========

    /// @notice Anyone can call this to trigger an emergency pause if oracle risk >= 80.
    /// @dev This is the key demo function: replicates what would have happened pre-Terra.
    ///      During Terra collapse, UST risk would have hit >= 80 two days before the crash.
    ///      Calling this would have locked new deposits/borrows, protecting users.
    function checkRiskAndPause() external {
        uint256 currentRisk = oracle.riskScore();
        bool breakerActive = oracle.circuitBreakerActive();

        require(
            currentRisk >= PAUSE_RISK_THRESHOLD || breakerActive,
            "Risk below pause threshold"
        );
        require(!emergencyPaused, "Already paused");

        emergencyPaused = true;
        pausedAt = block.timestamp;
        pausedBy = msg.sender;

        emit EmergencyPause(msg.sender, currentRisk, block.timestamp);
    }

    /// @notice Owner-only: manually trigger emergency pause (e.g., off-chain alert).
    function emergencyPause() external onlyOwner {
        require(!emergencyPaused, "Already paused");
        emergencyPaused = true;
        pausedAt = block.timestamp;
        pausedBy = msg.sender;
        emit EmergencyPause(msg.sender, oracle.riskScore(), block.timestamp);
    }

    /// @notice Owner-only: unpause after risk has normalized.
    function unpause() external onlyOwner {
        require(emergencyPaused, "Not paused");

        // Safety check: cannot unpause while risk is still critical
        uint256 currentRisk = oracle.riskScore();
        require(currentRisk < SAFE_RISK_THRESHOLD, "Risk still elevated");
        require(!oracle.circuitBreakerActive(), "Circuit breaker still active");

        emergencyPaused = false;
        emit Unpaused(msg.sender, block.timestamp);
    }

    // ========== View Functions ==========

    /// @notice Returns current risk state from the oracle and pool pause status.
    /// @return riskScore      Current aggregate risk score (0-100)
    /// @return breakerActive  Whether the DeRisk circuit breaker is triggered
    /// @return poolPaused     Whether this pool's emergency pause is active
    /// @return riskLevel      Human-readable risk level string
    function getCurrentRisk()
        external
        view
        returns (
            uint256 riskScore,
            bool breakerActive,
            bool poolPaused,
            string memory riskLevel
        )
    {
        riskScore = oracle.riskScore();
        breakerActive = oracle.circuitBreakerActive();
        poolPaused = emergencyPaused;

        if (riskScore <= 20) {
            riskLevel = "LOW";
        } else if (riskScore <= 40) {
            riskLevel = "MODERATE";
        } else if (riskScore <= 60) {
            riskLevel = "ELEVATED";
        } else if (riskScore <= 80) {
            riskLevel = "HIGH";
        } else {
            riskLevel = "CRITICAL";
        }
    }

    /// @notice Returns pool-level liquidity stats.
    function getPoolStats()
        external
        view
        returns (
            uint256 _totalDeposits,
            uint256 _totalBorrows,
            uint256 _availableLiquidity,
            uint256 _utilizationRate
        )
    {
        _totalDeposits = totalDeposits;
        _totalBorrows = totalBorrows;
        _availableLiquidity = totalDeposits > totalBorrows ? totalDeposits - totalBorrows : 0;
        _utilizationRate = totalDeposits > 0 ? (totalBorrows * 100) / totalDeposits : 0;
    }

    /// @notice Returns the deposited and borrowed amounts for a given user.
    function getUserPosition(address user)
        external
        view
        returns (uint256 deposited, uint256 borrowed, uint256 borrowingCapacity)
    {
        deposited = deposits[user];
        borrowed = borrows[user];
        // Max additional borrow given current collateral and outstanding borrows
        uint256 maxBorrow = deposited * 100 / COLLATERAL_RATIO;
        borrowingCapacity = maxBorrow > borrowed ? maxBorrow - borrowed : 0;
    }
}
