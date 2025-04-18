import { User } from "@/api-helpers/modelSchema/UserSchema";

/**
 * Enhanced user type that includes client-side properties not in the database
 */
export interface EnhancedUser extends User {
  preferredChain?: string | null;
}

/**
 * Cast a User to an EnhancedUser
 */
export function asEnhancedUser(user: User): EnhancedUser {
  return user as EnhancedUser;
}
