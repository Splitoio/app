import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addOrEditExpense,
  createGroup,
  ExpensePayload,
  getAllGroups,
  getAllGroupsWithBalances,
  getGroupById,
  joinGroup,
} from "../api/client";
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

export const useGetAllGroups = () => {
  return useQuery({
    queryKey: [QueryKeys.GROUPS],
    queryFn: getAllGroups,
  });
};

export const useGetAllGroupsWithBalances = () => {
  return useQuery({
    queryKey: [QueryKeys.BALANCES],
    queryFn: getAllGroupsWithBalances,
  });
};

export const useJoinGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
    },
  });
};

export const useAddOrEditExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      payload,
    }: {
      groupId: string;
      payload: ExpensePayload;
    }) => addOrEditExpense(groupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.EXPENSES],
      });
    },
  });
};

export const useGetGroupById = (groupId: string) => {
  return useQuery({
    queryKey: [QueryKeys.GROUPS, groupId],
    queryFn: () => getGroupById(groupId),
  });
};
