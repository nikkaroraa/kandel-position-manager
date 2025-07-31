# Mangrove & Kandel Implementation Report

## Understanding Mangrove & Kandel

### Mangrove Core Mechanics

Mangrove's key innovation is lazy liquidity - offers are promises to trade, not locked tokens:

- **Offers**: "I'll sell 1 WETH at $4000" - no upfront deposit required
- **Provisions**: ETH collateral covering gas if offer fails - proof you're serious

When someone takes an offer, Mangrove calls your contract requesting tokens. Can't deliver? You lose provision to compensate the taker. This on-demand execution enables capital efficiency that traditional AMMs can't match.

### Kandel Strategy

Kandel implements grid trading on Mangrove:

1. **Grid**: Places orders above and below current price

   - ETH at $3900: sells at $3950, $4000, $4050 / buys at $3850, $3800, $3750

2. **Reposting**: After selling ETH at $4000:

   - Uses received USDC to place buy at $3800
   - Captures $200 spread when executed

3. **Profit Model**: Makes money from volatility, not direction - buy low, sell high, repeat

## APR Calculation Design

Kandel returns come from spread capture, not yield. Here's how to measure performance:

### Token Inventory Tracking

Track actual token changes, not USD values:

```
Initial: 10 WETH, 40,000 USDC
After 30 days: 10.5 WETH, 38,000 USDC

WETH Return = 5%
USDC Return = -5%
```

### Combined Performance

Use geometric mean for balanced view:

```
Combined = √(1.05 × 0.95) = -0.13%
```

Shows net loss despite WETH gains - sold too cheap.

### Spread-Based Metrics

Track completed cycles:

- Buy 0.1 WETH @ $3800 = -$380 USDC
- Sell 0.1 WETH @ $4000 = +$400 USDC
- Profit = $20 per cycle

```
APR = (Daily Spread Earnings / Position Value) × 365
```

### Implementation

Position data structure:

```solidity
struct KandelMetrics {
    uint256 totalSpreadEarned;    // cumulative usdc from spreads
    uint256 completedRoundTrips;  // full buy-sell cycles
    uint256 positionAge;          // blocks since deployment
    uint256 initialWeth;          // starting balance
    uint256 initialUsdc;
    uint256 currentWeth;          // current balance
    uint256 currentUsdc;
}
```

Calculate both metrics:

- **Inventory APR**: Token balance changes over time
- **Spread APR**: Earnings from completed trades

### Why This Approach

- Separates strategy performance from price movements
- Shows if spread capture justifies impermanent loss
- Helps users understand actual returns vs holding
- Provides clear metrics for strategy optimization

Users need both views - inventory changes show IL impact, spread earnings show strategy effectiveness.
