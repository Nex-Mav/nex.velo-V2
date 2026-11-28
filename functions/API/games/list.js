/* /api/games/list?src=gn|obsidian|ugs  ->  { games: [{ name, thumb, url }] }
   Reads each library's public catalogue and returns one clean list. Nothing is copied or hosted here.
   GN Math is set up below. For Obsidian and UGS, add each catalogue's address (a JSON file) in Pages, Settings,
   Environment variables:  GAMES_OBSIDIAN_URL  and  GAMES_UGS_URL. */
const GN_COVER = "https://cdn.jsdelivr.net/gh/gn-math/covers@main", GN_HTML = "https://cdn.jsdelivr.net/gh/gn-math/html@main";
const abs = (v, base) => { if (!v) return ""; v = String(v).replace("{COVER_URL}", GN_COVER).replace("{HTML_URL}", GN_HTML); try { return new URL(v, base).href; } catch (e) { return ""; } };
const generic = (g, base) => ({ name: String(g.name || g.title || "").trim(), thumb: abs(g.thumb || g.cover || g.image || g.img || g.icon, base), url: abs(g.url || g.play || g.path || g.link || g.href, base) });
const send = (d, status = 200, extra = {}) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*", ...extra } });

export async function onRequest({ request, env }) {
	const src = new URL(request.url).searchParams.get("src");
	const url = { gn: "https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json", obsidian: env.GAMES_OBSIDIAN_URL, ugs: env.GAMES_UGS_URL }[src];
	if (!["gn", "obsidian", "ugs"].includes(src)) return send({ error: "unknown library" }, 400);
	if (!url) return send({ error: "this library has no catalogue address set on the server yet" }, 501);
	try {
		const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status);
		const data = await r.json(), arr = Array.isArray(data) ? data : (data.games || data.zones || data.items || []);
		return send({ games: arr.map((g) => generic(g, url)).filter((g) => g.name && g.url) }, 200, { "cache-control": "public, max-age=3600" });
	} catch (e) { return send({ error: "couldn't read the catalogue (" + (e.message || e) + ")" }, 502); }
}
