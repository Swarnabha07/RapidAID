import {
  isSupported,
  getToken,
  onMessage,
  type Messaging,
  type MessagePayload,
  type Unsubscribe,
} from "firebase/messaging";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, getClientMessaging } from "@/lib/firebase/config";

export type { MessagePayload, Unsubscribe };

/**
 * Checks if the browser currently supports Notification API and is granted.
 */
export function isNotificationPermissionGranted(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
}

/**
 * Requests browser push notification permission, retrieves an FCM registration token,
 * registers the service worker, and persists the token to users/{userId}.fcmToken in Firestore.
 */
export async function requestPushPermissionAndSaveToken(
  userId: string
): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // 1. Verify browser supports Firebase Messaging / Service Workers
    const supported = await isSupported();
    if (!supported) {
      console.warn("[FCM] Firebase Messaging is not supported in this browser environment.");
      return null;
    }

    if (!("Notification" in window)) {
      console.warn("[FCM] System notifications are not supported in this browser.");
      return null;
    }

    // 2. Request user permission for push notifications
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log(`[FCM] Notification permission was: ${permission}`);
      return null;
    }

    // 3. Register or resolve the background messaging service worker
    let swRegistration: ServiceWorkerRegistration | undefined = undefined;
    if ("serviceWorker" in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn("[FCM] Service worker registration note:", swErr);
      }
    }

    // 4. Retrieve initialized client messaging instance
    const messagingInstance = await getClientMessaging();
    if (!messagingInstance) {
      console.warn("[FCM] Messaging instance could not be initialized.");
      return null;
    }

    // 5. Retrieve device FCM token via VAPID key
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token && userId) {
      // 6. Update user document with token in Firestore
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        fcmToken: token,
        lastActiveAt: serverTimestamp(),
      });
      console.log(`[FCM] Token stored in Firestore for users/${userId}`);
    }

    return token || null;
  } catch (err: any) {
    console.error("[FCM] Error requesting push permission or saving token:", err);
    return null;
  }
}

/**
 * Subscribes to foreground push notifications while the web application is active.
 * Real-time disaster alerts delivered while the user is using the app will trigger this callback.
 */
export async function subscribeToForegroundMessages(
  callback: (payload: MessagePayload) => void
): Promise<Unsubscribe | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) return null;

    const messagingInstance = await getClientMessaging();
    if (!messagingInstance) return null;

    return onMessage(messagingInstance, (payload) => {
      console.log("[FCM Foreground Message]:", payload);
      callback(payload);
    });
  } catch (err) {
    console.warn("[FCM] Failed to subscribe to foreground messages:", err);
    return null;
  }
}
