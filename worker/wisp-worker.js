/* Same Wisp server as a standalone Cloudflare Worker, for use if Pages can't open outbound connections.
   Paste into a new Worker (Workers & Pages, Create, Create Worker, Edit code), deploy, then in the site open
   Settings, Servers, "Your own server" and enter wss://<worker address>/ */
import { connect } from "cloudflare:sockets";
/* Wisp server (own server, no third party): tunnels the proxy's TCP connections through a Cloudflare Worker.
   Wisp v1: packet = [type u8][stream id u32 LE][payload]. 1 CONNECT, 2 DATA, 3 CONTINUE, 4 CLOSE. */
const BUF = 128, dec = new TextDecoder();
const pkt = (type, id, payload) => { const p = new Uint8Array(5 + payload.length); p[0] = type; new DataView(p.buffer).setUint32(1, id, true); p.set(payload, 5); return p; };
const cont = (id, n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return pkt(3, id, b); };
const closeP = (id, reason) => pkt(4, id, new Uint8Array([reason]));
const blocked = (h, p) => p === 25 || /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i.test(h) || /\.(local|internal)$/i.test(h);

function end(ws, streams, id, reason) {
	const st = streams.get(id); if (!st) return; streams.delete(id);
	try { st.sock.close(); } catch (e) {}
	try { ws.send(closeP(id, reason)); } catch (e) {}
}
async function pump(ws, streams, id, sock) {
	try { const r = sock.readable.getReader(); for (;;) { const { value, done } = await r.read(); if (done) break; for (let i = 0; i < value.length; i += 65536) ws.send(pkt(2, id, value.subarray(i, i + 65536))); } } catch (e) {}
	end(ws, streams, id, 0x02);
}
function serve(ws) {
	const streams = new Map(); ws.accept(); ws.send(cont(0, BUF));
	ws.addEventListener("message", async (e) => {
		if (!(e.data instanceof ArrayBuffer)) return; const d = new Uint8Array(e.data); if (d.length < 5) return;
		const type = d[0], id = new DataView(d.buffer, d.byteOffset).getUint32(1, true), body = d.subarray(5);
		if (type === 1) {
			if (body[0] !== 1) return ws.send(closeP(id, 0x41));   // only TCP streams
			const port = new DataView(body.buffer, body.byteOffset).getUint16(1, true), host = dec.decode(body.subarray(3));
			if (blocked(host, port)) return ws.send(closeP(id, 0x48));
			try { const sock = connect({ hostname: host, port }); streams.set(id, { sock, w: sock.writable.getWriter(), n: 0 }); sock.opened.catch(() => end(ws, streams, id, 0x42)); pump(ws, streams, id, sock); }
			catch (err) { ws.send(closeP(id, 0x42)); }
		} else if (type === 2) {
			const st = streams.get(id); if (!st) return;
			try { await st.w.write(body.slice()); if (++st.n % 32 === 0) ws.send(cont(id, BUF)); } catch (err) { end(ws, streams, id, 0x03); }
		} else if (type === 4) { end(ws, streams, id, 0x02); }
	});
	const gone = () => streams.forEach((s, id) => end(ws, streams, id, 0x02));
	ws.addEventListener("close", gone); ws.addEventListener("error", gone);
}
function wispResponse(request) {
	if (request.headers.get("Upgrade") !== "websocket") return new Response("Nex.Velo Wisp server. Connect with a WebSocket.", { status: 426 });
	const [client, server] = Object.values(new WebSocketPair()); serve(server);
	return new Response(null, { status: 101, webSocket: client });
}

export default { fetch: (request) => wispResponse(request) };
