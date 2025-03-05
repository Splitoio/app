import { apiClient } from "@/api/client";
import { z } from "zod";

const GenericResponseSchema = z.object({
  message: z.string(),
  status: z.string(),
});

const FriendInviteSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  status: z.enum(["pending", "accepted"]),
});

const FriendSchema = z.object({
  friend: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
  }),
});

export const inviteFriend = async (payload: {
  email: string;
  sendInviteEmail: boolean;
}) => {
  const response = await apiClient.post("/users/friends/invite", payload);
  return FriendInviteSchema.parse(response);
};

// Add new function for adding friends
export const addFriend = async (friendIdentifier: string) => {
  const response = await apiClient.post("/users/friends/add", {
    friendIdentifier,
  });
  return GenericResponseSchema.parse(response);
};

export const getFriends = async () => {
  const response = await apiClient.get("/users/friends");
  return z.array(FriendSchema).parse(response);
};
