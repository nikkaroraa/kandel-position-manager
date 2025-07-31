"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrderbook } from "@/hooks/use-orderbook";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  REFRESH_INTERVALS,
  TOKEN_DECIMALS,
  KANDEL_EVENTS,
  PRICE_PRECISION,
  AMOUNT_PRECISION,
  UI_CONFIG,
} from "@/lib/constants";
import { formatPrice } from "@/lib/price-utils";

// Types
type PriceDirection = "up" | "down" | null;

export function Orderbook() {
  const { asks, bids, isLoading, refetch } = useOrderbook();
  const [midPrice, setMidPrice] = useState<number | null>(null);
  const [spread, setSpread] = useState<number | null>(null);
  const prevMidPrice = useRef<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<PriceDirection>(null);

  useEffect(() => {
    // Calculate mid price and spread
    if (asks.length > 0 && bids.length > 0) {
      const bestAsk = asks[0].price;
      const bestBid = bids[0].price;
      const newMidPrice = (bestAsk + bestBid) / 2;

      // Track price direction
      if (
        prevMidPrice.current !== null &&
        prevMidPrice.current !== newMidPrice
      ) {
        setPriceDirection(newMidPrice > prevMidPrice.current ? "up" : "down");
        setTimeout(
          () => setPriceDirection(null),
          UI_CONFIG.PRICE_DIRECTION_TIMEOUT
        );
      }

      prevMidPrice.current = newMidPrice;
      setMidPrice(newMidPrice);
      setSpread(((bestAsk - bestBid) / newMidPrice) * 100);
    }
  }, [asks, bids]);

  // Auto-refresh with smooth updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, REFRESH_INTERVALS.ORDERBOOK);
    return () => clearInterval(interval);
  }, [refetch]);

  // Listen for kandel position changes
  useEffect(() => {
    const handleKandelEvent = () => {
      // Refresh orderbook after a short delay to ensure blockchain state is updated
      setTimeout(() => refetch(), UI_CONFIG.KANDEL_REFRESH_DELAY);
    };

    window.addEventListener(
      KANDEL_EVENTS.CLOSED,
      handleKandelEvent as EventListener
    );
    window.addEventListener(
      KANDEL_EVENTS.DEPLOYED,
      handleKandelEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        KANDEL_EVENTS.CLOSED,
        handleKandelEvent as EventListener
      );
      window.removeEventListener(
        KANDEL_EVENTS.DEPLOYED,
        handleKandelEvent as EventListener
      );
    };
  }, [refetch]);

  const formatPriceDisplay = (price: number) => {
    return formatPrice(price, PRICE_PRECISION);
  };

  const formatVolume = (volume: bigint, decimals: number) => {
    return parseFloat(formatUnits(volume, decimals)).toFixed(AMOUNT_PRECISION);
  };

  return (
    <Card className="h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Order Book</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                WETH
              </span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs font-medium text-muted-foreground">
                USDC
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              Live
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="space-y-2 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">
                Loading orderbook...
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            <div className="grid grid-cols-3 gap-2 px-4 py-3 text-xs font-medium text-muted-foreground bg-muted/50">
              <div>Price (USDC)</div>
              <div className="text-right">Size (WETH)</div>
              <div className="text-right">Total (USDC)</div>
            </div>

            <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
              {asks.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No sell orders
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {asks
                    .slice(0, UI_CONFIG.MAX_VISIBLE_ORDERS)
                    .reverse()
                    .map((ask, index) => (
                      <div
                        key={`ask-${ask.id}-${index}`}
                        className={cn(
                          "grid grid-cols-3 gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted/30 relative",
                          ask.isKandel && "bg-primary/5 hover:bg-primary/10"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-red-500 font-mono">
                            ${formatPriceDisplay(ask.price)}
                          </span>
                          {ask.isKandel && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-r" />
                          )}
                        </div>
                        <div className="text-right font-mono text-muted-foreground">
                          {formatVolume(ask.volume, TOKEN_DECIMALS.WETH)}
                        </div>
                        <div className="text-right font-mono text-muted-foreground">
                          ${formatVolume(ask.wants, TOKEN_DECIMALS.USDC)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Mid Price
                  </span>
                  {priceDirection && (
                    <div
                      className={cn(
                        "animate-in fade-in-0 zoom-in-95 duration-300",
                        priceDirection === "up"
                          ? "text-green-500"
                          : "text-red-500"
                      )}
                    >
                      {priceDirection === "up" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                    </div>
                  )}
                </div>
                {spread !== null && (
                  <span className="text-xs text-muted-foreground">
                    Spread: {spread.toFixed(2)}%
                  </span>
                )}
              </div>
              {midPrice && (
                <div className="mt-1">
                  <span
                    className={cn(
                      "text-lg font-semibold font-mono transition-colors",
                      priceDirection === "up" && "text-green-500",
                      priceDirection === "down" && "text-red-500"
                    )}
                  >
                    ${formatPriceDisplay(midPrice)}
                  </span>
                </div>
              )}
            </div>

            <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
              {bids.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No buy orders
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {bids
                    .slice(0, UI_CONFIG.MAX_VISIBLE_ORDERS)
                    .map((bid, index) => (
                      <div
                        key={`bid-${bid.id}-${index}`}
                        className={cn(
                          "grid grid-cols-3 gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted/30 relative",
                          bid.isKandel && "bg-primary/5 hover:bg-primary/10"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-green-500 font-mono">
                            ${formatPriceDisplay(bid.price)}
                          </span>
                          {bid.isKandel && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-r" />
                          )}
                        </div>
                        <div className="text-right font-mono text-muted-foreground">
                          {formatVolume(bid.volume, TOKEN_DECIMALS.WETH)}
                        </div>
                        <div className="text-right font-mono text-muted-foreground">
                          ${formatVolume(bid.gives, TOKEN_DECIMALS.USDC)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-muted/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Live updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-green-500 rounded" />
                  <span>Your orders</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
