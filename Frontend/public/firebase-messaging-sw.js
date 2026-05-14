importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDhgidWt36x6aTe2E4s0XRDSPrpD8SNvVw",
  authDomain: "carecircle-bdb2b.firebaseapp.com",
  projectId: "carecircle-bdb2b",
  storageBucket: "carecircle-bdb2b.firebasestorage.app",
  messagingSenderId: "501999963851",
  appId: "1:501999963851:web:236d65e45de7d9f789d54e",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "CareCircle Alert";
  const body = payload.notification?.body ?? "";

  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.data?.notification_id ?? "cc-alert",
    data: payload.data ?? {},
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/notifications";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
