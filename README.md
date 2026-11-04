# Túc Tắc · Merch comeback

## Develop

Use the existing checkout; Node 22+ recommended. Run `npm ci --include=optional`, then `npm run dev`. Development mode uses browser-local sample votes, labeled in the gear menu. Production requires the voting API and database.

`npm run build` builds the site. `npm test` checks phone normalization, vote sorting, original image availability and the API's merch ID limits.

## Original images and campaign

The original 48 WebP files from the supplied archive are included as `public/merch/1.webp` through `48.webp`. Voting ID 41 now uses the replacement original PNG at `public/merch/41-cats.png`; all other IDs keep the numbered WebP images. Source and build images are byte-for-byte identical to the upload; no cropping, recompression, or color filters are applied. Product names remain inside the supplied artwork only. The top-three ranking uses the same image as its merch card.

`src/catalog.js` defines the 48-image catalog and campaign ID. This campaign has a separate browser sample-vote namespace so votes for the old 12-image preview are not attributed to different products. Keep the catalog order stable once a real campaign opens.

The supplied header logo is included unchanged as `public/logo.jpeg` and displayed by default. Use the gear menu to select a different original logo file for the sample. It displays centered with rounded corners and a hover effect. Reduced-motion preferences disable the animation.

## Offline sample

Run `node scripts/export-demo.mjs` to create `downloads/Tuc-Tac-Merch-Demo.html`. All 48 images and Montserrat fonts are embedded. The tracked download is `downloads/Tuc-Tac-Merch-48-Anh.zip`: extract it and open its HTML file in a browser. Browser-local sample votes are separate from production results.

Selecting a logo in the gear menu and choosing its download button saves a standalone copy with that original image embedded. No canvas or image transformation is used. Images are decoded once into reusable object URLs to avoid reinserting large base64 strings when voting or sorting. The original data remains embedded for export.

Sorting supports default order, highest votes first and lowest votes first. Equal counts use voting ID order; sorting the catalog does not change the top-three ranking. Phone layouts show the top three as rows with TOP labels above the images, no image-overlay badges, and large vote buttons; the catalog uses two columns (one on very narrow screens).

## Cloudflare Pages

Connect this repository to Pages. Build command: `npm run build`. Output directory: `dist`. Current source branch: `preview/merch-voting`; choose the intended deployment branch in Pages. Git integration rebuilds after pushes. Requested project name: `votemerchtuctac` and requested address: `votemerchtuctac.pages.dev` (availability unverified until creation).

Create a D1 database and bind it to Pages as `DB`. Apply **all** SQL migrations, including `0002_expand_to_48.sql`, which increases the ID limit while preserving existing votes. Set a stable random secret `PHONE_HASH_SECRET` in Pages settings. Never commit secret values or set `DEMO_MODE` in production. Redeploy after configuring bindings.

The server stores an HMAC of normalized phone numbers and enforces one vote per phone and merch through a database primary key. Different merch can receive votes from the same number. Domestic and +84 formats share one identity. No OTP: ownership of the number is not verified. Add campaign-appropriate abuse limits and privacy information before public launch. Production never silently falls back to sample votes. If the voting API is unavailable, the page shows a connection message and the vote buttons offer a connection retry instead of remaining permanently disabled. A successful retry resumes the voting flow.

See GitHub commit checks for the current deployment status. Before opening a new real campaign, archive the previous campaign rather than attributing its votes to a reordered catalog. This preview's replacement images have not reset any production database.

## Deployment access pending

Wrangler authentication was checked and no Cloudflare login/token is available in the managed environment. Provide `CLOUDFLARE_API_TOKEN` securely through environment Secrets (destination: `api.cloudflare.com`) and the nonsecret `CLOUDFLARE_ACCOUNT_ID` through environment variables. The API token needs Cloudflare Pages Edit and D1 Edit for the selected account. Account discovery may additionally require Account Settings Read. Never put credential values into chat or repository files.

Before deploying, create/check the Pages project `votemerchtuctac`, create/bind its D1 database as `DB`, apply both migrations remotely, and set a stable generated `PHONE_HASH_SECRET` as a Pages secret. Keep that generated secret stable across deployments. Deploy the actual production build with its Functions, not the offline sample. Verify `/api/votes` and one controlled vote/duplicate check on the live deployment before claiming it ready. The local Pages Functions and D1 migration/voting checks passed; they do not establish remote deployment.

## Merch suggestions → Google Sheets

The final section posts to `/api/suggestions`; success is shown only after Google confirms the row. The form uses the saved voting phone number; otherwise it requires a valid Vietnamese mobile number. Phone and feedback are sent only when the customer submits. In local/offline demo mode nothing is sent. Retries from the same form reuse a UUID; Apps Script locks and deduplicates rows by UUID.

New destination: https://docs.google.com/spreadsheets/d/1ONK0DZdlQOWWJeK-mU2VB2LcoSqchSZr06McTjz7hOc/edit (tab `Mong muốn`, columns: time in Vietnam, customer feedback, request ID, phone).

1. In that Sheet open Extensions → Apps Script. Paste `integrations/merch-suggestions.gs`.
2. In Apps Script Project Settings → Script properties, add `SUGGESTIONS_WEBHOOK_SECRET` with a new random secret of at least 32 characters. Do not reuse `PHONE_HASH_SECRET`.
3. Deploy → New deployment → Web app. Execute as yourself, access Anyone. Authorize spreadsheet access; copy the `/exec` URL.
4. In Cloudflare Pages Production secrets set `SUGGESTIONS_WEBHOOK_URL` to that URL and `SUGGESTIONS_WEBHOOK_SECRET` to the same new secret. Keep both server-side. Redeploy the source including Pages Functions.
5. Submit a controlled suggestion through the deployed page and verify exactly one row appears; retry the same request ID and verify no duplicate. No production end-to-end check has been completed yet.

The chat's Google Drive connection can create the spreadsheet but does not deploy Apps Script or grant the live Cloudflare site ongoing Google access. The web app deployment above is required.

## Duplicate removed

Original voting ID 46 is retired. The public catalog and ranking show 47 items; original images 47 and 48 now occupy display positions 46 and 47. Their voting IDs, image files and existing votes stay unchanged. The API rejects new votes for retired ID 46 and omits it from counts and phone status. Historic database rows are retained without reassigning them.

## Shared contact field

The voting dialog uses one field labeled Số điện thoại/email, detecting the contact type automatically. Phone HMAC input stays unchanged, so existing votes and saved phones remain valid. Email is trimmed, lowercased, and prefixed with email: for hashing. Each contact remains a separate voting identity without ownership verification. No database migration or secret change is required.

Feedback uses the same phone/email contact as voting and hides the contact input for either saved account type. Guests can enter either in one field. The owner must deploy the updated integrations/merch-suggestions.gs at the existing Apps Script URL to accept email feedback. Its header in column D becomes Số điện thoại/email; rows, request IDs, and columns A:C remain unchanged. Phone-only Apps Script versions remain compatible with phone submissions. No Cloudflare secret change is needed.

## Cup keychain appended

The original supplied PNG is `public/merch/49-cup-keychain.png`, appended as voting ID 49. There are now 48 visible cards; retired duplicate 46 stays hidden. IDs, images and votes for every existing item are unchanged.

The original D1 table limits IDs to 48. New votes use the idempotent `0003_additional_votes.sql` table, and the API unions counts/status across both tables. The API creates this table automatically only on a missing-table error so existing Pages deployments do not require dashboard changes. No existing vote rows or tables are modified.

## Three account changes per browser

Production account saves and all vote/status POST requests enforce a maximum of three changes per persistent HttpOnly device cookie. The first account initializes the record for free; normalized identical contacts do not count. Logging out only clears local account selection. An atomic conditional UPSERT in D1 prevents concurrent requests from exceeding three changes. Migration 0004 is bootstrapped on a missing-table error without changing vote rows or hashes. Existing saved contacts become the initial account when first loaded after deployment. The limit starts with this deployment; previous changes were not recorded.

This identifies a browser profile, not physical hardware: clearing cookies, another browser or private browsing creates a new identity. No hardware fingerprinting is used.
