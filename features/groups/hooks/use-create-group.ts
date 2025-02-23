import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGroup } from "../api/client";
import { QueryKeys } from "@/lib/constants";

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
    },
  });
};
