import { z } from "zod";

/////////////////////////////////////////
// GROUP SCHEMA
/////////////////////////////////////////

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  description: z.string().nullable(),
  image: z.string().nullable(),
  defaultCurrency: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  type: z.enum(["PERSONAL", "BUSINESS"]).default("PERSONAL"),
  lockPrice: z.boolean(),
  groupBalances: z.array(
    z.object({
      currency: z.string(),
      amount: z.number(),
      userId: z.string(),
    })
  ).optional().default([]),
});

export type Group = z.infer<typeof GroupSchema>;

export default GroupSchema;
