"use client";

import Image from "next/image";
import { Wallet } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { formatUnits } from "viem";

interface WalletBalanceCardProps {
  wethBalance: bigint;
  usdcBalance: bigint;
}

export function WalletBalanceCard({
  wethBalance,
  usdcBalance,
}: WalletBalanceCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Your Balances</h3>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="flex items-center gap-3">
          <Image
            src="/assets/eth.svg"
            alt="WETH"
            width={32}
            height={32}
            className="rounded-full"
          />
          <div>
            <p className="text-muted-foreground text-xs uppercase">WETH</p>
            <p className="font-mono text-lg font-medium">
              {formatNumber(formatUnits(wethBalance, 18), 4)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Image
            src="/assets/usdc.svg"
            alt="USDC"
            width={32}
            height={32}
            className="rounded-full"
          />
          <div>
            <p className="text-muted-foreground text-xs uppercase">USDC</p>
            <p className="font-mono text-lg font-medium">
              {formatNumber(formatUnits(usdcBalance, 6), 2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
