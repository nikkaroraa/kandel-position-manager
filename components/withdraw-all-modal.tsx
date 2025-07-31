"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import {
  formatETH,
  formatUSDC,
  formatUSD,
  formatProvision,
} from "@/lib/format";
import { useWriteContract, usePublicClient, useAccount } from "wagmi";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { useContracts } from "@/hooks/use-contracts";
import { KandelAbi } from "@/src/abi/kandel";
import type { KandelPosition } from "@/hooks/use-kandel-positions";
import { FORM_CONFIG, DELAYS, KANDEL_EVENTS } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";

interface WithdrawAllModalProps {
  position: KandelPosition | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ethPrice: number;
}

export function WithdrawAllModal({
  position,
  isOpen,
  onClose,
  onSuccess,
  ethPrice,
}: WithdrawAllModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"confirm" | "processing" | "success">(
    "confirm"
  );

  const { contracts } = useContracts();
  const publicClient = usePublicClient();
  const { address: userAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  if (!position) return null;

  const totalWethValue = parseFloat(formatETH(position.baseBalance)) * ethPrice;
  const totalUsdcValue = parseFloat(formatUSDC(position.quoteBalance));
  const provisionValue =
    parseFloat(formatUnits(position.provision, 18)) * ethPrice;
  const totalValue = totalWethValue + totalUsdcValue + provisionValue;

  const handleWithdrawAll = async () => {
    if (!contracts || !publicClient || !userAddress) return;

    try {
      setIsProcessing(true);
      setStep("processing");

      const hash = await writeContractAsync({
        address: position.address as `0x${string}`,
        abi: KandelAbi,
        functionName: "retractAndWithdraw",
        args: [
          0n,
          FORM_CONFIG.MAX_OFFERS_PER_KANDEL,
          position.baseBalance,
          position.quoteBalance,
          position.provision,
          userAddress as `0x${string}`,
        ],
      });

      toast.success("Transaction submitted!", {
        description: `Transaction hash: ${hash.slice(0, 10)}...${hash.slice(
          -8
        )}`,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        setStep("success");

        toast.success("Position closed successfully!", {
          description: "All funds have been withdrawn to your wallet",
        });

        try {
          // Remove from API/database
          await fetch(`/api/kandels/${position.address}`, {
            method: "DELETE",
          });

          // Invalidate React Query cache
          await queryClient.invalidateQueries({ queryKey: ["kandel-addresses"] });
          await queryClient.invalidateQueries({ queryKey: ["kandel-positions"] });

          window.dispatchEvent(
            new CustomEvent(KANDEL_EVENTS.CLOSED, {
              detail: { address: position.address },
            })
          );
        } catch (error) {
          console.error("Failed to remove Kandel:", error);
        }
        setTimeout(() => {
          onSuccess();
          onClose();
          setStep("confirm");
        }, DELAYS.MODAL_CLOSE);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      console.error("Withdrawal failed:", error);
      // Only show error if user didn't reject the transaction
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      let shortMessage = "Please try again or check the console for details";

      // Extract shortMessage if it exists on the error object
      if (error && typeof error === "object" && "shortMessage" in error) {
        shortMessage = String(error.shortMessage) || shortMessage;
      }

      if (
        !errorMessage?.includes("User rejected") &&
        !errorMessage?.includes("User denied")
      ) {
        toast.error("Failed to withdraw", {
          description: shortMessage,
        });
      }
      setStep("confirm");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Only allow closing if we're not processing
        if (!open && !isProcessing && step !== "processing") {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Withdraw All & Close Position
          </DialogTitle>
          <DialogDescription>
            This will permanently close your Kandel position
          </DialogDescription>
        </DialogHeader>

        {step === "confirm" && (
          <>
            <div className="space-y-4">
              <Alert className="border-orange-500/20 bg-orange-500/5">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-sm">
                  This action will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Cancel all {position.activeOffers} active offers</li>
                    <li>Withdraw all tokens to your wallet</li>
                    <li>Return the provision (gas collateral)</li>
                    <li>Permanently close this Kandel position</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Card>
                <CardContent className="pt-6">
                  <h4 className="text-sm font-medium mb-3">
                    Funds to be withdrawn:
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        WETH
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-medium">
                          {formatETH(position.baseBalance)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          (${totalWethValue.toFixed(2)})
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        USDC
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-medium">
                          {formatUSDC(position.quoteBalance)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          (${totalUsdcValue.toFixed(2)})
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        ETH Provision
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-medium">
                          {formatProvision(position.provision)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          (${provisionValue.toFixed(2)})
                        </span>
                      </div>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Value</span>
                        <span className="font-mono font-bold text-lg">
                          {formatUSD(totalValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleWithdrawAll}
                disabled={isProcessing}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Withdraw All & Close
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "processing" && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <p className="font-medium">Processing withdrawal...</p>
              <p className="text-sm text-muted-foreground">
                Cancelling offers and withdrawing funds
              </p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-lg">
                Position Closed Successfully!
              </p>
              <p className="text-sm text-muted-foreground">
                All funds have been withdrawn to your wallet
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
