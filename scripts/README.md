# Mangrove Kandel Scripts

This directory contains utility scripts for interacting with the Mangrove protocol and managing Kandel positions.

## Scripts Overview

### Core Scripts

1. **mint-tokens.ts** - Mint test WETH and USDC tokens for testing
   ```bash
   bun run mint
   ```

2. **create-kandel.ts** - Create a new Kandel position using `populate()` method
   ```bash
   bun run create-kandel
   ```
   - Uses the `populate()` method for precise control
   - Creates exactly the number of offers specified
   - Maintains clear separation between bids and asks

3. **view-orderbook.ts** - View the current order book (bids and asks)
   ```bash
   bun run view-book
   ```

### Kandel Management Scripts

4. **list-kandels.ts** - List all deployed Kandel positions
   ```bash
   bun run list-kandels
   ```

5. **manage-kandel.ts** - Manage Kandel positions (retract offers, update status)
   ```bash
   bun run manage-kandel
   ```

### Supporting Files

- **shared-contracts.ts** - Loads deployed contract addresses
- **shared.ts** - Shared client and configuration
- **helpers.ts** - Utility functions for common operations
- **kandel-manager.ts** - Kandel selection and management utilities
- **check-provision.ts** - Check provision requirements for offers

## Kandel Creation Method

The **populate()** method provides:
- **Precise Control**: You specify exact distribution structure
- **Predictable Output**: Creates exactly the number of offers you request
- **Clear Separation**: Maintains intentional gap between bids and asks
- **Best For**: Standard market making with predictable spreads

## Address Management

All contract addresses are stored in:
- `/src/contracts.json` - Core protocol contracts (Mangrove, Reader, Seeder, tokens)
- `/src/kandels.json` - Deployed Kandel positions with metadata

When you run `bun run deploy-contracts`, it will:
1. Deploy fresh contracts
2. Save addresses to contracts.json
3. Clear the kandels.json file (since old Kandels won't work with new contracts)

## Typical Workflow

1. Deploy contracts: `bun run deploy-contracts`
2. Mint tokens: `bun run mint`
3. Create a Kandel position: `bun run create-kandel`
4. View the order book: `bun run view-book`
5. List all Kandels: `bun run list-kandels`
6. Manage Kandels: `bun run manage-kandel`

## Price Display

The order book correctly displays:
- **Ask prices**: Direct calculation from tick values
- **Bid prices**: Same tick calculation (Kandel uses consistent tick representation)
- **Spread**: Difference between best bid and best ask