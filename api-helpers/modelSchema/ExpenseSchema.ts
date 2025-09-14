import { z } from "zod";
import { SplitTypeSchema } from "../inputTypeSchemas/SplitTypeSchema";
import { CurrencyType } from "../types";

/////////////////////////////////////////
// EXPENSE SCHEMA
/////////////////////////////////////////

// Define the currency type schema
export const CurrencyTypeSchema = z.enum(["FIAT", "TOKEN"]);

export const ExpenseSchema = z.object({
  splitType: SplitTypeSchema,
  id: z.string(),
  paidBy: z.string(),
  addedBy: z.string(),
  name: z.string(),
  category: z.string(),
  amount: z.number(),
  expenseDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  currency: z.string(),
  // New multi-currency fields
  currencyType: CurrencyTypeSchema.default("FIAT"),
  chainId: z.string().nullable().optional(),
  tokenId: z.string().nullable().optional(),
  timeLockIn: z.boolean().default(false),
  convertedAmount: z.number().nullable().optional(),
  exchangeRate: z.number().nullable().optional(),
  fileKey: z.string().nullable(),
  groupId: z.string().nullable(),
  deletedAt: z.coerce.date().nullable(),
  deletedBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
});

export type Expense = z.infer<typeof ExpenseSchema>;

export default ExpenseSchema;
