importScripts("https://www.gstatic.com/firebasejs/11.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.8.0/firebase-messaging-compat.js");

const urlParams = new URLSearchParams(self.location.search);

firebase.initializeApp({
  apiKey: urlParams.get("apiKey"),
  authDomain: urlParams.get("authDomain"),
  projectId: urlParams.get("projectId"),
  storageBucket: urlParams.get("storageBucket"),
  messagingSenderId: urlParams.get("messagingSenderId"),
  appId: urlParams.get("appId"),
});

const messaging = firebase.messaging();

// Needs to  be updated while code push for PWA updates
const CACHE_NAME = "tech-connect-v1.1.0";

const STATIC_ASSETS = ["/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  const url = new URL(event.request.url);
  const isStaticAsset =
    url.pathname.startsWith("/icons/") || url.pathname.startsWith("/_next/static/");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});

function extractRoute(payload) {
  const data = payload.data || {};
  if (data.route && data.route.startsWith("/")) {
    return data.route;
  }
  return "/explore-feed";
}

function extractTitleBody(payload) {
  const data = payload.data || {};
  return {
    title: data.title || payload.notification?.title || "Tech Connect",
    body: data.body || payload.notification?.body || "You have a new notification",
  };
}

function openRoute(route) {
  const urlToOpen = new URL(route, self.location.origin).href;

  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    if (clientList.length > 0) {
      let targetClient = clientList[0];
      for (const client of clientList) {
        if (client.focused) {
          targetClient = client;
          break;
        }
      }
      return targetClient.focus().then((client) => {
        if (client && "navigate" in client) {
          return client.navigate(urlToOpen);
        }
      });
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(urlToOpen);
    }
  });
}

messaging.onBackgroundMessage((payload) => {
  const { title, body } = extractTitleBody(payload);
  const route = extractRoute(payload);

  return self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { route },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const route = notifData.route || "/explore-feed";

  event.waitUntil(openRoute(route));
});
