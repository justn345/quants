// Quants service worker: shows phone/desktop notifications and opens the app when tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: "Quants", body: event.data ? event.data.text() : "" }; }
  const title = typeof d.title === "string" ? d.title.slice(0, 80) : "Quants";
  const url = typeof d.url === "string" && d.url.startsWith("/") ? d.url : "/app";
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof d.body === "string" ? d.body.slice(0, 200) : "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: typeof d.tag === "string" ? d.tag : undefined,
    data: { url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if ("focus" in c) { await c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  })());
});
