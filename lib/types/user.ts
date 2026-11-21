import type { Timestamp } from "firebase/firestore";

export const USER_ROLES = ["victim", "medical", "rescue", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Role given to every new account. Elevated roles are provisioned by an administrator only. */
export const DEFAULT_ROLE: UserRole = "victim";

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

/**
 * Converts an untrusted value (for example a custom-claim) into a valid role.
 * Anything unknown becomes the least-privileged role.
 */
export function normalizeRole(value: unknown): UserRole {
  return isUserRole(value) ? value : DEFAULT_ROLE;
}

export interface UserProfile {
  userId: string;
  role: UserRole;
  displayName: string;
  preferredLanguage: string;
  fcmToken: string | null;
  createdAt: Timestamp | string | number;
  lastActiveAt: Timestamp | string | number;
  email?: string | null;
  phoneNumber?: string | null;
}
