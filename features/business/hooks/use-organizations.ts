import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllOrganizations,
  createOrganization,
  getOrganizationById,
} from "../api/client";
import { QueryKeys } from "@/lib/constants";

export const useGetAllOrganizations = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [QueryKeys.BUSINESS_ORGANIZATIONS],
    queryFn: getAllOrganizations,
    enabled: options?.enabled ?? true,
  });
};

export const useGetOrganizationById = (organizationId: string) => {
  return useQuery({
    queryKey: [QueryKeys.BUSINESS_ORGANIZATIONS, organizationId],
    queryFn: () => getOrganizationById(organizationId),
    enabled: !!organizationId,
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.BUSINESS_ORGANIZATIONS] });
    },
  });
};
