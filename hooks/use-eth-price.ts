import { useEffect, useState } from "react";
import { DEFAULT_VALUES, REFRESH_INTERVALS } from "@/lib/constants";

interface PriceData {
  ethPrice: number;
  isLoading: boolean;
  error: string | null;
}

export function useEthPrice(): PriceData {
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch("/api/eth-price");

        if (!response.ok) {
          throw new Error("Failed to fetch ETH price");
        }

        const data = await response.json();
        const price = data.price || 0;

        setEthPrice(price);
        setError(null);
      } catch (err) {
        console.error("Error fetching ETH price:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch price");
        // Use a fallback price
        setEthPrice(DEFAULT_VALUES.FALLBACK_ETH_PRICE);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchPrice();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPrice, REFRESH_INTERVALS.PRICE);

    return () => clearInterval(interval);
  }, []);

  return { ethPrice, isLoading, error };
}
