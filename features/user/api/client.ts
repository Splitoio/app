import { apiClient } from "@/api-helpers/client";
import { UserSchema } from "@/api-helpers/modelSchema";
import { z } from "zod";
import { UpdateUserResponseSchema } from "../schemas";
import axios, { AxiosError } from "axios";

export type UserDetails = z.infer<typeof UpdateUserResponseSchema>;

export const updateUser = async (payload: UserDetails) => {
  try {
    // // Log the detailed request for debugging
    // console.log("Update user request payload:", payload);

    // First check if the payload passes validation
    const parsedPayload = UpdateUserResponseSchema.parse(payload);
    // console.log("Parsed payload:", parsedPayload);

    // Make the actual API request
    const response = await apiClient.patch("/users/profile", parsedPayload);
    // console.log("Update user response:", response);

    return UpdateUserResponseSchema.parse(response);
  } catch (error: unknown) {
    // console.error("Update user error:", error);

    // Check if it's a Zod validation error
    if (error instanceof Error && error.name === "ZodError") {
      // console.error("Validation error:", (error as z.ZodError).errors);
    }

    // Check for more detailed API error info
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        // console.error("Response error data:", axiosError.response.data);
        // console.error("Response status:", axiosError.response.status);
        // console.error("Response headers:", axiosError.response.headers);
      }
    }

    throw error;
  }
};

export const getUser = async () => {
  const response = await apiClient.get("/users/me");
  return UserSchema.parse(response);
};
