/* Nex.Velo proxy client: registers /sw.js, builds the Scramjet controller on your Wisp server, and gives the Browser
   window ENGINE.go(iframe, url, step) and ENGINE.reset(). `step` is told about every stage so the loading screen can show it.
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
	ENGINE.reset = async () => {};
	if (missing.length) {
		ENGINE.go = async (iframe, url, step) => { if (step) step("Checking the proxy files"); throw new Error("These files did not load: " + missing.join(", ") + ". Open Settings, Servers, Check proxy setup."); };
		return;
	}
	const wisp = () => (typeof getWisp === "function" ? getWisp() : (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/wisp/");
	let frames = new WeakMap(), ctl = null, ready = null, usedWisp = "";
	const client = () => new LibcurlTransport.LibcurlClient({ wisp: usedWisp = wisp() });
	const timeout = (ms, msg) => new Promise((_, no) => setTimeout(() => no(new Error(msg)), ms));
	const ping = (u) => new Promise((ok, no) => {
		let ws; const t = setTimeout(() => { try { ws.close(); } catch (e) {} no(new Error("The server did not answer")); }, 7000);
		try { ws = new WebSocket(u); ws.onopen = () => { clearTimeout(t); ws.close(); ok(); }; ws.onerror = () => { clearTimeout(t); no(new Error("Could not connect to the server")); }; } catch (e) { clearTimeout(t); no(e); }
	});
	const host = (u) => { try { return new URL(u.replace(/^ws/, "http")).host; } catch (e) { return u; } };
	function init(step) {
		return (ready = (async () => {
			step("Checking the proxy files");
			step("Connecting to the server (" + host(wisp()) + ")");
			await ping(wisp()).catch((e) => { throw new Error(e.message + ". Try another server in Settings, Servers."); });
			step("Registering the service worker");
			const reg = await navigator.serviceWorker.register("/sw.js");
			step("Waiting for the service worker to start");
			await Promise.race([navigator.serviceWorker.ready, timeout(15000, "The service worker did not start")]);
			step("Starting the proxy engine");
			const sw = navigator.serviceWorker.controller || reg.active;
			ctl = new $scramjetController.Controller({ serviceworker: sw, transport: client() });
			step("Setting up the connection");
			await Promise.race([ctl.wait(), timeout(20000, "The proxy did not start in time")]);
			return ctl;
		})().catch((e) => { ready = null; throw e; }));
	}
	ENGINE.go = async (iframe, url, step = () => {}) => {
		let c;
		if (ready) { c = await ready; step("The proxy is ready"); } else c = await init(step);
		if (usedWisp !== wisp()) c.setTransport(client());   // the server was changed in Settings
		step("Opening " + host(url));
		let f = frames.get(iframe);
		if (!f) { f = c.createFrame(iframe); frames.set(iframe, f); }
		f.go(url);
		step("Loading the page");
	};
	/* Reload the proxy: forget the engine and the service worker so the next page starts everything fresh */
	ENGINE.reset = async () => {
		ready = null; ctl = null; frames = new WeakMap();
		try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) {}
	};
})();
