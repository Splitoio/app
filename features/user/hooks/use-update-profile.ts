import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import { useMutation } from "@tanstack/react-query";
import { getUser, updateUser, getUserAcceptedTokens, addUserAcceptedToken, removeUserAcceptedToken } from "../api/client";
import { toast } from "sonner";

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER] });
    },
    onError: (error) => {
      toast.error("Error updating profile", {
        description: error.message || "Unknown error",
      });
    },
  });
};

export const useGetUser = () => {
  return useQuery({
    queryKey: [QueryKeys.USER],
    queryFn: getUser,
  });
};

const ACCEPTED_TOKENS_KEY = ["user-accepted-tokens"];

export const useGetUserAcceptedTokens = () => {
  return useQuery({
    queryKey: ACCEPTED_TOKENS_KEY,
    queryFn: getUserAcceptedTokens,
    staleTime: 0,
  });
};

export const useAddUserAcceptedToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addUserAcceptedToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCEPTED_TOKENS_KEY }),
  });
};

export const useRemoveUserAcceptedToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeUserAcceptedToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCEPTED_TOKENS_KEY }),
  });
};
