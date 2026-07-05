/**
 * Fetches each POI's og:image (link-preview convention) from its own
 * website, resizes it to a small self-hosted thumbnail, and records
 * attribution — the same unfurl pattern chat apps use for link cards.
 *
 * Usage:
 *   npm run seed:pois          # first: emit pois.generated.ts with websites
 *   npm run images:fetch       # this script (network: the places' own sites)
 *   npm run seed:pois          # again: attach thumbnails to the POIs
 *
 * Behavior:
 *   - Cache-first: data/poi-images.json records successes AND failures;
 *     rerun cost is zero. Delete an entry (or pass --retry-failed) to redo.
 *   - Polite: sequential fetches with a delay, identified User-Agent,
 *     10s timeout, 10MB cap. Only ever GETs the site's homepage + og image.
 *   - Output: public/poi-images/{placeId}.webp, 320px wide (2x for the
 *     160px card thumbnail), plus the source domain for "via {domain}"
 *     attribution. Curation excludes (data/curation.json) are the takedown
 *     mechanism: excluded places never render, regardless of manifest.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { generatedPoisByStation } from "../../src/data/pois.generated";

const MANIFEST_PATH = "data/poi-images.json";
const OUTPUT_DIR = "public/poi-images";
const USER_AGENT =
  "MartaCrawlBot/1.0 (personal project; link-preview thumbnails)";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DELAY_MS = 300;
const THUMB_WIDTH = 320;

type ManifestEntry = { image?: string; sourceDomain?: string; failed?: string };
type Manifest = Record<string, ManifestEntry>;

const retryFailed = process.argv.includes("--retry-failed");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithLimits(url: string, accept: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: accept },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error("response too large");
  return { buf, finalUrl: res.url };
}

function extractOgImage(html: string, baseUrl: string): string | null {
  // property/name and content in either order; og:image first, then twitter.
  const patterns = [
    /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+(?:property|name)=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        return new URL(match[1].replace(/&amp;/g, "&"), baseUrl).href;
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const manifest: Manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
    : {};

  // Unique website-bearing POIs from the generated dataset (post-floor,
  // post-curation — we never fetch for places that don't render).
  const targets = new Map<string, string>();
  for (const pois of Object.values(generatedPoisByStation)) {
    for (const poi of pois) {
      if (poi.placeId && poi.websiteUrl) targets.set(poi.placeId, poi.websiteUrl);
    }
  }

  const pending = [...targets].filter(([placeId]) => {
    const entry = manifest[placeId];
    if (!entry) return true;
    return retryFailed && entry.failed;
  });
  console.log(
    `${targets.size} POIs with websites; ${pending.length} to fetch (rest cached in ${MANIFEST_PATH})`,
  );

  let ok = 0;
  let failed = 0;
  const save = () =>
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  for (const [placeId, websiteUrl] of pending) {
    await sleep(DELAY_MS);
    try {
      const domain = new URL(websiteUrl).hostname.replace(/^www\./, "");
      const page = await fetchWithLimits(websiteUrl, "text/html,*/*");
      const ogImage = extractOgImage(
        page.buf.toString("utf8"),
        page.finalUrl || websiteUrl,
      );
      if (!ogImage) throw new Error("no og:image");
      const img = await fetchWithLimits(ogImage, "image/*,*/*");
      const file = `${OUTPUT_DIR}/${placeId}.webp`;
      await sharp(img.buf)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(file);
      manifest[placeId] = { image: `/poi-images/${placeId}.webp`, sourceDomain: domain };
      ok++;
      console.log(`  ok   ${domain}`);
    } catch (err) {
      manifest[placeId] = {
        failed: err instanceof Error ? err.message : String(err),
      };
      failed++;
      console.warn(`  fail ${websiteUrl}: ${manifest[placeId].failed}`);
    }
    save(); // persist after every site so an interrupted run loses nothing
  }

  const withImages = Object.values(manifest).filter((e) => e.image).length;
  console.log(
    `Done: ${ok} fetched, ${failed} failed this run; manifest now has ${withImages} images. ` +
      `Next: npm run seed:pois (attaches thumbnails).`,
  );
}

main();
