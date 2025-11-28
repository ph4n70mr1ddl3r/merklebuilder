'use client';

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { wagmiConfig } from "../lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 5000,
      },
    },
  }));
  
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Toaster 
          position="top-right" 
          expand={false}
          richColors
          closeButton
          duration={5000}
        />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

