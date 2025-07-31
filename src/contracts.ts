import { kandelDB } from "../lib/db"

// Type-safe addresses
export type Address = `0x${string}`

export interface ContractAddresses {
  mangrove: Address
  reader: Address
  seeder: Address
  weth: Address
  usdc: Address
}

// Get contracts from database
export async function getContracts(): Promise<ContractAddresses | null> {
  const contracts = await kandelDB.getCurrentContracts()
  if (!contracts) return null
  
  return {
    mangrove: contracts.mangrove as Address,
    reader: contracts.reader as Address,
    seeder: contracts.kandelSeeder as Address,
    weth: contracts.weth as Address,
    usdc: contracts.usdc as Address,
  }
}

// For scripts that need synchronous access (will be removed once all scripts are updated)
export const contracts = {
  mangrove: "0x5fbdb2315678afecb367f032d93f642f64180aa3" as Address,
  reader: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512" as Address,
  seeder: "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9" as Address,
  weth: "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9" as Address,
  usdc: "0x5fc8d32690cc91d4c39d9d3abcbd16989f875707" as Address,
} as const