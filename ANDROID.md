# Running the site as an offline Android app

The site is a PWA: `manifest.webmanifest` describes the app and `public/sw.js`
caches all sixteen files (one page, six photographs, four fonts, four icons,
the manifest) on first visit. After that it opens and scrolls with no network
at all. No AI runs on the device — the imagery was generated once at build
time and shipped as ordinary JPGs; every animation is CSS and vanilla JS.

The one thing that wants a network is the pair of live MCP tool counts. The
service worker deliberately leaves those requests alone, so with a connection
they show real numbers and without one they say "did not answer from here",
same as always.

## The two-tap install (no tooling)

On Android Chrome, open https://aaronsteele.vercel.app, then menu → **Add to
Home screen** → **Install**. It launches full-screen in its own task, icon and
all, and works in aeroplane mode.

## A real APK (Trusted Web Activity, via Bubblewrap)

Only needed if you want a sideloadable APK or a Play Store listing. Requires
Node 18+; Bubblewrap offers to download its own JDK and Android SDK on first
run.

```bash
npm i -g @bubblewrap/cli
mkdir portfolio-twa && cd portfolio-twa
bubblewrap init --manifest https://aaronsteele.vercel.app/manifest.webmanifest
bubblewrap build
```

`init` reads the web manifest and asks a handful of questions; sensible
answers:

- **Application ID**: `com.aaronsteele.portfolio`
- **Display mode / colours / icons**: accept the defaults, they come from the
  manifest
- **Signing key**: let it create one, and keep the keystore and passwords —
  Play updates must be signed with the same key

`build` produces `app-release-signed.apk` (sideload with
`adb install app-release-signed.apk`) and an `.aab` for the Play Store.

To make the app open full-screen rather than with a browser URL bar, the site
must prove it belongs to the app: `init` prints an `assetlinks.json` (also
recoverable later with `bubblewrap fingerprint generateAssetLinks`). Commit it
as `public/.well-known/assetlinks.json` and deploy before first launch.
Without it the app still works offline — it just shows Chrome's custom-tab
bar.
