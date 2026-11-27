/* Nex.Velo proxy client: registers /sw.js, builds the Scramjet controller on your Wisp server, and gives the Browser
   window an ENGINE.go(iframe, url) to load pages through it.
   Load after the page scripts, with these tags first:
     <script src="/scramjet/scramjet.js"></script>
     <script src="/controller/controller.api.js"></script>
     <script src="/libcurl/index.js"></script>
     <script src="/proxy.js"></script> */
(() => {
	if (typeof ENGINE === "undefined") return;
	const missing = [];
	if (typeof $scramjetController === "undefined") missing.push("/controller/controller.api.js and /scramjet/scramjet.js");
	if (typeof LibcurlTransport === "undefined") missing.push("/libcurl/index.js");
	if (!("serviceWorker" in navigator)) missing.push("service worker support (the page needs https)");
	if (missing.length) {
		ENGINE.go = async () => { throw new Error("these files did not load: " + missing.join(", ") + ". Open Settings, Servers, Check proxy setup."); };
		return;
	}
	const wisp = () => (typeof getWisp === "function" ? getWisp() : "wss://nex-velo.nexero.workers.dev/wisp/");
	const frames = new WeakMap();
	let ctl = null, ready = null, usedWisp = "";
	const client = () => new LibcurlTransport.LibcurlClient({ wisp: usedWisp = wisp() });
	const timeout = (ms, msg) => new Promise((_, no) => setTimeout(() => no(new Error(msg)), ms));
	function init() {
		return ready || (ready = (async () => {
			const reg = await navigator.serviceWorker.register("/sw.js");
			await Promise.race([navigator.serviceWorker.ready, timeout(15000, "the service worker did not start")]);
			const sw = navigator.serviceWorker.controller || reg.active;
			ctl = new $scramjetController.Controller({ serviceworker: sw, transport: client() });
			await Promise.race([ctl.wait(), timeout(20000, "the proxy did not start in time")]);
			return ctl;
		})().catch(e => { ready = null; throw e; }));
	}
	ENGINE.go = async (iframe, url) => {
		const c = await init();
		if (usedWisp !== wisp()) c.setTransport(client());   // the Wisp address was changed in Settings
		let f = frames.get(iframe);
		if (!f) { f = c.createFrame(iframe); frames.set(iframe, f); }
		f.go(url);
	};
})();
