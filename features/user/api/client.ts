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

export type UserAcceptedToken = {
  id: string;
  tokenId: string;
  chainId: string;
  symbol: string;
  isDefault: boolean;
};

export const getUserAcceptedTokens = async (): Promise<UserAcceptedToken[]> => {
  const response = await apiClient.get("/users/accepted-tokens");
  return response as unknown as UserAcceptedToken[];
};

export const addUserAcceptedToken = async (payload: { tokenId: string; chainId: string }): Promise<UserAcceptedToken> => {
  const response = await apiClient.post("/users/accepted-tokens", payload);
  return response as unknown as UserAcceptedToken;
};

export const removeUserAcceptedToken = async (id: string): Promise<void> => {
  await apiClient.delete(`/users/accepted-tokens/${id}`);
};

// ─── Settlement Preference ───────────────────────────────────────────────────

export interface SettlementPreference {
  chainId: string;
  chain: {
    id: string;
    name: string;
    currency: string;
    logoUrl: string | null;
  };
  tokens: Array<{
    id: string;
    tokenId: string;
    token: {
      id: string;
      name: string;
      symbol: string;
      decimals: number;
      type: string;
      logoUrl: string | null;
      chainId: string;
    };
  }>;
  wallet: {
    id: string;
    address: string;
    chainId: string;
    isDefault: boolean;
    chain: { id: string; name: string };
  } | null;
}

export const getSettlementPreference = async (): Promise<SettlementPreference[]> => {
  const response = await apiClient.get("/users/settlement-preference");
  return (response as unknown as SettlementPreference[]) || [];
};

export const getUserSettlementPreference = async (userId: string): Promise<SettlementPreference[]> => {
  const response = await apiClient.get(`/users/${userId}/settlement-preference`);
  return (response as unknown as SettlementPreference[]) || [];
};

export const saveSettlementPreference = async (payload: {
  tokenIds: string[];
  chainId: string;
  walletAddress: string;
}): Promise<SettlementPreference> => {
  const response = await apiClient.put("/users/settlement-preference", payload);
  return response as unknown as SettlementPreference;
};

export const removeSettlementPreference = async (chainId?: string): Promise<void> => {
  const url = chainId
    ? `/users/settlement-preference?chainId=${encodeURIComponent(chainId)}`
    : "/users/settlement-preference";
  await apiClient.delete(url);
};

export const updateSettlementWallet = async (payload: {
  walletAddress: string;
  chainId?: string;
}): Promise<unknown> => {
  const response = await apiClient.patch("/users/settlement-preference/wallet", payload);
  return response;
};
