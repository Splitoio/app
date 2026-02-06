import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface Receipt {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CLEARED";
  imageUrl?: string;
  fileKey?: string;
  groupId: string;
  submittedById: string;
  approvedById?: string;
  createdAt: string;
  updatedAt: string;
  submittedBy: {
    id: string;
    name: string;
    image?: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    image?: string;
  };
}

export const useGetReceipts = (groupId: string) => {
  return useQuery<Receipt[]>({
    queryKey: ["receipts", groupId],
    queryFn: async () => {
      const { data } = await axios.get(
        `${BACKEND_URL}/api/receipts/group/${groupId}`,
        { withCredentials: true }
      );
      return data;
    },
    enabled: !!groupId,
  });
};

export const useCreateReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      payload,
    }: {
      groupId: string;
      payload: Partial<Receipt>;
    }) => {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/receipts/group/${groupId}`,
        payload,
        { withCredentials: true }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["receipts", variables.groupId] });
      toast.success("Receipt submitted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to submit receipt");
    },
  });
};

export const useUpdateReceiptStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      receiptId,
      groupId,
      status,
    }: {
      receiptId: string;
      groupId: string;
      status: string;
    }) => {
      const { data } = await axios.patch(
        `${BACKEND_URL}/api/receipts/${receiptId}/status`,
        { status },
        { withCredentials: true }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["receipts", variables.groupId] });
      toast.success(`Receipt marked as ${variables.status.toLowerCase()}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update receipt status");
    },
  });
};

export const useUpdateReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      receiptId,
      groupId,
      payload,
    }: {
      receiptId: string;
      groupId: string;
      payload: { description?: string; amount?: number; currency?: string; imageUrl?: string; fileKey?: string };
    }) => {
      const { data } = await axios.patch(
        `${BACKEND_URL}/api/receipts/${receiptId}`,
        payload,
        { withCredentials: true }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["receipts", variables.groupId] });
      toast.success("Receipt updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update receipt");
    },
  });
};

export const useDeleteReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      receiptId,
      groupId,
    }: {
      receiptId: string;
      groupId: string;
    }) => {
      await axios.delete(`${BACKEND_URL}/api/receipts/${receiptId}`, {
        withCredentials: true,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["receipts", variables.groupId] });
      toast.success("Receipt deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete receipt");
    },
  });
};
