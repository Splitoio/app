import { z } from "zod";

export const UpdateUserResponseSchema = z.object({
  name: z.string().optional(),
  currency: z.string().optional(),
  stellarAccount: z.string().optional(),
  image: z.string().optional(),
});
