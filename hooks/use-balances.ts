import { useAccount, useBalance, usePublicClient } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { useContracts } from "./use-contracts";
import { erc20Abi } from "@/src/abi/erc20";
import { KANDEL_EVENTS } from "@/lib/constants";

export function useBalances() {
  const { address } = useAccount();
  const { contracts } = useContracts();
  const publicClient = usePublicClient();

  const [wethBalance, setWethBalance] = useState<bigint>(0n);
  const [usdcBalance, setUsdcBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(true);

  // Native ETH balance
  const { data: ethBalance } = useBalance({
    address,
  });

  const fetchTokenBalances = useCallback(async () => {
    if (!address || !publicClient || !contracts) {
      setIsLoading(false);
      return;
    }

    try {
      const [weth, usdc] = await Promise.all([
        publicClient.readContract({
          address: contracts.weth,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        }),
        publicClient.readContract({
          address: contracts.usdc,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        }),
      ]);

      setWethBalance(weth);
      setUsdcBalance(usdc);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient, contracts]);

  // Initial fetch
  useEffect(() => {
    fetchTokenBalances();
  }, [fetchTokenBalances]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTokenBalances();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchTokenBalances]);

  // Listen for Kandel events to refresh immediately
  useEffect(() => {
    const handleRefresh = () => {
      // Small delay to ensure blockchain state is updated
      setTimeout(() => fetchTokenBalances(), 1500);
    };

    window.addEventListener(KANDEL_EVENTS.DEPLOYED, handleRefresh);
    window.addEventListener(KANDEL_EVENTS.CLOSED, handleRefresh);

    return () => {
      window.removeEventListener(KANDEL_EVENTS.DEPLOYED, handleRefresh);
      window.removeEventListener(KANDEL_EVENTS.CLOSED, handleRefresh);
    };
  }, [fetchTokenBalances]);

  return {
    ethBalance: ethBalance?.value || 0n,
    wethBalance,
    usdcBalance,
    isLoading,
    refetch: fetchTokenBalances,
  };
}
