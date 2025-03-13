import { useQuery } from "@tanstack/react-query";
import { getFriends } from "../api/client";
import { QueryKeys } from "@/lib/constants";

export const useGetFriends = () => {
  return useQuery({
    queryKey: [QueryKeys.FRIENDS],
    queryFn: getFriends,
  });
};
