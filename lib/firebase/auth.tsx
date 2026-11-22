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
  onIdTokenChanged,
  signInAnonymously,
  type User,
  type UserCredential,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import {
  normalizeRole,
  type UserProfile,
  type UserRole,
} from "@/lib/types/user";

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export function getRoleRedirectPath(
  role: UserRole | string | null | undefined,
): string {
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
 * Asks the server to set up this account (users/{uid} document and the default "victim" role claim).
 *
 * SECURITY: the client can NOT choose a role. The server ignores any role sent from the browser.
 * Medical, rescue and admin roles are granted only by an administrator using scripts/set-role.mjs.
 */
async function syncAccount(user: User, displayName?: string): Promise<void> {
  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/auth/role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        displayName: displayName || user.displayName || undefined,
      }),
    });
    if (!res.ok) {
      console.warn("Account setup via /api/auth/role was not ok:", res.status);
    }
  } catch (err) {
    console.error("Failed to set up account via /api/auth/role:", err);
  }
}

/**
 * Runs after every successful sign-in: server account setup, then a forced token refresh
 * so the new custom claim (if any) is present in the ID token.
 */
async function completeSignIn(user: User, displayName?: string): Promise<void> {
  await syncAccount(user, displayName);
  await user.getIdToken(true);
}

/**
 * Ensures a Firebase-authenticated user exists for emergency reporting.
 *
 * Existing signed-in users are reused. Visitors without an account receive
 * a Firebase anonymous session. Anonymous users are NOT passed through
 * completeSignIn() and are never assigned a responder role.
 */
export async function ensureEmergencyUser(): Promise<User> {
  // Wait until Firebase has restored any persisted authentication session.
  await auth.authStateReady();

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

/**
 * Sign in using Google OAuth Popup.
 */
export async function signInWithGoogle(
  // Kept for backward compatibility. Roles can no longer be chosen by the client; this is ignored.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _preferredRole?: UserRole,
): Promise<UserCredential> {
  const cred = await signInWithPopup(auth, googleProvider);
  await completeSignIn(cred.user);
  return cred;
}

/**
 * Sign in with Email and Password.
 */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await completeSignIn(cred.user);
  return cred;
}

/**
 * Sign up with Email and Password. New accounts always start as "victim".
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  // Kept for backward compatibility. Every new account is "victim"; this is ignored.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _role: UserRole = "victim",
): Promise<UserCredential> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  await completeSignIn(cred.user, displayName);
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
    role?: UserRole,
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
    // The role comes ONLY from the signed token claim (set by the server / set-role script).
    let resolvedRole: UserRole = "victim";
    try {
      const tokenResult = await firebaseUser.getIdTokenResult();
      resolvedRole = normalizeRole(tokenResult.claims.role);
    } catch (err) {
      console.error("Error reading token claims:", err);
    }
    setRole(resolvedRole);

    // The profile document is display-only data (name, language). It never decides access.
    try {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
    } catch (err) {
      console.warn(
        "Could not load user profile (offline or not created yet):",
        err,
      );
    }
    return resolvedRole;
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
    // onIdTokenChanged also fires when the token is refreshed, so a changed role claim is picked up.
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
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
