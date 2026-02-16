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
  });
}; 