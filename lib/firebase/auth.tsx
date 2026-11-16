"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
  type UserCredential,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import type { UserProfile, UserRole } from "@/lib/types/user";

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export function getRoleRedirectPath(role: UserRole | string | null | undefined): string {
  switch (role) {
    case "victim":
      return "/home";
    case "medical":
      return "/dashboard";
    case "rescue":
      return "/rescue";
    case "admin":
      return "/dashboard";
    default:
      return "/home";
  }
}

/**
 * Synchronizes user role custom claims via the server-side API endpoint.
 */
async function syncCustomClaims(
  user: User,
  role: UserRole,
  displayName?: string,
  preferredLanguage: string = "en"
): Promise<void> {
  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/auth/role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        role,
        displayName: displayName || user.displayName || "User",
        preferredLanguage,
      }),
    });
    if (!res.ok) {
      console.warn("syncCustomClaims response was not ok:", res.status);
    }
  } catch (err) {
    console.error("Failed to sync custom claims via /api/auth/role:", err);
  }
}

/**
 * Ensures a user document exists in users/{userId} and syncs roles.
 */
async function ensureUserDoc(
  user: User,
  preferredRole?: UserRole
): Promise<UserRole> {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const assignedRole: UserRole = preferredRole || "victim";
    const initialProfile: UserProfile = {
      userId: user.uid,
      displayName: user.displayName || user.email?.split("@")[0] || "User",
      role: assignedRole,
      preferredLanguage: "en",
      fcmToken: null,
      createdAt: serverTimestamp() as any,
      lastActiveAt: serverTimestamp() as any,
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
    };

    await setDoc(userRef, initialProfile);
    await syncCustomClaims(user, assignedRole, user.displayName || undefined);
    await user.getIdToken(true);
    return assignedRole;
  } else {
    await updateDoc(userRef, {
      lastActiveAt: serverTimestamp(),
    });
    const existingRole = (snap.data()?.role as UserRole) || "victim";
    return existingRole;
  }
}

/**
 * Sign in using Google OAuth Popup.
 */
export async function signInWithGoogle(
  preferredRole?: UserRole
): Promise<UserCredential> {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserDoc(cred.user, preferredRole);
  await cred.user.getIdToken(true);
  return cred;
}

/**
 * Sign in with Email and Password.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDoc(cred.user);
  await cred.user.getIdToken(true);
  return cred;
}

/**
 * Sign up with Email and Password, creating a profile and custom claims.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  role: UserRole = "victim"
): Promise<UserCredential> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  await ensureUserDoc(cred.user, role);
  await cred.user.getIdToken(true);
  return cred;
}

/**
 * Send password reset email.
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// ---------------------------------------------------------------------------
// Auth Context & Provider
// ---------------------------------------------------------------------------

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signInWithGoogle: (preferredRole?: UserRole) => Promise<UserCredential>;
  signInWithEmail: (email: string, password: string) => Promise<UserCredential>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
    role?: UserRole
  ) => Promise<UserCredential>;
  resetPassword: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshUserRole: () => Promise<UserRole | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  signOutUser,
  refreshUserRole: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = useCallback(async (firebaseUser: User) => {
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        const resolvedRole = (data.role as UserRole) || "victim";
        setRole(resolvedRole);
        return resolvedRole;
      } else {
        // Doc might still be initializing
        const tokenResult = await firebaseUser.getIdTokenResult();
        const claimRole = (tokenResult.claims.role as UserRole) || "victim";
        setRole(claimRole);
        return claimRole;
      }
    } catch (err) {
      console.error("Error fetching user profile from Firestore:", err);
      return null;
    }
  }, []);

  const refreshUserRole = useCallback(async (): Promise<UserRole | null> => {
    if (!auth.currentUser) {
      setRole(null);
      setProfile(null);
      return null;
    }
    await auth.currentUser.getIdToken(true);
    return await fetchProfileAndRole(auth.currentUser);
  }, [fetchProfileAndRole]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfileAndRole(firebaseUser);
      } else {
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfileAndRole]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOutUser,
        refreshUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
