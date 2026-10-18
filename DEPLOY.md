# Hosting & Domain Guide

## Auto-deploy (GitHub Pages)
This repo includes `.github/workflows/deploy-wedding.yml`. On every push to `main` that touches `wedding/`, the site is published to the `gh-pages` branch automatically. Enable Pages once: repo → Settings → Pages → Source = `gh-pages` branch, root. Live at `https://astonie.github.io/roadwise-malawi/`.

## Persistent CMS (Decap + Netlify) — content saved in Netlify
Content edits become Git commits, so they survive across browsers/devices and auto-deploy.
1. In Netlify: **Add new site → Import an existing project** → pick the GitHub repo (`Astonie/amukiwa`, or `Astonie/roadwise-malawi` with base directory `wedding`). Build command = none, publish directory = `.`.
   - Do **not** use drag-and-drop deploy if you want the CMS to work — Git Gateway can only write to a Git-connected site.
2. Netlify → **Site configuration → Identity → Enable Identity**.
3. Identity → **Services → Enable Git Gateway**.
4. Identity → **Users → Invite users** → enter your email → accept the invite.
5. Visit `https://<yoursite>.netlify.app/admin/` → log in → edit → **Publish**.
   - Publish commits `content.json` (+ media to `assets/uploads/`) to `main`, then Netlify redeploys automatically.
   - `admin/config.yml` already maps every field of `content.json`, so no data is dropped.
6. Optional: set `admin/config.yml` → `site_url`/`display_url` to your Netlify URL.

**Which admin to use**
- `/admin/` (Decap, Netlify) → **recommended**, persists for everyone.
- `/admin.html` (custom panel) → local browser preview only; needs a GitHub PAT in its Publish tab to go live.

## Auto-deploy (Vercel)
1. Import `Astonie/roadwise-malawi` in Vercel.
2. Set **Root Directory** = `wedding`.
3. Framework Preset = Other; Build Command = (empty); Output Directory = `.` (or leave default).
4. Vercel auto-deploys on every push to `main`.

## Free hosting options (manual)
- **Netlify** (recommended for the CMS): connect a Git repo at https://app.netlify.com/start. `netlify.toml` included. Drag-and-drop works for hosting but disables CMS publishing.
- **Vercel**: `vercel` CLI or import repo; `vercel.json` included.
- **GitHub Pages**: push to a repo, enable Pages from `/wedding` folder.
- **Cloudflare Pages**: connect repo, build command empty, output dir `wedding`.

## Domain
Buy a meaningful domain such as:
- astonieandwanangwa.com
- astonie-wanangwa.wedding
- astoniewanangwa.com
Then point DNS to your host (Netlify/Vercel provide instructions) and enable HTTPS (automatic).

## Media handling
- Small images: upload via Admin → Media (stored locally in browser).
- Production media: host images/video on Cloudinary, Imgur, or your repo's `assets/` folder and paste URLs in Admin.
- Keep images under ~300KB (use WebP/JPEG). Music: use a direct MP3 URL.
- The gallery accepts comma-separated URLs or file uploads.

## Managing content
- **Persistent (all devices, everyone):** `/admin/` on your Netlify site — edits are committed to Git and redeployed.
- **Quick local preview:** `/admin.html` → "Save Changes" stores in *that browser only*; use Settings → Export/Import to move edits, or Publish with a GitHub PAT to go live.
- RSVP entries and guestbook notes are submitted by visitors and stored per-browser in this build; export them from the RSVP/Guestbook tabs.
