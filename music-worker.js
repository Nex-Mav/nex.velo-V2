/* Nex.Velo music server (Cloudflare Worker). Serves Jamendo, a catalogue of free, licensed music that browsers may stream.
   Deploy:  wrangler deploy music-worker.js --name nex-music     then   wrangler secret put JAMENDO_ID
   Get a free client id at https://devportal.jamendo.com, then in the page:  Music.config.api = "https://nex-music.<you>.workers.dev"
   Routes:  GET /search?source=jamendo&q=...   ->  [{ id, title, artist, duration, image }]
            GET /stream?source=jamendo&id=... ->  redirect to the track's mp3 */
const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "*" };
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...cors, "content-type": "application/json" } });

export default {
	async fetch(req, env) {
		if (req.method === "OPTIONS") return new Response(null, { headers: cors });
		const u = new URL(req.url);
		if (u.searchParams.get("source") !== "jamendo") return json({ error: "unknown source" }, 400);
		if (!env.JAMENDO_ID) return json({ error: "Set the JAMENDO_ID secret" }, 500);
		const base = "https://api.jamendo.com/v3.0/tracks/?format=json&audioformat=mp32&client_id=" + encodeURIComponent(env.JAMENDO_ID);
		if (u.pathname.endsWith("/search")) {
			const r = await (await fetch(base + "&limit=25&search=" + encodeURIComponent(u.searchParams.get("q") || ""))).json();
			return json((r.results || []).map(t => ({ id: t.id, title: t.name, artist: t.artist_name, duration: t.duration, image: t.image })));
		}
		if (u.pathname.endsWith("/stream")) {
			const r = await (await fetch(base + "&id=" + encodeURIComponent(u.searchParams.get("id") || ""))).json(), t = (r.results || [])[0];
			return t && t.audio ? Response.redirect(t.audio, 302) : json({ error: "not found" }, 404);
		}
		return json({ error: "not found" }, 404);
	}
};
