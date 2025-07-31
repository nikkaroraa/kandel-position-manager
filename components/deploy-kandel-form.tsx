"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Check, Info } from "lucide-react";
import { useDeployKandel } from "@/hooks/use-deploy-kandel";
import { formatUnits } from "viem";
import { formatNumber } from "@/lib/format";
import { WalletBalanceCard } from "./wallet-balance-card";
import { useAccount, useChainId } from "wagmi";
import { AnvilSetupGuide } from "./anvil-setup-guide";
import { useBalances } from "@/hooks/use-balances";
import { PriceRangeSelector } from "./price-range-selector";
import { toast } from "sonner";
import { calculateMinimumVolume } from "@/lib/kandel-math";

interface KandelFormData {
  minPrice: number;
  maxPrice: number;
  pricePoints: number;
  baseAmount: string;
  quoteAmount: string;
  stepSize: number;
  gasreq: string;
  gasprice: string;
}

export function DeployKandelForm() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { deploy, isDeploying, contracts } = useDeployKandel();
  const { wethBalance, usdcBalance } = useBalances();
  const [deploymentStatus, setDeploymentStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [kandelAddress, setKandelAddress] = useState<string>("");

  const [formData, setFormData] = useState<KandelFormData>({
    minPrice: 3230, // Default will be set based on market price
    maxPrice: 4370, // Default will be set based on market price
    pricePoints: 10,
    baseAmount: "0.1",
    quoteAmount: "250",
    stepSize: 1,
    gasreq: "128000",
    gasprice: "20",
  });

  const updateField = (field: keyof KandelFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate distribution (matching the actual Kandel logic)
  const adjustedPricePoints = formData.pricePoints + 1;
  const firstAskIndex = Math.floor(adjustedPricePoints / 2);
  const numAsks = adjustedPricePoints - firstAskIndex;
  const numBids = firstAskIndex - 1;

  // Calculate total amounts needed
  const totalWethNeeded = parseFloat(formData.baseAmount || "0") * numAsks;
  const totalUsdcNeeded = parseFloat(formData.quoteAmount || "0") * numBids;

  // Calculate minimum volume requirements
  const midPrice = (formData.minPrice + formData.maxPrice) / 2;
  const minWethPerOffer = Number(
    formatUnits(calculateMinimumVolume(midPrice), 18)
  );
  const minUsdcPerOffer = minWethPerOffer * midPrice;

  // Check if per-offer amounts meet minimum requirements
  const wethPerOfferValid =
    parseFloat(formData.baseAmount || "0") >= minWethPerOffer;
  const usdcPerOfferValid =
    parseFloat(formData.quoteAmount || "0") >= minUsdcPerOffer;

  // Balance checks
  const hasEnoughWeth = totalWethNeeded <= Number(formatUnits(wethBalance, 18));
  const hasEnoughUsdc = totalUsdcNeeded <= Number(formatUnits(usdcBalance, 6));
  const canDeploy =
    address &&
    hasEnoughWeth &&
    hasEnoughUsdc &&
    wethPerOfferValid &&
    usdcPerOfferValid &&
    !isDeploying &&
    contracts;

  const handleDeploy = async () => {
    if (!canDeploy) return;

    setDeploymentStatus("idle");
    const toastId = toast.loading("Deploying Kandel position...");

    try {
      const kandel = await deploy(formData, (txHash) => {
        // Show immediate feedback when transaction is sent
        toast.loading(
          `Transaction submitted! Hash: ${txHash.slice(0, 10)}...${txHash.slice(
            -8
          )}`,
          {
            id: toastId,
          }
        );
      });
      setKandelAddress(kandel);
      setDeploymentStatus("success");
      toast.success("Position deployed successfully!", {
        id: toastId,
        description: `Address: ${kandel.slice(0, 10)}...${kandel.slice(-8)}`,
      });
    } catch (error) {
      console.error("Deploy error:", error);
      setDeploymentStatus("error");

      // Show specific error message
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied")
      ) {
        toast.error("Transaction cancelled", {
          id: toastId,
        });
      } else if (
        error &&
        typeof error === "object" &&
        "shortMessage" in error
      ) {
        toast.error(String(error.shortMessage), {
          id: toastId,
        });
      } else {
        toast.error("Deployment failed. Check console for details.", {
          id: toastId,
        });
      }
    }
  };

  if (chainId !== 31337) {
    return <AnvilSetupGuide />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Market Making Position</CardTitle>
          <CardDescription>
            Deploy an automated Kandel strategy on the WETH/USDC market
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <WalletBalanceCard
            wethBalance={wethBalance}
            usdcBalance={usdcBalance}
          />

          <PriceRangeSelector
            minPrice={formData.minPrice}
            maxPrice={formData.maxPrice}
            onPriceChange={(min, max) => {
              updateField("minPrice", min);
              updateField("maxPrice", max);
            }}
          />

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Offer Distribution</h3>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="pricePoints">Number of Price Points</Label>
                  <span className="text-sm font-medium">
                    {formData.pricePoints}
                  </span>
                </div>
                <Slider
                  id="pricePoints"
                  min={5}
                  max={30}
                  step={1}
                  value={[formData.pricePoints]}
                  onValueChange={(value) =>
                    updateField("pricePoints", value[0])
                  }
                  className="py-4"
                />
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Ask offers (selling WETH):
                  </span>
                  <span className="font-medium">{numAsks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Bid offers (buying WETH):
                  </span>
                  <span className="font-medium">{numBids}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium mb-4">Liquidity per Offer</h3>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 mb-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-600">
                  Mangrove requires a minimum volume of ~$10 per offer to
                  prevent dust. At current prices, this is approximately{" "}
                  {minWethPerOffer.toFixed(4)} WETH or{" "}
                  {minUsdcPerOffer.toFixed(2)} USDC per offer.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="baseAmount">WETH Amount</Label>
                  <Input
                    id="baseAmount"
                    type="number"
                    step="0.01"
                    value={formData.baseAmount}
                    onChange={(e) => updateField("baseAmount", e.target.value)}
                    className={!wethPerOfferValid ? "border-destructive" : ""}
                  />
                  <p className="text-xs text-muted-foreground">Per ask offer</p>
                  {!wethPerOfferValid && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Minimum: {minWethPerOffer.toFixed(4)} WETH
                    </p>
                  )}
                </div>

                <div
                  className={`rounded-lg p-3 space-y-1 ${
                    !hasEnoughWeth
                      ? "bg-destructive/10 border border-destructive/20"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex justify-between text-sm">
                    <span>Total WETH needed:</span>
                    <span className="font-mono font-medium">
                      {formatNumber(totalWethNeeded, 4)}
                    </span>
                  </div>
                  {!hasEnoughWeth && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Insufficient balance
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="quoteAmount">USDC Amount</Label>
                  <Input
                    id="quoteAmount"
                    type="number"
                    step="10"
                    value={formData.quoteAmount}
                    onChange={(e) => updateField("quoteAmount", e.target.value)}
                    className={!usdcPerOfferValid ? "border-destructive" : ""}
                  />
                  <p className="text-xs text-muted-foreground">Per bid offer</p>
                  {!usdcPerOfferValid && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Minimum: {minUsdcPerOffer.toFixed(2)} USDC
                    </p>
                  )}
                </div>

                <div
                  className={`rounded-lg p-3 space-y-1 ${
                    !hasEnoughUsdc
                      ? "bg-destructive/10 border border-destructive/20"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex justify-between text-sm">
                    <span>Total USDC needed:</span>
                    <span className="font-mono font-medium">
                      {formatNumber(totalUsdcNeeded, 2)}
                    </span>
                  </div>
                  {!hasEnoughUsdc && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Insufficient balance
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Deployment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Offers:</span>
              <span className="font-medium font-mono">{numAsks + numBids}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price Range:</span>
              <span className="font-mono font-medium">
                ${formatNumber(formData.minPrice)} - $
                {formatNumber(formData.maxPrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">WETH Required:</span>
              <span className="font-mono font-medium">
                {formatNumber(totalWethNeeded, 4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">USDC Required:</span>
              <span className="font-mono font-medium">
                {formatNumber(totalUsdcNeeded, 2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ETH Provision:</span>
              <span className="font-mono">~0.00001 ETH</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={handleDeploy}
              disabled={!canDeploy}
            >
              {isDeploying
                ? "Deploying..."
                : !address
                ? "Connect Wallet"
                : !contracts
                ? "Loading Contracts..."
                : !wethPerOfferValid
                ? "WETH Amount Below Minimum"
                : !usdcPerOfferValid
                ? "USDC Amount Below Minimum"
                : !hasEnoughWeth
                ? "Insufficient WETH"
                : !hasEnoughUsdc
                ? "Insufficient USDC"
                : "Deploy Position"}
            </Button>
          </div>

          {deploymentStatus === "success" && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <p className="text-sm font-medium">
                  Position deployed successfully!
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Address:{" "}
                <code>
                  {kandelAddress.slice(0, 10)}...{kandelAddress.slice(-8)}
                </code>
              </p>
            </div>
          )}

          {deploymentStatus === "error" && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm font-medium">Deployment failed</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Check the console for details
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
