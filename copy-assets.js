#!/usr/bin/env node
/* Copies the proxy files from node_modules into public/ so a static host (Vercel) can serve them:
     public/scramjet/    @mercuryworkshop/scramjet            (dist)
     public/controller/  @mercuryworkshop/scramjet-controller (dist)
     public/libcurl/     @mercuryworkshop/libcurl-transport   (dist)
   Install first:  npm i @mercuryworkshop/scramjet-controller @mercuryworkshop/libcurl-transport
   Run:            node scripts/copy-assets.js [public-folder]   (also fine as your "build" or "postinstall" step) */
const fs = require("fs"), path = require("path");
const pub = path.resolve(process.argv[2] || "public"), nm = path.join(process.cwd(), "node_modules", "@mercuryworkshop");
const jobs = [
	["scramjet", [path.join(nm, "scramjet"), path.join(nm, "scramjet-controller", "node_modules", "@mercuryworkshop", "scramjet")], "scramjet"],
	["scramjet-controller", [path.join(nm, "scramjet-controller")], "controller"],
	["libcurl-transport", [path.join(nm, "libcurl-transport")], "libcurl"]
];
for (const [name, dirs, out] of jobs) {
	const src = dirs.map(d => path.join(d, "dist")).find(d => fs.existsSync(d));
	if (!src) { console.error("Cannot find @mercuryworkshop/" + name + ". Run: npm i @mercuryworkshop/scramjet-controller @mercuryworkshop/libcurl-transport"); process.exit(1); }
	fs.rmSync(path.join(pub, out), { recursive: true, force: true });
	fs.cpSync(src, path.join(pub, out), { recursive: true });
	console.log("copied " + name + " -> " + path.join(path.basename(pub), out));
}
