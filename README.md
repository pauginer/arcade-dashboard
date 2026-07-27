# Arcade Dashboard

A public-display website listing games and experiences. Each entry shows an
image, a description, a QR code, and a live count of how many times that QR
code has been scanned today.

- `/` — the public display (big grid, meant for a screen/kiosk). Scan counts
  refresh automatically every 15s.
- `/admin` — add or remove items. No authentication (by design) — don't put a
  link to it anywhere the public can find it, and don't expose the deployment
  to anyone who shouldn't be able to edit the list.
- `/r/[id]` — the URL every QR code points to. It logs a scan and 302-redirects
  to the item's destination URL.

## Stack

- **Next.js** (App Router, Server Actions) — deploys natively to Vercel.
- **Postgres** (e.g. Neon, via Vercel's Postgres/Neon integration) — stores the
  item list and a row per scan, via the [`postgres`](https://github.com/porsager/postgres)
  driver. The schema (`items`, `scans` tables) is created automatically on
  first use — no manual migration step.
- **Vercel Blob** — stores uploaded item images.
- **`qrcode`** — QR codes are generated server-side on every render of `/`, so
  they always point at whatever domain the app is currently deployed on (no
  need to bake in a URL).

"Scans today" is counted since midnight **UTC**.

## Local development

You need a Postgres database to run this locally. Options:

- Easiest: create a free [Neon](https://neon.tech) project (or use `vercel env pull`
  once you've set up the Vercel integration below) and copy its connection string.
- Or run Postgres locally (e.g. `brew install postgresql@16`) and point at it.

1. Copy `.env.local.example` to `.env.local` and fill in `DATABASE_URL`.
2. For image uploads to work locally you also need `BLOB_READ_WRITE_TOKEN`
   (see below) — without it, adding an item without an image still works.
3. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000/admin](http://localhost:3000/admin) to add an
   item, then [http://localhost:3000](http://localhost:3000) to see the
   display.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. In the Vercel project, add a **Postgres** database (Storage tab → Neon, or
   any Postgres integration that sets a `DATABASE_URL`/`POSTGRES_URL` env
   var). No manual schema setup needed — tables are created on first request.
3. Add a **Blob** store (Storage tab → Blob). Vercel automatically sets
   `BLOB_READ_WRITE_TOKEN` for your deployment once connected.
4. Deploy. The QR codes automatically point at your deployment's URL — if you
   later attach a custom domain, new QR codes (regenerated on every page
   load) will use it automatically, no config change needed.
5. Open `/admin` on the deployed URL to add your games and experiences, then
   put `/` on the display screen (e.g. a browser in kiosk/fullscreen mode).

Optional: set `NEXT_PUBLIC_SITE_URL` if you ever need to pin the QR codes to a
specific origin instead of whatever host header the request arrives on.

## Notes / things to know

- The admin page has no authentication, per how this was set up — anyone who
  can reach `/admin` can add/remove items. Keep the deployment private or add
  auth (e.g. Vercel's password protection, or a middleware check) if that
  changes.
- Deleting an item also deletes its scan history (`ON DELETE CASCADE`) and
  its uploaded image from Blob storage.
- The display page (`/`) is meant to be left open on a screen; it polls
  `/api/counts` every 15 seconds to keep scan counts current without a full
  page reload.
