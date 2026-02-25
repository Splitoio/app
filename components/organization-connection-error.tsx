"use client";

import { useQueryClient } from "@tanstack/react-query";
import { WifiOff, RefreshCw } from "lucide-react";
import { QueryKeys } from "@/lib/constants";

interface OrganizationConnectionErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function OrganizationConnectionError({
  message = "We couldn't connect to the server. This often happens when the backend isn't running or there's a CORS/network issue.",
  onRetry,
}: OrganizationConnectionErrorProps) {
  const queryClient = useQueryClient();

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: [QueryKeys.BUSINESS_ORGANIZATIONS] });
    onRetry?.();
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-[#101012] border border-amber-500/20 p-6 sm:p-10 text-center max-w-xl mx-auto">
      <div className="flex justify-center mb-4">
        <div className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center">
          <WifiOff className="h-7 w-7 text-amber-400" />
        </div>
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
        Connection problem
      </h3>
      <p className="text-white/60 text-sm sm:text-base mb-6">
        {message}
      </p>
      <p className="text-white/40 text-xs sm:text-sm mb-6">
        Organization tabs (Invoices, Streams, etc.) will appear once the connection is restored.
      </p>
      <button
        onClick={handleRetry}
        className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 px-5 py-2.5 text-sm font-medium transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}
