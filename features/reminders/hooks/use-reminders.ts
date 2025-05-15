import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sendReminder, getReminders, type ReminderRequest } from "../api/client";
import { toast } from "sonner";
import { QueryKeys } from "@/lib/constants";

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
      toast.error(error.message || "Failed to send reminder");
    },
  });

  return {
    reminders,
    isLoading,
    sendReminder: sendReminderMutation,
    isSending,
  };
}; 