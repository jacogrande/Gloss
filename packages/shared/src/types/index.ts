import type { z } from "zod";

import {
  healthDataSchema,
  profileSchema,
  sessionDataSchema,
  sessionRecordSchema,
  sessionUserSchema,
} from "../contracts/index";
import { apiErrorSchema } from "../schemas/index";

export type ApiError = z.infer<typeof apiErrorSchema>;

export type HealthData = z.infer<typeof healthDataSchema>;

export type Profile = z.infer<typeof profileSchema>;

export type SessionData = z.infer<typeof sessionDataSchema>;

export type SessionRecord = z.infer<typeof sessionRecordSchema>;

export type SessionUser = z.infer<typeof sessionUserSchema>;
