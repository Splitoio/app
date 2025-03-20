import { apiClient } from "@/api/client";
import { UserSchema } from "@/api/modelSchema";
import { z } from "zod";
import { UpdateUserResponseSchema } from "../schemas";

export type UserDetails = z.infer<typeof UpdateUserResponseSchema>;

export const updateUser = async (payload: UserDetails) => {
  const parsedPayload = UpdateUserResponseSchema.parse(payload);
  const response = await apiClient.patch("/users/profile", parsedPayload);
  return UpdateUserResponseSchema.parse(response);
};

export const getUser = async () => {
  const response = await apiClient.get("/users/me");
  return UserSchema.parse(response);
};
