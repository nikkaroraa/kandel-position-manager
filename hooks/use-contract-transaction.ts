import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { Hash, TransactionReceipt } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";

interface TransactionOptions {
  onTxHash?: (hash: Hash) => void;
  onSuccess?: (receipt: TransactionReceipt) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  toastId?: string;
}

export function useContractTransaction() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const execute = useCallback(
    async (
      transactionFn: () => Promise<Hash>,
      options?: TransactionOptions
    ): Promise<TransactionReceipt | undefined> => {
      if (!walletClient || !publicClient) {
        const error = new Error("Wallet not connected");
        setError(error);
        toast.error(options?.errorMessage || "Please connect your wallet");
        return;
      }

      setIsLoading(true);
      setError(null);

      const toastId = options?.toastId || `tx-${Date.now()}`;

      try {
        toast.loading("Confirm transaction in your wallet...", { id: toastId });
        const hash = await transactionFn();

        toast.loading("Transaction submitted...", {
          id: toastId,
          description: `Hash: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
        });

        if (options?.onTxHash) {
          options.onTxHash(hash);
        }

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === "reverted") {
          throw new Error("Transaction reverted");
        }

        toast.success(options?.successMessage || "Transaction successful!", {
          id: toastId,
        });

        if (options?.onSuccess) {
          options.onSuccess(receipt);
        }

        return receipt;
      } catch (err) {
        const error = err as Error;
        setError(error);

        let errorMessage = options?.errorMessage || "Transaction failed";

        if (error.message.includes("rejected")) {
          errorMessage = "Transaction rejected";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for transaction";
        }

        toast.error(errorMessage, { id: toastId });

        if (options?.onError) {
          options.onError(error);
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [walletClient, publicClient]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    execute,
    isLoading,
    error,
    reset,
  };
}
