import { apiClient } from "@/api/client";
import { UserSchema } from "@/api/modelSchema";
import { z } from "zod";

export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  currency: z.string().optional(),
  stellarAccount: z.string().optional(),
  image: z.string().optional(),
});

export type UserDetails = z.infer<typeof UpdateUserSchema>;

export const updateUser = async (payload: UserDetails) => {
  const parsedPayload = UpdateUserSchema.parse(payload);
  const response = await apiClient.patch("/users/profile", parsedPayload);
  return UserSchema.parse(response);
};

export const getUser = async () => {
  const response = await apiClient.get("/users/me");
  return UserSchema.parse(response);
};
