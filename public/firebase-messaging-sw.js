// public/firebase-messaging-sw.js
// Firebase Cloud Messaging background service worker for RapidAID

importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

// Initialize Firebase App in service worker context
const firebaseConfig = {
  projectId: "rapidaid-9c11e",
  messagingSenderId: "750443249827",
  appId: "1:750443249827:web:1fcd7b397118e8c3457f16",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message:", payload);

  const notificationTitle =
    payload.notification?.title ||
    payload.data?.title ||
    "RapidAID Disaster Alert";

  const notificationOptions = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      payload.data?.message ||
      "Emergency alert update received.",
    icon: payload.notification?.icon || "/logo.svg",
    badge: "/logo.svg",
    data: payload.data || {},
    tag: payload.data?.alertId || payload.data?.reportId || "rapidaid-emergency-alert",
    renotify: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/home";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
