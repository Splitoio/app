export type AppMode = "personal" | "organization" | "both";

// Use NEXT_PUBLIC_APP_MODE so client and middleware see the same value. When running
// org app locally, start with: NEXT_PUBLIC_APP_MODE=organization APP_MODE=organization npm run dev
// (or: npm run dev:organization and npm run dev:personal for the other)
const rawMode =
  process.env.NEXT_PUBLIC_APP_MODE ?? process.env.APP_MODE ?? "both";

const normalizedMode = rawMode.trim().toLowerCase();

export const APP_MODE: AppMode =
  normalizedMode === "personal" ||
  normalizedMode === "organization" ||
  normalizedMode === "both"
    ? (normalizedMode as AppMode)
    : "both";

export const isPersonalEnabled =
  APP_MODE === "personal" || APP_MODE === "both";
export const isOrganizationEnabled =
  APP_MODE === "organization" || APP_MODE === "both";

export const defaultPostLoginPath =
  APP_MODE === "organization" ? "/organization" : "/";

