import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStreamsByOrganization,
  createStream,
  updateStream,
  deleteStream,
} from "../api/client";
import { QueryKeys } from "@/lib/constants";

export const useGetStreamsByOrganization = (organizationId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [QueryKeys.STREAMS, organizationId],
    queryFn: () => getStreamsByOrganization(organizationId),
    enabled: !!organizationId && (options?.enabled !== false),
  });
};

export const useCreateStream = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      payload,
    }: {
      organizationId: string;
      payload: Parameters<typeof createStream>[1];
    }) => createStream(organizationId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.STREAMS, variables.organizationId] });
    },
  });
};

export const useUpdateStream = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      streamId,
      payload,
    }: {
      organizationId: string;
      streamId: string;
      payload: Parameters<typeof updateStream>[2];
    }) => updateStream(organizationId, streamId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.STREAMS, variables.organizationId] });
    },
  });
};

export const useDeleteStream = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, streamId }: { organizationId: string; streamId: string }) =>
      deleteStream(organizationId, streamId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.STREAMS, variables.organizationId] });
    },
  });
};
