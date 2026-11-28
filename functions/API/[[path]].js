/* /api/music/search?source=jamendo&q=...  and  /api/music/stream?source=jamendo&id=...
   Optional: add JAMENDO_ID (a free key from devportal.jamendo.com) in Pages, Settings, Environment variables.
   Audius works without any of this. */
const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "*" };
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...cors, "content-type": "application/json" } });

export async function onRequest({ request, env }) {
	if (request.method === "OPTIONS") return new Response(null, { headers: cors });
	const u = new URL(request.url), op = u.pathname.replace(/\/+$/, "").split("/").pop();
	if (u.searchParams.get("source") !== "jamendo") return json({ error: "unknown source" }, 400);
	if (!env.JAMENDO_ID) return op === "search" ? json([]) : json({ error: "not set up" }, 404);
	const base = "https://api.jamendo.com/v3.0/tracks/?format=json&audioformat=mp32&client_id=" + encodeURIComponent(env.JAMENDO_ID);
	try {
		if (op === "search") {
			const r = await (await fetch(base + "&limit=25&search=" + encodeURIComponent(u.searchParams.get("q") || ""))).json();
			return json((r.results || []).map((t) => ({ id: t.id, title: t.name, artist: t.artist_name, duration: t.duration, image: t.image })));
		}
		if (op === "stream") {
			const r = await (await fetch(base + "&id=" + encodeURIComponent(u.searchParams.get("id") || ""))).json(), t = (r.results || [])[0];
			return t && t.audio ? Response.redirect(t.audio, 302) : json({ error: "not found" }, 404);
		}
	} catch (e) { return json({ error: "music source unreachable" }, 502); }
	return json({ error: "not found" }, 404);
}
