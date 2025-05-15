import { apiClient } from "@/api-helpers/client";
import { z } from "zod";

// Schema for reminder request
const reminderRequestSchema = z.object({
  receiverId: z.string(),
  reminderType: z.enum(["USER", "SPLIT"]),
  splitId: z.string().optional(),
  content: z.string().optional(),
});

// Schema for reminder response
const reminderResponseSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  reminderType: z.string(),
  splitId: z.string().nullable(),
  content: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ReminderRequest = z.infer<typeof reminderRequestSchema>;
export type ReminderResponse = z.infer<typeof reminderResponseSchema>;

// Send a reminder
export const sendReminder = async (data: ReminderRequest): Promise<ReminderResponse> => {
  const response = await apiClient.post("/reminders", data);
  return reminderResponseSchema.parse(response);
};

// Get reminders for the current user
export const getReminders = async (): Promise<ReminderResponse[]> => {
  const response = await apiClient.get("/reminders");
  return z.array(reminderResponseSchema).parse(response);
};