# Live snapshot, 3 Nov 2026 (Darren's multiplayer temple + the music channels)

This branch holds what is live on tuvi.terranimus.com/chua (and /temple, /tera, /sawon, /simiao, /mandir, /khram) as of
3 Nov 2026, reconstructed from the deployed Worker `chua`, because the multiplayer version was deployed without its
source being pushed to this repository.

- `ops/chua.worker.mjs`, `ops/limits.mjs`: Darren's Worker modules, byte for byte as deployed (Durable Objects
  `Directory` and `Room`, migration tag `v1`; bindings ASSETS, BASE, COMMIT=f8593379…, CSP, DIRECTORY, PUBLIC_HOST, ROOM;
  assets config run_worker_first=false, html_handling=auto-trailing-slash, not_found_handling=none). Worker routes:
  tuvi.terranimus.com/{chua,temple,tera,sawon,simiao,mandir,khram} and /*.
- `room.js`, `room.css`, `assets/hall-wide*.jpg`: Darren's static files as deployed.
- `index.html`: Darren's page with the music channels of main (03a88b8) merged in: Nhạc thiền (default), Đàn tranh
  (generated in the browser), Chú Đại Bi (text + mõ; reads with a Vietnamese voice whatever the page language).
  The Worker injects `<base href>` itself, so the file has none.

`scripts/chua-deploy.mjs` on main does NOT deploy this (it has no Durable Objects; Cloudflare refuses it). Darren:
please merge your real source with this branch and deploy from this repository from now on, so the music is not lost.
