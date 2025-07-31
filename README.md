# Kandel Position Manager

A DeFi frontend for managing Kandel automated market-making positions on the Mangrove DEX protocol.

## What is This?

Kandel is a grid trading strategy that places limit orders above and below the current market price. When orders are filled, it automatically reposts them to capture spreads from market volatility. This app provides a clean interface to deploy and manage these positions.

## Documentation

### 1. [Setup Guide](./SETUP.md)
Step-by-step instructions to get the app running locally. Start here if you want to try it out.

### 2. [Technical Report](./REPORT.md)
Understanding of how Mangrove and Kandel work, plus a proposal for calculating APR on positions.

### 3. [Original Task Requirements](./TASK.md)
The original specifications and requirements for this project.

## Quick Start

```bash
# Install dependencies
bun install

# Deploy contracts & start local blockchain
bun run deploy-contracts

# In a new terminal - mint test tokens
bun run mint

# Start the frontend
bun run dev
```

Then follow the [Setup Guide](./SETUP.md) to configure MetaMask and start trading.

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **UI**: Radix UI + shadcn/ui components
- **Blockchain**: wagmi + viem
- **Smart Contracts**: Mangrove protocol + Kandel strategy
- **Local Development**: Anvil (via Foundry)

## Features

- ✅ Deploy Kandel positions with custom parameters
- ✅ View real-time order book with your offers highlighted
- ✅ Monitor position performance and inventory
- ✅ Withdraw funds and close positions
- ✅ Local blockchain setup for safe testing
- ✅ React Query for efficient data fetching

## Project Structure

```
├── app/                # Next.js app router pages
├── components/         # React components
├── hooks/             # Custom React hooks
├── lib/               # Utilities and helpers
├── scripts/           # CLI tools for testing
├── src/               # Contract ABIs and deployment
└── public/            # Static assets
```

## License

MIT