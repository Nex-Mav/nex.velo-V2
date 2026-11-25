/* Nex.Velo proxy service worker (Scramjet controller). Serve this from the site root as /sw.js. */
importScripts("/controller/controller.sw.js");

addEventListener("fetch", (e) => {
	if ($scramjetController.shouldRoute(e)) {
		e.respondWith($scramjetController.route(e));
	}
});
