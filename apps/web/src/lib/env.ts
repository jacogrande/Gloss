const mode =
  typeof import.meta.env.MODE === "string"
    ? import.meta.env.MODE
    : "development";
const apiBaseUrl =
  typeof import.meta.env.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL
    : "";

type WebEnv = {
  MODE: string;
  VITE_API_BASE_URL: string;
};

const parseWebEnv = (value: {
  MODE: string;
  VITE_API_BASE_URL: string;
}): WebEnv => {
  if (value.MODE.length === 0) {
    throw new Error("Expected MODE to be set.");
  }

  if (value.VITE_API_BASE_URL.length === 0) {
    throw new Error("Expected VITE_API_BASE_URL to be set.");
  }

  return value;
};

export const webEnv: WebEnv = parseWebEnv({
  MODE: mode,
  VITE_API_BASE_URL: apiBaseUrl,
});
