"use client";

import { useEffect, useState } from "react";
import { queryClient } from "@/api-helpers/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PostHogProvider } from "./PostHogProvider";
export function Providers({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return null;
  }

  return (
    <PostHogProvider>
      <QueryClientProvider client={queryClient}>
        <AptosWalletAdapterProvider>
          <AuthProvider>{children}</AuthProvider>
        </AptosWalletAdapterProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
}
