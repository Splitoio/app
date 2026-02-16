import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getContractsByOrganization,
  getContractByToken,
  getMyContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
  claimContractByToken,
} from "../api/client";
import { QueryKeys } from "@/lib/constants";

export const useGetContractsByOrganization = (organizationId: string) => {
  return useQuery({
    queryKey: [QueryKeys.CONTRACTS, organizationId],
    queryFn: () => getContractsByOrganization(organizationId),
    enabled: !!organizationId,
  });
};

export const useGetContractByToken = (token: string | null) => {
  return useQuery({
    queryKey: [QueryKeys.CONTRACTS, "by-token", token],
    queryFn: () => getContractByToken(token!),
    enabled: !!token,
  });
};

export const useGetMyContracts = () => {
  return useQuery({
    queryKey: [QueryKeys.CONTRACTS, "my"],
    queryFn: getMyContracts,
  });
};

export const useGetContractById = (contractId: string | null) => {
  return useQuery({
    queryKey: [QueryKeys.CONTRACTS, contractId],
    queryFn: () => getContractById(contractId!),
    enabled: !!contractId,
  });
};

export const useCreateContract = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContract,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.CONTRACTS, variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.CONTRACTS, "my"] });
    },
  });
};

export const useUpdateContract = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, ...payload }: { contractId: string } & Parameters<typeof updateContract>[1]) =>
      updateContract(contractId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.CONTRACTS] });
    },
  });
};

export const useDeleteContract = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.CONTRACTS] });
    },
  });
};

export const useClaimContractByToken = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: claimContractByToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.CONTRACTS] });
    },
  });
};
