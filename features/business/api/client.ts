import { apiClient } from "@/api-helpers/client";
import {
  ExpenseSchema,
  GroupBalanceSchema,
  GroupSchema,
  GroupUserSchema,
  UserSchema,
} from "@/api-helpers/modelSchema";
import { z } from "zod";

export const GetAllGroupsSchema = z.object({
  ...GroupSchema.shape,

  createdBy: z.object({
    id: z.string(),
    name: z.string(),
  }),
  groupBalances: z.array(GroupBalanceSchema).optional().default([]),
  groupUsers: z.array(z.any()).optional().default([]),
  expenses: z.array(ExpenseSchema).optional().default([]),
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

export type DetailOrganization = z.infer<typeof DetailGroupSchema>;

export const InvoiceStatusSchema = z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED", "APPROVED", "DECLINED", "CLEARED"]);
export const InvoiceSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  issuerId: z.string(),
  recipientId: z.string().nullable(),
  amount: z.number(),
  currency: z.string(),
  status: InvoiceStatusSchema,
  dueDate: z.coerce.date(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable().optional(),
  fileKey: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  issuer: z.object({ id: z.string(), name: z.string().nullable(), image: z.string().nullable(), email: z.string().nullable() }).optional(),
  recipient: z.object({ id: z.string(), name: z.string().nullable(), image: z.string().nullable(), email: z.string().nullable() }).optional().nullable(),
  organization: z.object({ id: z.string(), name: z.string() }).optional(),
});

export const OrganizationActivityTypeSchema = z.enum(["INVOICE_RAISED", "INVOICE_APPROVED", "INVOICE_DECLINED", "INVOICE_CLEARED"]);
export const OrganizationActivitySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  type: OrganizationActivityTypeSchema,
  invoiceId: z.string().nullable(),
  userId: z.string(),
  note: z.string().nullable(),
  createdAt: z.coerce.date(),
  user: z.object({ id: z.string(), name: z.string().nullable(), image: z.string().nullable(), email: z.string().nullable() }).optional(),
  invoice: z
    .object({
      id: z.string(),
      amount: z.number(),
      currency: z.string(),
      issuer: z.object({ id: z.string(), name: z.string().nullable() }).optional(),
      recipient: z.object({ id: z.string(), name: z.string().nullable() }).optional().nullable(),
    })
    .nullable()
    .optional(),
});
export type OrganizationActivity = z.infer<typeof OrganizationActivitySchema>;

export const IncomeStreamSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  currency: z.string(),
  expectedAmount: z.number().nullable(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type IncomeStream = z.infer<typeof IncomeStreamSchema>;

export type Invoice = z.infer<typeof InvoiceSchema>;

export const getAllOrganizations = async () => {
  const response = await apiClient.get("/groups", { params: { type: "BUSINESS" } });
  return GetAllGroupsSchema.array().parse(response);
};

export const createOrganization = async (payload: {
  name: string;
  description?: string;
  currency?: string;
  imageUrl?: string;
}) => {
  const response = await apiClient.post("/groups", { ...payload, type: "BUSINESS" });
  return GroupSchema.parse(response);
};

export const getOrganizationById = async (organizationId: string) => {
  const response = await apiClient.get(`/groups/${organizationId}`, { params: { type: "BUSINESS" } });
  return DetailGroupSchema.safeParse(response).data;
};

export const createInvoice = async (payload: {
  organizationId: string;
  amount: number;
  currency: string;
  dueDate: string;
  description?: string;
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" | "APPROVED" | "DECLINED" | "CLEARED";
  imageUrl?: string;
  fileKey?: string;
}) => {
  const response = await apiClient.post("/invoices", payload);
  return InvoiceSchema.parse(response);
};

export const getInvoicesByOrganization = async (organizationId: string) => {
  const response = await apiClient.get(`/invoices/organization/${organizationId}`);
  return InvoiceSchema.array().parse(response);
};

export const getInvoiceById = async (invoiceId: string) => {
  const response = await apiClient.get(`/invoices/${invoiceId}`);
  return InvoiceSchema.parse(response);
};

export const updateInvoice = async (
  invoiceId: string,
  payload: {
    amount?: number;
    currency?: string;
    dueDate?: string;
    description?: string;
    status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" | "APPROVED" | "DECLINED" | "CLEARED";
    imageUrl?: string;
    fileKey?: string;
  }
) => {
  const response = await apiClient.patch(`/invoices/${invoiceId}`, payload);
  return InvoiceSchema.parse(response);
};

export const approveInvoice = async (invoiceId: string) => {
  const response = await apiClient.patch(`/invoices/${invoiceId}/approve`, {});
  return InvoiceSchema.parse(response);
};

export const declineInvoice = async (invoiceId: string, note?: string) => {
  const response = await apiClient.patch(`/invoices/${invoiceId}/decline`, { note });
  return InvoiceSchema.parse(response);
};

export const clearInvoice = async (invoiceId: string) => {
  const response = await apiClient.patch(`/invoices/${invoiceId}/clear`, {});
  return InvoiceSchema.parse(response);
};

export const getOrganizationActivity = async (organizationId: string) => {
  const response = await apiClient.get(`/invoices/organization/${organizationId}/activity`);
  return OrganizationActivitySchema.array().parse(response);
};

export const deleteInvoice = async (invoiceId: string) => {
  await apiClient.delete(`/invoices/${invoiceId}`);
};

// Income streams (organization admin only)
export const getStreamsByOrganization = async (organizationId: string) => {
  const response = await apiClient.get(`/groups/${organizationId}/streams`);
  return IncomeStreamSchema.array().parse(response);
};

export const createStream = async (
  organizationId: string,
  payload: { name: string; currency?: string; expectedAmount?: number | null; description?: string | null }
) => {
  const response = await apiClient.post(`/groups/${organizationId}/streams`, payload);
  return IncomeStreamSchema.parse(response);
};

export const updateStream = async (
  organizationId: string,
  streamId: string,
  payload: { name?: string; currency?: string; expectedAmount?: number | null; description?: string | null }
) => {
  const response = await apiClient.put(`/groups/${organizationId}/streams/${streamId}`, payload);
  return IncomeStreamSchema.parse(response);
};

export const deleteStream = async (organizationId: string, streamId: string) => {
  await apiClient.delete(`/groups/${organizationId}/streams/${streamId}`);
};
