import { z } from "zod";

import { apiTimestampSchema, createApiSuccessSchema } from "../schemas/index";

export const healthDataSchema = z.object({
  service: z.literal("api"),
  status: z.literal("ok"),
  timestamp: apiTimestampSchema,
});

export const healthResponseSchema = createApiSuccessSchema(healthDataSchema);

export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  image: z.url().nullable(),
  name: z.string().min(1),
});

export const sessionRecordSchema = z.object({
  expiresAt: apiTimestampSchema,
  id: z.string().min(1),
  userId: z.string().min(1),
});

export const profileSchema = z.object({
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
  userId: z.string().min(1),
});

export const sessionDataSchema = z.object({
  profile: profileSchema.nullable(),
  session: sessionRecordSchema,
  user: sessionUserSchema,
});

export const sessionResponseSchema = createApiSuccessSchema(sessionDataSchema);
