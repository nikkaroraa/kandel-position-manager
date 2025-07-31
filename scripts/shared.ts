// Shared utilities for scripts
import { createWalletClient, createPublicClient, http, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

// Public client for reading
export const publicClient = createPublicClient({
  chain: foundry,
  transport: http("http://127.0.0.1:8545"),
}) as PublicClient;

// Get account from environment variable
function getAccount() {
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error(
      "PRIVATE_KEY environment variable is required. " +
      "For local testing with Anvil, you can use one of Anvil's test accounts. " +
      "Run 'anvil' to see the list of available accounts and their private keys."
    );
  }
  
  if (!privateKey.startsWith("0x")) {
    throw new Error("Private key must start with 0x");
  }
  
  return privateKeyToAccount(privateKey as `0x${string}`);
}

// Create wallet client
export function createWalletClientWithAccount() {
  const account = getAccount();
  
  return createWalletClient({
    account,
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
  });
}

// Export for scripts that need direct access
export const account = getAccount();
export const client = createWalletClientWithAccount();