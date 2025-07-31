"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowDownRight,
  RefreshCw,
  TrendingUp,
  XCircle,
  PencilIcon,
} from "lucide-react";
import {
  formatETH,
  formatUSDC,
  formatPercent,
  formatUSD,
  formatProvision,
} from "@/lib/format";
import { formatUnits } from "viem";
import type { KandelPosition } from "@/hooks/use-kandel-positions";

interface PositionCardProps {
  position: KandelPosition;
  ethPrice: number;
  currentMarketPrice?: number;
  isLoading?: boolean;
  onRefresh: () => void;
  onManage: () => void;
  onWithdrawAll: () => void;
}

export function PositionCard({
  position,
  ethPrice,
  currentMarketPrice,
  isLoading,
  onRefresh,
  onManage,
  onWithdrawAll,
}: PositionCardProps) {
  const wethAmount = parseFloat(formatETH(position.baseBalance));
  const usdcAmount = parseFloat(formatUSDC(position.quoteBalance));
  const wethValue = wethAmount * ethPrice;
  const usdcValue = usdcAmount;
  const totalUSDValue = wethValue + usdcValue;

  const pnlPercent = 0;

  return (
    <Card className="border-border/50 hover:border-border transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">WETH/USDC</h3>
              <Badge
                variant={position.isActive ? "default" : "secondary"}
                className="text-xs"
              >
                {position.isActive ? "Active" : "Paused"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                {position.activeOffers} active offers
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono">
              {formatUSD(totalUSDValue)}
            </div>
            <div
              className={`text-sm flex items-center justify-end gap-1 ${
                pnlPercent >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {pnlPercent >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              <span className="font-mono">{formatPercent(pnlPercent)}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">
                WETH Balance
              </div>
              <div className="font-mono font-medium text-lg">
                {formatETH(position.baseBalance)}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                $
                {wethValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">
                USDC Balance
              </div>
              <div className="font-mono font-medium text-lg">
                {formatUSDC(position.quoteBalance)}
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Min Price
                </div>
                <div className="font-mono font-medium">
                  ${position.minPrice.toLocaleString()}
                </div>
              </div>
              {currentMarketPrice && (
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    Current
                  </div>
                  <div className="font-mono font-medium text-lg">
                    ${currentMarketPrice.toLocaleString()}
                  </div>
                </div>
              )}
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">
                  Max Price
                </div>
                <div className="font-mono font-medium">
                  ${position.maxPrice.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <div className="text-xs text-muted-foreground">Price Points</div>
            <div className="font-mono font-medium">{position.pricePoints}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Provision</div>
            <div className="font-mono font-medium">
              {formatProvision(position.provision)}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {formatUSD(
                parseFloat(formatUnits(position.provision, 18)) * ethPrice
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="default" onClick={onManage}>
            <PencilIcon className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="destructive" onClick={onWithdrawAll}>
            <XCircle className="h-3 w-3 mr-1" />
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
