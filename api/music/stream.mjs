/* GET /api/music/stream?source=jamendo&id=...  ->  redirects to the track's mp3 */
const json = (res, status, d) => { res.statusCode = status; res.setHeader("content-type", "application/json"); res.setHeader("access-control-allow-origin", "*"); res.end(JSON.stringify(d)); };
const base = id => "https://api.jamendo.com/v3.0/tracks/?format=json&audioformat=mp32&client_id=" + encodeURIComponent(id);

export default async function handler(req, res) {
	const u = new URL(req.url, "http://x");
	if (u.searchParams.get("source") !== "jamendo") return json(res, 400, { error: "unknown source" });
	if (!process.env.JAMENDO_ID) return json(res, 500, { error: "Set JAMENDO_ID in Vercel" });
	try {
		const r = await (await fetch(base(process.env.JAMENDO_ID) + "&id=" + encodeURIComponent(u.searchParams.get("id") || ""))).json(), t = (r.results || [])[0];
		if (!t || !t.audio) return json(res, 404, { error: "not found" });
		res.statusCode = 302; res.setHeader("location", t.audio); res.end();
	} catch (e) { json(res, 502, { error: "music source unreachable" }); }
}
