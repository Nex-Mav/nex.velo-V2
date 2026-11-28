/* Serves /wisp/ on Cloudflare Pages: the proxy tunnels through this site itself. */
import { wispResponse } from "../_lib/wisp.js";

export const onRequest = ({ request }) => wispResponse(request);
