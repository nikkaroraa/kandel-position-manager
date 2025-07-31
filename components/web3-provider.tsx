"use client";

import { WagmiProvider, createConfig } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { injected } from "wagmi/connectors";
import {
  NETWORK_CONFIGS,
  getCurrentNetwork,
  getTransports,
} from "@/src/config/networks";
import { useAnvilAccounts } from "@/hooks/use-anvil-accounts";

const currentNetwork = getCurrentNetwork();
const networkConfig = NETWORK_CONFIGS[currentNetwork];

// Configure wagmi with injected connector
const config = createConfig({
  chains: [networkConfig.chain],
  transports: getTransports(),
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
});

const queryClient = new QueryClient();

function AnvilDisclaimer() {
  const { firstAccount, isLoading } = useAnvilAccounts();
  
  if (isLoading || !firstAccount) return null;
  
  return (
    <>
      <div className="text-sm text-muted-foreground mb-2">
        <strong>Testing on Anvil?</strong> Use one of the pre-funded accounts:
      </div>
      <code className="text-xs bg-muted p-2 rounded block break-all">
        {firstAccount.address}
      </code>
      <div className="text-xs text-muted-foreground mt-2">
        This is Anvil&apos;s first account with pre-funded ETH and tokens.
      </div>
    </>
  );
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="midnight"
          options={{
            initialChainId: networkConfig.chain.id,
            walletConnectName: "Other Wallets",
            disclaimer: <AnvilDisclaimer />,
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}