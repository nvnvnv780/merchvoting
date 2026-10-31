# Túc Tắc · Merch comeback

## Develop

Use the existing checkout; Node 22+ recommended. Run `npm ci --include=optional`, then `npm run dev`. Development mode uses browser-local sample votes, labeled in the gear menu. Production requires the voting API and database.

`npm run build` builds the site. `npm test` checks phone normalization, vote sorting, original image availability and the API's merch ID limits.

## Original images and campaign

All 48 original WebP files from the supplied archive are included as `public/merch/1.webp` through `48.webp`. Each voting ID uses the corresponding numbered image. Source and build images are byte-for-byte identical to the upload; no cropping, recompression, or color filters are applied. Product names remain inside the supplied artwork only. The top-three ranking uses the same image as its merch card.

`src/catalog.js` defines the 48-image catalog and campaign ID. This campaign has a separate browser sample-vote namespace so votes for the old 12-image preview are not attributed to different products. Keep the catalog order stable once a real campaign opens.

The uploaded archive does not include the header logo. Use the gear menu to select the original logo file for the sample. It displays centered with rounded corners and a hover effect. Reduced-motion preferences disable the animation.

## Offline sample

Run `node scripts/export-demo.mjs` to create `downloads/Tuc-Tac-Merch-Demo.html`. All 48 images and Montserrat fonts are embedded. The tracked download is `downloads/Tuc-Tac-Merch-48-Anh.zip`: extract it and open its HTML file in a browser. Browser-local sample votes are separate from production results.

Selecting a logo in the gear menu and choosing its download button saves a standalone copy with that original image embedded. No canvas or image transformation is used. Images are decoded once into reusable object URLs to avoid reinserting large base64 strings when voting or sorting. The original data remains embedded for export.

Sorting supports default order, highest votes first and lowest votes first. Equal counts use voting ID order; sorting the catalog does not change the top-three ranking. Phone layouts show the top three as rows with large vote buttons and the catalog as two columns (one on very narrow screens).

## Cloudflare Pages

Connect this repository to Pages. Build command: `npm run build`. Output directory: `dist`. Current source branch: `preview/merch-voting`; choose the intended deployment branch in Pages. Git integration rebuilds after pushes. Project-name suggestion: `tuctacmerch` (availability unverified).

Create a D1 database and bind it to Pages as `DB`. Apply **all** SQL migrations, including `0002_expand_to_48.sql`, which increases the ID limit while preserving existing votes. Set a stable random secret `PHONE_HASH_SECRET` in Pages settings. Never commit secret values or set `DEMO_MODE` in production. Redeploy after configuring bindings.

The server stores an HMAC of normalized phone numbers and enforces one vote per phone and merch through a database primary key. Different merch can receive votes from the same number. Domestic and +84 formats share one identity. No OTP: ownership of the number is not verified. Add campaign-appropriate abuse limits and privacy information before public launch. Production never silently falls back to sample votes.

No Cloudflare deployment has been performed. Before opening a new real campaign, archive the previous campaign rather than attributing its votes to a reordered catalog. This preview's replacement images have not reset any production database.
