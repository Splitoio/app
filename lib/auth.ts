import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // the base url of your auth server
});

export const { signIn, signUp, useSession, signOut } = authClient;
