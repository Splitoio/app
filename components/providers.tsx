"use client";

import { useEffect, useState } from "react";
import { queryClient } from "@/api-helpers/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
export function Providers({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
