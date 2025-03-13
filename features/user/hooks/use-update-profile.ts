import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import { useMutation } from "@tanstack/react-query";
import { getUser, updateUser } from "../api/client";

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER] });
    },
  });
};

export const useGetUser = () => {
  return useQuery({
    queryKey: [QueryKeys.USER],
    queryFn: getUser,
  });
};
