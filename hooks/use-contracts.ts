import { useEffect, useState } from "react";
import type { Address } from "viem";

interface Contracts {
  mangrove: Address;
  reader: Address;
  seeder: Address;
  weth: Address;
  usdc: Address;
}

export function useContracts() {
  const [contracts, setContracts] = useState<Contracts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContracts() {
      console.log("Loading contracts from /api/deployment...");
      try {
        const response = await fetch("/api/deployment");
        if (!response.ok) {
          throw new Error(
            `Failed to load contracts: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("Deployment API response:", data);

        if (!data.contracts) {
          throw new Error("No contracts deployed");
        }

        const contractsData = {
          mangrove: data.contracts.mangrove as Address,
          reader: data.contracts.reader as Address,
          seeder: data.contracts.kandelSeeder as Address,
          weth: data.contracts.weth as Address,
          usdc: data.contracts.usdc as Address,
        };

        console.log("Setting contracts:", contractsData);
        setContracts(contractsData);
      } catch (err) {
        console.error("Error loading contracts:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load contracts"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadContracts();
  }, []);

  return { contracts, isLoading, error };
}
