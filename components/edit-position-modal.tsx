"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock } from "lucide-react";
import { formatETH, formatUSDC, formatProvision } from "@/lib/format";
import type { KandelPosition } from "@/hooks/use-kandel-positions";

interface EditPositionModalProps {
  position: KandelPosition | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  ethPrice: number;
}

export function EditPositionModal({
  position,
  isOpen,
  onClose,
  ethPrice,
}: EditPositionModalProps) {
  if (!position) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kandel Position Details</DialogTitle>
          <DialogDescription>
            View your WETH/USDC Kandel position parameters
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Position Parameters</CardTitle>
            <CardDescription>
              View your Kandel strategy configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  Price Range
                </span>
                <span className="font-mono font-medium">
                  ${position.minPrice.toFixed(2)} - $
                  {position.maxPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  Price Points
                </span>
                <span className="font-mono font-medium">
                  {position.pricePoints}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  Active Offers
                </span>
                <span className="font-mono font-medium">
                  {position.activeOffers}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  Total Value
                </span>
                <span className="font-mono font-medium">
                  $
                  {(
                    parseFloat(formatETH(position.baseBalance)) * ethPrice +
                    parseFloat(formatUSDC(position.quoteBalance))
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  WETH Balance
                </span>
                <span className="font-mono font-medium">
                  {formatETH(position.baseBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  USDC Balance
                </span>
                <span className="font-mono font-medium">
                  {formatUSDC(position.quoteBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  Provision (Gas Collateral)
                </span>
                <span className="font-mono font-medium">
                  {formatProvision(position.provision)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  Strategy Type
                </span>
                <span className="font-mono font-medium">Geometric</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="w-full" disabled>
                      <Lock className="h-4 w-4 mr-2" />
                      Edit Parameters
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Coming soon! Parameter editing will be available in a
                      future update.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
