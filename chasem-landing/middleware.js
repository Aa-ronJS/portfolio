// go.chasem.app is the app; chasem.app is the site. Both are this one Vercel project, so the app keeps calling
// /api/... on its own address and there is no second deployment to keep in step. On go.chasem.app every path
// except /api/ and /y/ is served from public/app/. A rewrite in vercel.json cannot do this: files win over
// rewrites there, and the site's own index.html and config.js would answer instead of the app's.
export const APP_HOST = "go.chasem.app";

export function appPath(pathname) {
  let p = pathname || "/";
  if (/^\/(api|y)(\/|$)/.test(p)) return null;
  p = p.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, ""); // cleanUrls would bounce these to a path that is not the app's
  return "/app" + (p.startsWith("/") ? p : "/" + p);
}

export default function middleware(request) {
  const url = new URL(request.url);
  const host = (request.headers.get("host") || url.host).toLowerCase().replace(/:\d+$/, "");
  const to = host === APP_HOST ? appPath(url.pathname) : null;
  if (!to) return new Response(null, { headers: { "x-middleware-next": "1" } });
  url.pathname = to;
  return new Response(null, { headers: { "x-middleware-rewrite": url.toString() } });
}
