import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMembersToGroup,
  addOrEditExpense,
  createGroup,
  deleteGroup,
  ExpensePayload,
  getAllGroups,
  getAllGroupsWithBalances,
  getGroupById,
  joinGroup,
  updateGroup,
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

export const useAddMembersToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      memberIdentifier,
    }: {
      groupId: string;
      memberIdentifier: string;
    }) => addMembersToGroup(groupId, memberIdentifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
    },
    onError: (error: any) => {
      // Check for uncleared dues error - this assumes the API returns a specific message
      // when a group can't be deleted due to uncleared dues
      if (
        error?.message?.toLowerCase().includes("dues") ||
        error?.message?.toLowerCase().includes("balance") ||
        error?.data?.message?.toLowerCase().includes("dues") ||
        error?.data?.message?.toLowerCase().includes("balance")
      ) {
        return {
          type: "uncleared_dues",
          message: error.message || "Cannot delete group with uncleared dues",
        };
      }

      // Return a generic error otherwise
      return {
        type: "generic_error",
        message: error.message || "Failed to delete group",
      };
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      payload,
    }: {
      groupId: string;
      payload: {
        name?: string;
        description?: string;
        currency?: string;
        imageUrl?: string;
      };
    }) => updateGroup(groupId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.GROUPS, variables.groupId],
      });
    },
  });
};
