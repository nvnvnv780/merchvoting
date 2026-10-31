# Túc Tắc · Merch comeback

## Local sample

Node 22+ recommended. Run `npm ci --include=optional`, then `npm run dev`.
Development mode uses browser-local sample votes, clearly labeled in the UI.
The supplied ZIP's 12 original PNGs are included as `public/merch/1.png` through `12.png`. Each card uses the corresponding numbered image, and the top 3 uses the same image for its merch. Originals are unchanged (no cropping, recompression, or color filters). Files 7 and 8 are identical in the supplied archive and remain unchanged. The ZIP does not contain the header logo. The gear control allows selecting the original logo file; it displays centered with rounded corners.

Generate the standalone offline file with `node scripts/export-demo.mjs`. Open `downloads/Tuc-Tac-Merch-Demo.html`. After selecting images, use the gear menu's download button to save a self-contained copy with the original images embedded. This copy opens without installing dependencies. The phone dialog is reduced to input, confirmation, and forget controls. The 12 merch images are included in the live build; the original header logo file still needs to be supplied before completing the header.

`npm run build` builds the site. `npm test` checks phone normalization.

## Cloudflare Pages

Connect this GitHub repository to Pages. Build command: `npm run build`. Output directory: `dist`. Production branch: `main` once created. Name suggestion: `tuctacmerch` (availability unverified). Git integration rebuilds automatically after pushes.

Create a D1 database and bind it to Pages as `DB`. Apply `migrations/0001_votes.sql` to that database. Add a stable random secret `PHONE_HASH_SECRET` in Pages settings. Do not commit secrets or set `DEMO_MODE` in production. Redeploy after configuring bindings.

The server stores an HMAC of normalized phone numbers and enforces one vote per phone and merch through a database primary key. Votes for different merch are allowed. Domestic and +84 formats use the same identity. No OTP: ownership of a number is not verified. Add abuse rate limits and an appropriate privacy notice before a public campaign. Production does not silently fall back to local sample votes when the API is unavailable.

The remembered phone is kept locally in the browser, with a Forget option. Sample votes persist locally; uploaded sample images last until reload. For shared final images, put image assets into public/ and deploy.

This project has not been deployed or connected to a Cloudflare account. D1 binding and a real deployment require that account's access.

## Expanded campaign update

The UI and database migration now support up to 48 merch. `src/catalog.js` defines the available image list and stable ID order; it currently contains the original 12 images. The replacement 48-image ZIP could not be transferred because it exceeded the tool's 32 MiB limit. Do not treat the new 48 images as installed. Add the actual originals and update the catalog once smaller archives or an accessible source are provided.

Sorting offers default order, highest votes first, and lowest votes first. Equal counts use ID order. Sorting does not change the top-three ranking. Phones show the top three in rows with larger buttons; the catalog has two columns (one on very narrow screens). Logo hover motion is disabled for reduced-motion preferences. Apply all SQL migrations, including `0002_expand_to_48.sql`, before using the expanded campaign on D1. The migration preserves the previous votes. For a new campaign with changed IDs, close and archive the old campaign before opening voting; do not reuse old votes for unrelated products.
