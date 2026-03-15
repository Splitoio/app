import { z } from "zod";

export const UpdateUserResponseSchema = z.object({
  name: z.string().optional(),
  currency: z.string().optional(),
  stellarAccount: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  preferredChain: z.string().nullable().optional(),
  onboardedPersonal: z.boolean().optional(),
  onboardedOrgNoOrg: z.boolean().optional(),
  onboardedOrgInOrg: z.boolean().optional(),
});
