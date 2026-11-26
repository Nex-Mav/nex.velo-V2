/* Nex.Velo proxy client: registers /sw.js, builds the Scramjet controller on your Wisp server, and gives the Browser
   window an ENGINE.go(iframe, url) to load pages through it.
   Load after the page scripts, with these tags first:
     <script src="/scramjet/scramjet.js"></script>
     <script src="/controller/controller.api.js"></script>
     <script src="/libcurl/index.js"></script>
     <script src="/proxy.js"></script> */
(() => {
	if (typeof ENGINE === "undefined" || !("serviceWorker" in navigator) || typeof $scramjetController === "undefined" || typeof LibcurlTransport === "undefined") {
		console.warn("proxy.js: Scramjet files not found, the Browser window will show its setup notice");
		return;
	}
	const wisp = () => (typeof getWisp === "function" ? getWisp() : "wss://nex-velo.nexero.workers.dev/wisp/");
	const frames = new WeakMap();
	let ctl = null, ready = null, usedWisp = "";
	const client = () => new LibcurlTransport.LibcurlClient({ wisp: usedWisp = wisp() });
	function init() {
		return ready || (ready = (async () => {
			const reg = await navigator.serviceWorker.register("/sw.js");
			await navigator.serviceWorker.ready;
			const sw = navigator.serviceWorker.controller || reg.active;
			ctl = new $scramjetController.Controller({ serviceworker: sw, transport: client() });
			await ctl.wait();
			return ctl;
		})());
	}
	ENGINE.go = async (iframe, url) => {
		const c = await init();
		if (usedWisp !== wisp()) c.setTransport(client());   // the Wisp address was changed in Settings
		let f = frames.get(iframe);
		if (!f) { f = c.createFrame(iframe); frames.set(iframe, f); }
		f.go(url);
	};
})();
