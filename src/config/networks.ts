import { type Chain, anvil, sepolia, baseSepolia } from "viem/chains"
import { http } from "viem"

export type SupportedNetwork = "localhost" | "sepolia" | "base-sepolia"

export interface NetworkConfig {
  chain: Chain
  contracts: {
    mangrove: `0x${string}`
    reader: `0x${string}`
    seeder: `0x${string}`
    weth: `0x${string}`
    usdc: `0x${string}`
  }
  rpcUrl: string
  blockExplorer: string
  faucets: string[]
}

// Helper to get env variable with fallback
const getEnvAddress = (key: string, fallback?: string): `0x${string}` => {
  const value = process.env[key] || fallback || ""
  if (!value || !value.startsWith("0x")) {
    return `0x${"0".repeat(40)}` as `0x${string}`
  }
  return value as `0x${string}`
}

// Default RPC URLs
const DEFAULT_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com"
const DEFAULT_BASE_SEPOLIA_RPC = "https://base-sepolia-rpc.publicnode.com"

export const NETWORK_CONFIGS: Record<SupportedNetwork, NetworkConfig> = {
  localhost: {
    chain: anvil,
    contracts: {
      mangrove: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
      reader: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
      seeder: "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
      weth: "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
      usdc: "0x5fc8d32690cc91d4c39d9d3abcbd16989f875707",
    },
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: "",
    faucets: ["Local Anvil - use `bun run mint` script"],
  },
  sepolia: {
    chain: sepolia,
    contracts: {
      mangrove: getEnvAddress("NEXT_PUBLIC_SEPOLIA_MANGROVE_ADDRESS"),
      reader: getEnvAddress("NEXT_PUBLIC_SEPOLIA_READER_ADDRESS"),
      seeder: getEnvAddress("NEXT_PUBLIC_SEPOLIA_SEEDER_ADDRESS"),
      weth: getEnvAddress("NEXT_PUBLIC_SEPOLIA_WETH_ADDRESS"),
      usdc: getEnvAddress("NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS"),
    },
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC,
    blockExplorer: "https://sepolia.etherscan.io",
    faucets: [
      "https://sepolia-faucet.pk910.de",
      "https://www.alchemy.com/faucets/ethereum-sepolia",
      "https://sepoliafaucet.com",
    ],
  },
  "base-sepolia": {
    chain: baseSepolia,
    contracts: {
      mangrove: getEnvAddress("NEXT_PUBLIC_BASE_SEPOLIA_MANGROVE_ADDRESS"),
      reader: getEnvAddress("NEXT_PUBLIC_BASE_SEPOLIA_READER_ADDRESS"),
      seeder: getEnvAddress("NEXT_PUBLIC_BASE_SEPOLIA_SEEDER_ADDRESS"),
      weth: getEnvAddress("NEXT_PUBLIC_BASE_SEPOLIA_WETH_ADDRESS"),
      usdc: getEnvAddress("NEXT_PUBLIC_BASE_SEPOLIA_USDC_ADDRESS"),
    },
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || DEFAULT_BASE_SEPOLIA_RPC,
    blockExplorer: "https://sepolia.basescan.org",
    faucets: [
      "https://www.alchemy.com/faucets/base-sepolia",
      "https://sepolia.base.org",
    ],
  },
}

export function getCurrentNetwork(): SupportedNetwork {
  const network = process.env.NEXT_PUBLIC_NETWORK as SupportedNetwork
  if (network && network in NETWORK_CONFIGS) {
    return network
  }
  return "localhost"
}

export function getNetworkConfig(): NetworkConfig {
  return NETWORK_CONFIGS[getCurrentNetwork()]
}

export function getTransports() {
  const transports: Record<number, ReturnType<typeof http>> = {}
  
  Object.values(NETWORK_CONFIGS).forEach(config => {
    transports[config.chain.id] = http(config.rpcUrl)
  })
  
  return transports
}