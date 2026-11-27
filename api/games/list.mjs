/* GET /api/games/list?src=gn|obsidian|ugs  ->  { games: [{ name, thumb, url }] }
   Reads each library's public catalogue and returns one clean list. Nothing is copied or hosted here.
   GN Math is set up below. For Obsidian and UGS, add the address of each library's catalogue (a JSON file)
   as a Vercel environment variable:  GAMES_OBSIDIAN_URL  and  GAMES_UGS_URL. */
const GN_COVER = "https://cdn.jsdelivr.net/gh/gn-math/covers@main", GN_HTML = "https://cdn.jsdelivr.net/gh/gn-math/html@main";
const abs = (v, base) => { if (!v) return ""; v = String(v).replace("{COVER_URL}", GN_COVER).replace("{HTML_URL}", GN_HTML); try { return new URL(v, base).href; } catch (e) { return ""; } };
const generic = (g, base) => ({ name: String(g.name || g.title || "").trim(), thumb: abs(g.thumb || g.cover || g.image || g.img || g.icon, base), url: abs(g.url || g.play || g.path || g.link || g.href, base) });
const SOURCES = {
	gn: { url: "https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json" },
	obsidian: { url: process.env.GAMES_OBSIDIAN_URL },
	ugs: { url: process.env.GAMES_UGS_URL }
};
const send = (res, status, d) => { res.statusCode = status; res.setHeader("content-type", "application/json"); res.setHeader("access-control-allow-origin", "*"); res.end(JSON.stringify(d)); };

export default async function handler(req, res) {
	const src = new URL(req.url, "http://x").searchParams.get("src"), cfg = SOURCES[src];
	if (!cfg) return send(res, 400, { error: "unknown library" });
	if (!cfg.url) return send(res, 501, { error: "this library has no catalogue address set on the server yet" });
	try {
		const r = await fetch(cfg.url); if (!r.ok) throw new Error("HTTP " + r.status);
		const data = await r.json(), arr = Array.isArray(data) ? data : (data.games || data.zones || data.items || []);
		const games = arr.map(g => generic(g, cfg.url)).filter(g => g.name && g.url);
		res.setHeader("cache-control", "s-maxage=3600, stale-while-revalidate");
		send(res, 200, { games });
	} catch (e) { send(res, 502, { error: "couldn't read the catalogue (" + (e.message || e) + ")" }); }
}
