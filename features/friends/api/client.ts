import { apiClient } from "@/api/client";
import { z } from "zod";

const FriendInviteSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  status: z.enum(["pending", "accepted"]),
});

export const inviteFriend = async (payload: {
  email: string;
  sendInviteEmail: boolean;
}) => {
  const response = await apiClient.post("/users/friends/invite", payload);
  return FriendInviteSchema.parse(response);
};
