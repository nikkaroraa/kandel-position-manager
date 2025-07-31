# Kandel Position Manager - Setup Guide

This guide walks you through setting up and running the Kandel Position Manager locally.

## Prerequisites

- [Bun](https://bun.sh) installed
- [MetaMask](https://metamask.io) or another Web3 wallet
- Node.js 18+ (for some dependencies)

## Step 1: Install Dependencies

```bash
bun install
```

## Step 2: Deploy Contracts & Start Anvil

Run the deployment script which will:
- Start a local Anvil blockchain instance on port 8545
- Deploy all required contracts (Mangrove, KandelSeeder, WETH, USDC)
- Keep Anvil running for your local development

```bash
bun run deploy-contracts
```

**Important**: Keep this terminal window open! Anvil needs to stay running.

You'll see output showing:
- The test account address and private key
- Deployed contract addresses
- Instructions for using the private key

## Step 3: Get the Test Account Private Key

Look for this section in the deployment output:

```
🔑 Anvil Test Account (First Account):
=====================================
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0x...
=====================================
```

Copy the private key - you'll need it in the next step.

## Step 4: Import Test Account to MetaMask

1. Open MetaMask
2. Click the account icon → "Import Account"
3. Select "Private Key" as the type
4. Paste the private key from Step 3
5. Click "Import"

## Step 5: Add Anvil Network to MetaMask

Add a custom network with these settings:

- **Network Name**: Anvil Local
- **RPC URL**: http://localhost:8545
- **Chain ID**: 31337
- **Currency Symbol**: ETH

Then switch to this network in MetaMask.

## Step 6: Mint Test Tokens

With Anvil still running, open a new terminal and mint tokens to your test account:

```bash
bun run mint
```

This will mint:
- 100 WETH
- 400,000 USDC

To your connected wallet address.

## Step 7: Start the Frontend

In another terminal window, start the development server:

```bash
bun run dev
```

Open http://localhost:3000 in your browser.

## Step 8: Connect Wallet & Start Trading

1. Click "Connect Wallet" in the app
2. Select the imported test account
3. Make sure you're on the Anvil network
4. You're ready to deploy Kandel positions!

## Using the Application

### Deploy a Position
1. Go to "Deploy New Position" tab
2. Set your price range (e.g., Min: $3,600, Max: $4,200)
3. Choose number of price points (e.g., 10)
4. Enter token amounts to deposit
5. Click "Deploy Position"

### Manage Positions
1. Switch to "Active Positions" tab
2. View your deployed Kandels
3. Monitor performance and inventory
4. Withdraw funds when ready

## Troubleshooting

### "Cannot connect to Anvil"
- Make sure `bun run deploy-contracts` is still running
- Check that MetaMask is connected to `http://localhost:8545`

### "Insufficient balance"
- Run `bun run mint` to get test tokens
- Make sure you imported the correct private key

### "Transaction failed"
- Check that you have enough ETH for gas
- Verify you're on the Anvil network (Chain ID: 31337)

## Available Scripts

```bash
# Core commands
bun run dev                # Start frontend
bun run deploy-contracts   # Deploy contracts & start Anvil
bun run mint              # Mint test tokens

# Utility commands
bun run view-book         # View current order book
bun run create-kandel     # Create position via CLI
bun run db-stats         # View database statistics
```

## Next Steps

1. Deploy a test position to see how Kandel works
2. Watch the order book update as your position places offers
3. Try different price ranges and parameters
4. Monitor spread earnings and inventory changes

Happy trading! 🚀