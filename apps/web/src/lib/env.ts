import { parseWebEnv, type WebEnv } from "@gloss/shared/env";

const mode =
  typeof import.meta.env.MODE === "string"
    ? import.meta.env.MODE
    : "development";
const apiBaseUrl =
  typeof import.meta.env.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL
    : "";

export const webEnv: WebEnv = parseWebEnv({
  MODE: mode,
  VITE_API_BASE_URL: apiBaseUrl,
});
