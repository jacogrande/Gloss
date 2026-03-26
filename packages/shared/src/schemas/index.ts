import { z } from "zod";

import { apiErrorCodeSchema } from "../errors/index";

export const requestIdSchema = z.uuid();

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string().min(1),
  requestId: requestIdSchema.optional(),
});

export const apiErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: apiErrorSchema,
});

export const createApiSuccessSchema = <TData extends z.ZodTypeAny>(
  dataSchema: TData,
): z.ZodObject<{
  ok: z.ZodLiteral<true>;
  data: TData;
}> =>
  z.object({
    ok: z.literal(true),
    data: dataSchema,
  });

export const apiTimestampSchema = z.iso.datetime();
