import { apiClient } from "@/api/client";
import { GroupSchema } from "@/api/modelSchema";

export const createGroup = async (payload: {
  name: string;
  currency: string;
}) => {
  const response = await apiClient.post("/groups", payload);
  return GroupSchema.parse(response);
};
