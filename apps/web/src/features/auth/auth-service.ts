import { authClient } from "./auth-client";

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
  const result = await authClient.signIn.email({
    email: fields.email,
    password: fields.password,
  });

  if (result.error) {
    throw new Error(result.error.message ?? "Unable to sign in.");
  }
};

export const signUpWithPassword = async (
  fields: AuthFormFields,
): Promise<void> => {
  const result = await authClient.signUp.email({
    email: fields.email,
    name: fields.name,
    password: fields.password,
  });

  if (result.error) {
    throw new Error(result.error.message ?? "Unable to create account.");
  }
};

export const signOutCurrentSession = async (): Promise<void> => {
  const result = await authClient.signOut();

  if (result.error) {
    throw new Error(result.error.message ?? "Unable to sign out.");
  }
};

export const getAuthErrorMessage = (value: unknown): string =>
  toErrorMessage(value);
