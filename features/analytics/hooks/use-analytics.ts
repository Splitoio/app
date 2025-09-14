import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import { getAnalytics, AnalyticsData } from "../api/client";

export const useAnalytics = () => {
  return useQuery<AnalyticsData>({
    queryKey: [QueryKeys.ANALYTICS],
    queryFn: getAnalytics,
    staleTime: 1000 * 60 * 1, // Consider data fresh for 1 minute
    refetchOnWindowFocus: true,
    retry: 2,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    refetchOnMount: true,
    select: (data) => {
      // Ensure we always return strings for the UI
      return {
        owed: typeof data.owed === 'string' ? data.owed : `$${Number(data.owed).toFixed(2)} USD`,
        lent: typeof data.lent === 'string' ? data.lent : `$${Number(data.lent).toFixed(2)} USD`,
        settled: typeof data.settled === 'string' ? data.settled : `$${Number(data.settled).toFixed(2)} USD`
      };
    }
  });
}; 