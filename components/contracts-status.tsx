"use client";

import { useContracts } from "@/hooks/use-contracts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

export function ContractsStatus() {
  const { contracts, isLoading, error } = useContracts();

  if (isLoading) {
    return (
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription className="ml-2">
          Loading contracts from database...
        </AlertDescription>
      </Alert>
    );
  }

  if (error || !contracts) {
    return (
      <Alert className="border-red-500/50 bg-red-500/10">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="ml-2">
          <div className="space-y-2">
            <p className="font-medium">No contracts deployed</p>
            <p className="text-sm">
              Run{" "}
              <code className="px-1 py-0.5 bg-secondary rounded">
                bun run deploy-contracts
              </code>{" "}
              to deploy
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-4 bg-green-500/5 border-green-500/20">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-sm text-green-500">Contracts loaded</span>
        <Badge variant="outline" className="ml-auto text-xs">
          {contracts.mangrove.slice(0, 6)}...{contracts.mangrove.slice(-4)}
        </Badge>
      </div>
    </Card>
  );
}
