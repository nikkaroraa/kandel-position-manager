"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, AlertCircle } from "lucide-react";
import { useEthPrice } from "@/hooks/use-eth-price";
import { PRICE_RANGE_PRESETS } from "@/lib/constants";

interface PriceRangeSelectorProps {
  minPrice: number;
  maxPrice: number;
  onPriceChange: (min: number, max: number) => void;
}

export function PriceRangeSelector({
  minPrice,
  maxPrice,
  onPriceChange,
}: PriceRangeSelectorProps) {
  const { ethPrice: ethPriceUSD } = useEthPrice();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    "VOLATILE"
  );
  const [hasInitialized, setHasInitialized] = useState(false);

  // Always use the ETH price from the price feed
  const marketPrice = ethPriceUSD;

  // Set initial price range to VOLATILE preset when market price is available
  useEffect(() => {
    if (marketPrice > 0 && !hasInitialized) {
      const percentage = PRICE_RANGE_PRESETS.VOLATILE.value;
      const min = marketPrice * (1 - percentage / 100);
      const max = marketPrice * (1 + percentage / 100);
      onPriceChange(Number(min.toFixed(2)), Number(max.toFixed(2)));
      setHasInitialized(true);
    }
  }, [marketPrice, hasInitialized, onPriceChange]);

  // Calculate percentages from market price
  const minPercentage = (
    ((minPrice - marketPrice) / marketPrice) *
    100
  ).toFixed(1);
  const maxPercentage = (
    ((maxPrice - marketPrice) / marketPrice) *
    100
  ).toFixed(1);

  // Format number with comma separators
  const formatNumber = (value: number): string => {
    if (!value || isNaN(value)) return "0.00";
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Handle preset selection
  const selectPreset = (presetKey: string, percentage: number) => {
    const min = marketPrice * (1 - percentage / 100);
    const max = marketPrice * (1 + percentage / 100);
    onPriceChange(Number(min.toFixed(2)), Number(max.toFixed(2)));
    setSelectedPreset(presetKey);
  };

  // Handle slider change (asymmetric)
  const handleSliderChange = (values: number[]) => {
    const [minPercent, maxPercent] = values;
    const min = marketPrice * (1 + minPercent / 100);
    const max = marketPrice * (1 + maxPercent / 100);
    onPriceChange(Number(min.toFixed(2)), Number(max.toFixed(2)));
    setSelectedPreset(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium">Price Range</h3>
      </div>

      <Card className="p-4 bg-muted/50">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">
            Current Market Price
          </p>
          <p className="text-2xl font-mono font-bold">
            ${formatNumber(marketPrice)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Price from external feed
          </p>
        </div>
      </Card>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          Quick Range Presets
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(PRICE_RANGE_PRESETS).map(([key, preset]) => (
            <Button
              key={key}
              variant={selectedPreset === key ? "default" : "outline"}
              size="sm"
              onClick={() => selectPreset(key, preset.value)}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground">
          Custom Range (Asymmetric)
        </Label>
        <div className="px-6 py-4 rounded-lg border bg-card">
          <div className="space-y-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>-30%</span>
              <span className="font-medium">Market Price</span>
              <span>+30%</span>
            </div>
            <Slider
              value={[
                ((minPrice - marketPrice) / marketPrice) * 100,
                ((maxPrice - marketPrice) / marketPrice) * 100,
              ]}
              min={-30}
              max={30}
              step={0.5}
              onValueChange={handleSliderChange}
              className="py-4"
              minStepsBetweenThumbs={1}
            />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Min Price</p>
                <p className="font-mono font-medium">
                  ${formatNumber(minPrice)}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {Number(minPercentage) > 0 ? "+" : ""}
                  {minPercentage}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Max Price</p>
                <p className="font-mono font-medium">
                  ${formatNumber(maxPrice)}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {Number(maxPercentage) > 0 ? "+" : ""}
                  {maxPercentage}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
