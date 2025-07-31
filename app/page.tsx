"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Orderbook } from "@/components/orderbook";
import { DeployKandelForm } from "@/components/deploy-kandel-form";
import { ActivePositions } from "@/components/active-positions";
import { AnvilSetupGuide } from "@/components/anvil-setup-guide";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { ContractsStatus } from "@/components/contracts-status";

export default function Home() {
  const [activeTab, setActiveTab] = useState("deploy");
  const { isConnected } = useAccount();
  const chainId = useChainId();

  const needsSetup = !isConnected || chainId !== 31337;

  // Auto-switch to setup tab if user needs setup
  useEffect(() => {
    if (needsSetup && activeTab !== "setup") {
      setActiveTab("setup");
    }
  }, [needsSetup, activeTab]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Kandel Position Manager</h1>
          <ConnectButton />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <ContractsStatus />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 lg:flex-[2]">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="deploy">Deploy New Position</TabsTrigger>
                <TabsTrigger value="positions">Active Positions</TabsTrigger>
                <TabsTrigger value="setup">Setup Guide</TabsTrigger>
              </TabsList>

              <div className={activeTab === "deploy" ? "block mt-6" : "hidden"}>
                {isConnected ? (
                  <DeployKandelForm />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Please connect your wallet to deploy a Kandel position
                    </p>
                    <ConnectButton />
                  </div>
                )}
              </div>

              <div
                className={activeTab === "positions" ? "block mt-6" : "hidden"}
              >
                {isConnected ? (
                  <ActivePositions />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Please connect your wallet to view your positions
                    </p>
                    <ConnectButton />
                  </div>
                )}
              </div>

              <div className={activeTab === "setup" ? "block mt-6" : "hidden"}>
                <AnvilSetupGuide />
              </div>
            </Tabs>
          </div>

          <div className="flex-1 lg:flex-[1] lg:self-start">
            <Orderbook />
          </div>
        </div>
      </div>
    </div>
  );
}
