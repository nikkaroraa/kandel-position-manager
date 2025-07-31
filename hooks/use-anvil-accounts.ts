import { useState, useEffect } from "react";
import { type Address } from "viem";

interface AnvilAccount {
  address: Address;
  balance?: bigint;
}

export function useAnvilAccounts() {
  const [accounts, setAccounts] = useState<AnvilAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnvilAccounts() {
      try {
        // Only fetch if we're on localhost
        if (
          typeof window === "undefined" ||
          !window.location.hostname.includes("localhost")
        ) {
          setIsLoading(false);
          return;
        }

        // Call Anvil's RPC to get accounts
        const response = await fetch("http://localhost:8545", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_accounts",
            params: [],
            id: 1,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to connect to Anvil");
        }

        const { result: addresses } = await response.json();

        // Map addresses to account objects
        const anvilAccounts: AnvilAccount[] = addresses.map(
          (address: Address) => ({
            address,
          })
        );

        setAccounts(anvilAccounts);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch Anvil accounts:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch accounts"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnvilAccounts();
  }, []);

  return { accounts, isLoading, error, firstAccount: accounts[0] };
}
