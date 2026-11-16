import type { Timestamp } from "firebase/firestore";

export type UserRole = "victim" | "medical" | "rescue" | "admin";

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
