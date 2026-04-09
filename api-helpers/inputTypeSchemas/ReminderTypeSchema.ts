import { z } from 'zod';

export const ReminderTypeSchema = z.enum(['USER','SPLIT','NUDGE']);

export type ReminderTypeType = `${z.infer<typeof ReminderTypeSchema>}`

export default ReminderTypeSchema;
