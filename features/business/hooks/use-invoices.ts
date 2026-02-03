import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInvoicesByOrganization,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  approveInvoice,
  declineInvoice,
  clearInvoice,
  getOrganizationActivity,
} from "../api/client";
import { QueryKeys } from "@/lib/constants";

export const useGetInvoicesByOrganization = (organizationId: string) => {
  return useQuery({
    queryKey: [QueryKeys.INVOICES, organizationId],
    queryFn: () => getInvoicesByOrganization(organizationId),
    enabled: !!organizationId,
  });
};

export const useGetInvoiceById = (invoiceId: string) => {
  return useQuery({
    queryKey: [QueryKeys.INVOICES, "detail", invoiceId],
    queryFn: () => getInvoiceById(invoiceId),
    enabled: !!invoiceId,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvoice,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.INVOICES, variables.organizationId] });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: Parameters<typeof updateInvoice>[1] }) =>
      updateInvoice(invoiceId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.INVOICES] });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.INVOICES] });
    },
  });
};

export const useApproveInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveInvoice,
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.INVOICES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.ORGANIZATION_ACTIVITY] });
    },
  });
};

export const useDeclineInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, note }: { invoiceId: string; note?: string }) => declineInvoice(invoiceId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.INVOICES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.ORGANIZATION_ACTIVITY] });
    },
  });
};

export const useClearInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.INVOICES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.ORGANIZATION_ACTIVITY] });
    },
  });
};

export const useGetOrganizationActivity = (organizationId: string) => {
  return useQuery({
    queryKey: [QueryKeys.ORGANIZATION_ACTIVITY, organizationId],
    queryFn: () => getOrganizationActivity(organizationId),
    enabled: !!organizationId,
  });
};
