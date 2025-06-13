// import { z } from "zod";

// /////////////////////////////////////////
// // GROUP SCHEMA
// /////////////////////////////////////////

// export const GroupSchema = z.object({
//   id: z.string(),
//   name: z.string(),
//   userId: z.string(),
//   description: z.string().nullable(),
//   image: z.string().nullable(),
//   defaultCurrency: z.string(),
//   createdAt: z.coerce.date(),
//   updatedAt: z.coerce.date(),
// });

// export type Group = z.infer<typeof GroupSchema>;

// export default GroupSchema;


import { z } from "zod";


const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
 
});

const GroupUserSchema = z.object({
  userId: z.string(),
  
  user: UserSchema.optional(), // Included the related User
});

const GroupBalanceSchema = z.object({
  currency: z.string(),
  userId: z.string(),
  firendId: z.string(),
  amount: z.number(),
  updatedAt: z.coerce.date(),
 
});

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  description: z.string().nullable(),
  image: z.string().nullable(),
  defaultCurrency: z.string(),
  lockPrice: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: UserSchema, // Included the createdBy relation
  groupUsers: z.array(GroupUserSchema), // Included the groupUsers relation as an array
  groupBalances: z.array(GroupBalanceSchema), // Included the groupBalances relation as an array
 
});

export type Group = z.infer<typeof GroupSchema>;

export default GroupSchema;