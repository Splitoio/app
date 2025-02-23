import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteFriend } from "../api/client";
import { QueryKeys } from "@/lib/constants";

export const useInviteFriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inviteFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.FRIENDS] });
    },
  });
};
