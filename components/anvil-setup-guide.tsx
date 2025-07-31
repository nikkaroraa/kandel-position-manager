"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAnvilAccounts } from "@/hooks/use-anvil-accounts";
import { DELAYS, BLOCKCHAIN_CONSTANTS, DEFAULT_VALUES } from "@/lib/constants";

export function AnvilSetupGuide() {
  const [copiedRpc, setCopiedRpc] = useState(false);
  const { firstAccount, isLoading, error } = useAnvilAccounts();

  const copyToClipboard = async (
    text: string,
    setCopied: (value: boolean) => void
  ) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), DELAYS.COPY_FEEDBACK);
  };

  return (
    <Card className="border-yellow-600/20 bg-yellow-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          Connect to Anvil Test Network
        </CardTitle>
        <CardDescription>
          To deploy Kandel positions, you need to connect to the local Anvil
          network
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            1. Add Anvil Network to MetaMask
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">Network Name:</span>
              <span className="font-mono">Anvil Local</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">RPC URL:</span>
              <div className="flex items-center gap-2">
                <code className="font-mono">http://localhost:8545</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    copyToClipboard("http://localhost:8545", setCopiedRpc)
                  }
                >
                  {copiedRpc ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">Chain ID:</span>
              <span className="font-mono">
                {BLOCKCHAIN_CONSTANTS.ANVIL_CHAIN_ID}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">Currency Symbol:</span>
              <span className="font-mono">ETH</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium">2. Use Test Account</h4>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              When you run{" "}
              <code className="font-mono bg-muted px-1">
                bun run deploy-contracts
              </code>
              , Anvil starts with pre-funded test accounts.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium">To access a test account:</p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                <li>
                  Check the Anvil terminal output for the list of accounts and
                  private keys
                </li>
                <li>Copy the first private key (Account #0)</li>
                <li>Import it into MetaMask using Import Account</li>
              </ol>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="ml-2 text-xs">
                  Checking Anvil connection...
                </span>
              </div>
            ) : error ? (
              <Alert className="border-orange-500/20 bg-orange-500/5">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  Make sure Anvil is running:{" "}
                  <code className="font-mono">bun run deploy-contracts</code>
                </AlertDescription>
              </Alert>
            ) : firstAccount ? (
              <div className="text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  Anvil Connected
                </Badge>
                <span className="ml-2">
                  First account detected:{" "}
                  <code className="font-mono">
                    {firstAccount.address.slice(0, 6)}...
                    {firstAccount.address.slice(-4)}
                  </code>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">3. Switch Network & Connect</h4>
          <p className="text-xs text-muted-foreground">
            After adding the network and importing the account:
          </p>
          <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
            <li>
              Switch to {'"'}Anvil Local{'"'} network in MetaMask
            </li>
            <li>Select the imported test account</li>
            <li>
              Click {'"'}Connect Wallet{'"'} button above
            </li>
          </ol>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">4. Mint Test Tokens</h4>
          <p className="text-xs text-muted-foreground">
            After connecting, mint test tokens for trading:
          </p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium">
              Run this command to mint tokens:
            </p>
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded block">
              bun run mint
            </code>
            <p className="text-xs text-muted-foreground">
              This will mint {DEFAULT_VALUES.MINT_AMOUNTS.WETH} WETH and{" "}
              {DEFAULT_VALUES.MINT_AMOUNTS.USDC} USDC to your connected account
            </p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              Note
            </Badge>
            <span>
              Make sure Anvil is running:{" "}
              <code className="font-mono">bun run deploy-contracts</code>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
