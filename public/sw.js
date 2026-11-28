/* Nex.Velo proxy service worker (Scramjet controller). Serve this from the site root as /sw.js. */
importScripts("/controller/controller.sw.js");

/* take over from any older service worker on this address right away */
addEventListener("install", () => self.skipWaiting());
addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

addEventListener("fetch", (e) => {
	if ($scramjetController.shouldRoute(e)) {
		e.respondWith($scramjetController.route(e));
	}
});
