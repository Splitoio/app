import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addFriend } from "../api/client";
import { QueryKeys } from "@/lib/constants";

export const useAddFriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.FRIENDS] });
    },
  });
};
