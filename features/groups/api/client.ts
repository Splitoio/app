import { apiClient } from "@/api/client";
import {
  ExpenseSchema,
  GroupBalanceSchema,
  GroupSchema,
  GroupUserSchema,
  UserSchema,
} from "@/api/modelSchema";
import { z } from "zod";

export const GenericResponseSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});

export const GetAllGroupsScheama = z.object({
  ...GroupSchema.shape,

  createdBy: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export const DetailGroupSchema = z.object({
  ...GroupSchema.shape,
  groupUsers: z.array(
    z.object({
      ...GroupUserSchema.shape,
      user: UserSchema,
    })
  ),
  expenses: z.array(ExpenseSchema),
  groupBalances: z.array(GroupBalanceSchema),
  createdBy: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export type DetailGroup = z.infer<typeof DetailGroupSchema>;
export const createGroup = async (payload: {
  name: string;
  description?: string;
  currency?: string;
  imageUrl?: string;
}) => {
  const response = await apiClient.post("/groups", payload);
  return GroupSchema.parse(response);
};

export const getAllGroups = async () => {
  const response = await apiClient.get("/groups");
  console.log(response);
  return GetAllGroupsScheama.array().parse(response);
};

export const getGroupById = async (groupId: string) => {
  const response = await apiClient.get(`/groups/${groupId}`);
  return DetailGroupSchema.parse(response);
};

export const getAllGroupsWithBalances = async () => {
  const response = await apiClient.get("/groups/balances");
  return GroupSchema.array().parse(response);
};

export const joinGroup = async (groupId: string) => {
  const response = await apiClient.post(`/groups/join/${groupId}`);
  return GroupSchema.parse(response);
};

export const addMembersToGroup = async (
  groupId: string,
  memberIdentifier: string
) => {
  const response = await apiClient.post(`/groups/addMember`, {
    groupId,
    memberIdentifier,
  });
  return GenericResponseSchema.parse(response);
};

export interface ExpensePayload {
  amount: number;
  description: string;
  paidBy: string;
  splitAmong: string[];
  date?: string;
}

export const addOrEditExpense = async (
  groupId: string,
  payload: ExpensePayload
) => {
  const response = await apiClient.post(`/groups/${groupId}/expenses`, payload);
  return response;
};

export const deleteGroup = async (groupId: string) => {
  const response = await apiClient.delete(`/groups/${groupId}`);
  return GenericResponseSchema.parse(response);
};

export const updateGroup = async (
  groupId: string,
  payload: {
    name?: string;
    description?: string;
    currency?: string;
    imageUrl?: string;
  }
) => {
  const response = await apiClient.put(`/groups/${groupId}`, payload);
  return GroupSchema.parse(response);
};
