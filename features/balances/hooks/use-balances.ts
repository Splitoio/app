import { useQuery } from "@tanstack/react-query";
import { getBalances } from "../api/client";
import { QueryKeys } from "@/lib/constants";

export const useBalances = () => {
  return useQuery({
    queryKey: [QueryKeys.BALANCES],
    queryFn: getBalances,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
};
