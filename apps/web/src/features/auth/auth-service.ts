import { requestDocument } from "../../lib/http";
import { webEnv } from "../../lib/env";

type AuthFormFields = {
  email: string;
  name: string;
  password: string;
};

const toErrorMessage = (value: unknown): string => {
  if (value instanceof Error && value.message.length > 0) {
    return value.message;
  }

  return "The request could not be completed.";
};

export const signInWithPassword = async (
  fields: AuthFormFields,
): Promise<void> => {
  await requestDocument({
    apiBaseUrl: webEnv.VITE_API_BASE_URL,
    body: {
      email: fields.email,
      password: fields.password,
    },
    method: "POST",
    pathname: "/api/auth/sign-in/email",
  });
};

export const signUpWithPassword = async (
  fields: AuthFormFields,
): Promise<void> => {
  await requestDocument({
    apiBaseUrl: webEnv.VITE_API_BASE_URL,
    body: {
      email: fields.email,
      name: fields.name,
      password: fields.password,
    },
    method: "POST",
    pathname: "/api/auth/sign-up/email",
  });
};

export const signOutCurrentSession = async (): Promise<void> => {
  await requestDocument({
    apiBaseUrl: webEnv.VITE_API_BASE_URL,
    method: "POST",
    pathname: "/api/auth/sign-out",
  });
};

export const getAuthErrorMessage = (value: unknown): string =>
  toErrorMessage(value);
