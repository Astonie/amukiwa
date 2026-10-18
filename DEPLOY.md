# Hosting & Domain Guide

## Auto-deploy (GitHub Pages)
This repo includes `.github/workflows/deploy-wedding.yml`. On every push to `main` that touches `wedding/`, the site is published to the `gh-pages` branch automatically. Enable Pages once: repo → Settings → Pages → Source = `gh-pages` branch, root. Live at `https://astonie.github.io/roadwise-malawi/`.

## Proper CMS (Decap + Netlify)
For a full CMS with login, media uploads, and Git commits:
1. Deploy the site to Netlify (import repo, root = `wedding` or `.`).
2. In Netlify: Site settings → Identity → Enable Identity.
3. Under Identity → Services → Enable Git Gateway.
4. Invite users (the couple) via Identity → Invite users.
5. Visit `/admin/` → log in → edit content/media → Publish (commits to repo → auto-deploys).
Media uploads are stored in `assets/uploads/`.

## Auto-deploy (Vercel)
1. Import `Astonie/roadwise-malawi` in Vercel.
2. Set **Root Directory** = `wedding`.
3. Framework Preset = Other; Build Command = (empty); Output Directory = `.` (or leave default).
4. Vercel auto-deploys on every push to `main`.

## Free hosting options (manual)
- **Netlify** (recommended): drag-and-drop the `wedding/` folder at https://app.netlify.com/drop, or connect a Git repo. `netlify.toml` included.
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
Open `/admin.html` on the live site to edit details, RSVPs, guestbook. Note: admin data is stored per-browser (localStorage). For shared/multi-device management, export JSON and import on another device, or move to a backend (Supabase/Firebase) later.
