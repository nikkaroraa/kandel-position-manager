"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, AlertCircle } from "lucide-react";
import { useKandelPositions } from "@/hooks/use-kandel-positions";
import { useAccount } from "wagmi";
import { useEthPrice } from "@/hooks/use-eth-price";
import { PositionCard } from "./position-card";
import { EditPositionModal } from "./edit-position-modal";
import { WithdrawAllModal } from "./withdraw-all-modal";
import {
  formatUSD,
  formatETH,
  formatUSDC,
  formatProvision,
} from "@/lib/format";
import { formatUnits } from "viem";
import type { KandelPosition } from "@/hooks/use-kandel-positions";
import { MIN_PROVISION, FORM_CONFIG } from "@/lib/constants";
import { calculateUSDValue } from "@/lib/value-utils";

export function ActivePositions() {
  const { address } = useAccount();
  const { positions, isLoading, refetch } = useKandelPositions(address);
  const { ethPrice } = useEthPrice();
  const [editingPosition, setEditingPosition] = useState<KandelPosition | null>(
    null
  );
  const [withdrawingPosition, setWithdrawingPosition] =
    useState<KandelPosition | null>(null);

  // Use ETH price for current market price
  const currentMarketPrice = ethPrice;

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Positions</CardTitle>
          <CardDescription>
            Connect your wallet to view positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Wallet className="h-12 w-12 mb-4 opacity-50" />
            <p>Please connect your wallet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleRefresh = () => refetch();

  const handleManage = (position: KandelPosition) =>
    setEditingPosition(position);
  const handleEditSuccess = () => {
    setEditingPosition(null);
    refetch();
  };

  const handleWithdrawAll = (position: KandelPosition) =>
    setWithdrawingPosition(position);
  const handleWithdrawSuccess = () => {
    setWithdrawingPosition(null);
  };

  const activePositions = positions.filter((position) => {
    const hasBalance = position.baseBalance > 0n || position.quoteBalance > 0n;
    const hasOffers = position.activeOffers > 0;
    const hasSignificantProvision = position.provision >= MIN_PROVISION;

    return hasBalance || hasOffers || hasSignificantProvision;
  });
  const totalValue = activePositions.reduce((sum, pos) => {
    return sum + calculateUSDValue(pos.baseBalance, pos.quoteBalance, ethPrice);
  }, 0);

  const totalETH = activePositions.reduce(
    (sum, pos) => sum + pos.baseBalance,
    0n
  );
  const totalUSDC = activePositions.reduce(
    (sum, pos) => sum + pos.quoteBalance,
    0n
  );
  const totalProvision = activePositions.reduce(
    (sum, pos) => sum + pos.provision,
    0n
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Positions</CardTitle>
              <CardDescription>
                Manage your Kandel market making positions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold font-mono">
                {formatUSD(totalValue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total WETH</p>
              <p className="text-xl font-mono">{formatETH(totalETH)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total USDC</p>
              <p className="text-xl font-mono">{formatUSDC(totalUSDC)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Provision</p>
              <p className="text-xl font-mono">
                {formatProvision(totalProvision)}
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                {formatUSD(
                  parseFloat(formatUnits(totalProvision, 18)) * ethPrice
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      {isLoading ? (
        <div className="space-y-4">
          {[...Array(FORM_CONFIG.SKELETON_COUNT)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-2 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activePositions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No active positions</p>
              <p className="text-sm">
                Deploy a new Kandel position to get started
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activePositions.map((position) => (
            <PositionCard
              key={position.address}
              position={position}
              ethPrice={ethPrice}
              currentMarketPrice={currentMarketPrice}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              onManage={() => handleManage(position)}
              onWithdrawAll={() => handleWithdrawAll(position)}
            />
          ))}
        </div>
      )}

      <EditPositionModal
        position={editingPosition}
        isOpen={!!editingPosition}
        onClose={() => setEditingPosition(null)}
        onSuccess={handleEditSuccess}
        ethPrice={ethPrice}
      />

      <WithdrawAllModal
        position={withdrawingPosition}
        isOpen={!!withdrawingPosition}
        onClose={() => setWithdrawingPosition(null)}
        onSuccess={handleWithdrawSuccess}
        ethPrice={ethPrice}
      />
    </div>
  );
}
