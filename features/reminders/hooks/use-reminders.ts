import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sendReminder, getReminders, acceptReminder, rejectReminder, type ReminderRequest } from "../api/client";
import { toast } from "sonner";
import { QueryKeys } from "@/lib/constants";

const formatErrorMessage = (error: any) => {
  // Check for specific validation errors
  if (error?.message?.includes("splitId is required when reminderType is SPLIT")) {
    return "Split ID is required for split reminders";
  }
  
  // Check for split data processing errors
  if (error?.message?.includes("invalid_type") && error?.message?.includes("split")) {
    return "Split information is incomplete. Make sure all required fields are provided.";
  }

  // Check for other validation errors
  if (error?.message?.includes("invalid_type")) {
    return "Invalid data provided. Please check all required fields.";
  }

  return error?.message || "An unexpected error occurred";
};

export const useReminders = () => {
  const queryClient = useQueryClient();

  const { data: reminders, isLoading } = useQuery({
    queryKey: [QueryKeys.REMINDERS],
    queryFn: getReminders,
  });

  const { mutate: sendReminderMutation, isPending: isSending } = useMutation({
    mutationFn: (data: ReminderRequest) => sendReminder(data),
    onSuccess: () => {
      toast.success("Reminder sent successfully");
      queryClient.invalidateQueries({ queryKey: [QueryKeys.REMINDERS] });
    },
    onError: (error: any) => {
      toast.error(formatErrorMessage(error));
    },
  });

  const { mutate: acceptReminderMutation, isPending: isAccepting } = useMutation({
    mutationFn: (reminderId: string) => acceptReminder(reminderId),
    onSuccess: () => {
      toast.success("Payment marked as complete");
      queryClient.invalidateQueries({ queryKey: [QueryKeys.REMINDERS] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.ANALYTICS] });
    },
    onError: (error: any) => {
      toast.error(formatErrorMessage(error));
    },
  });

  const { mutate: rejectReminderMutation, isPending: isRejecting } = useMutation({
    mutationFn: (reminderId: string) => rejectReminder(reminderId),
    onSuccess: () => {
      toast.success("Reminder dismissed");
      queryClient.invalidateQueries({ queryKey: [QueryKeys.REMINDERS] });
    },
    onError: (error: any) => {
      toast.error(formatErrorMessage(error));
    },
  });

  return {
    reminders,
    isLoading,
    sendReminder: sendReminderMutation,
    isSending,
    acceptReminder: acceptReminderMutation,
    isAccepting,
    rejectReminder: rejectReminderMutation,
    isRejecting,
  };
}; 