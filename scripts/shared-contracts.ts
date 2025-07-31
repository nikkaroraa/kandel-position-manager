import { kandelDB } from "../lib/db"
import type { Address } from "viem"

export interface Contracts {
  mangrove: Address
  reader: Address
  seeder: Address
  weth: Address
  usdc: Address
}

export async function getContractsOrThrow(): Promise<Contracts> {
  const contracts = await kandelDB.getCurrentContracts()
  
  if (!contracts) {
    console.error("❌ No contract deployment found in database.")
    console.error("Please run 'bun run deploy-contracts' first.")
    process.exit(1)
  }
  
  return {
    mangrove: contracts.mangrove as Address,
    reader: contracts.reader as Address,
    seeder: contracts.kandelSeeder as Address,
    weth: contracts.weth as Address,
    usdc: contracts.usdc as Address,
  }
}