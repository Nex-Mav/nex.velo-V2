/* GET /api/music/search?source=jamendo&q=...  ->  [{ id, title, artist, duration, image }]
   Needs the JAMENDO_ID environment variable in Vercel (free key from devportal.jamendo.com). */
const json = (res, status, d) => { res.statusCode = status; res.setHeader("content-type", "application/json"); res.setHeader("access-control-allow-origin", "*"); res.end(JSON.stringify(d)); };
const base = id => "https://api.jamendo.com/v3.0/tracks/?format=json&audioformat=mp32&client_id=" + encodeURIComponent(id);

export default async function handler(req, res) {
	const u = new URL(req.url, "http://x");
	if (u.searchParams.get("source") !== "jamendo") return json(res, 400, { error: "unknown source" });
	if (!process.env.JAMENDO_ID) return json(res, 500, { error: "Set JAMENDO_ID in Vercel" });
	try {
		const r = await (await fetch(base(process.env.JAMENDO_ID) + "&limit=25&search=" + encodeURIComponent(u.searchParams.get("q") || ""))).json();
		json(res, 200, (r.results || []).map(t => ({ id: t.id, title: t.name, artist: t.artist_name, duration: t.duration, image: t.image })));
	} catch (e) { json(res, 502, { error: "music source unreachable" }); }
}
