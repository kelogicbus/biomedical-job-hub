/**
 * KV Storage helpers using Vercel Blob (public store).
 * Stores each key as a JSON file in Blob storage.
 * Gracefully falls back to null if Blob unavailable.
 *
 * Required env var (auto-set when you create a Blob store in Vercel dashboard):
 *   BLOB_READ_WRITE_TOKEN
 *
 * Free tier: 1GB storage, 10k reads/month, 2k writes/month.
 */

import { put, head, list, del } from "@vercel/blob";

const PREFIX = "bjh/"; // namespace all keys under bjh/

function blobPath(key) {
  return `${PREFIX}${key}.json`;
}

export async function kvGet(key) {
  try {
    const path = blobPath(key);

    // Use head() to get blob metadata by exact pathname
    const blob = await head(path).catch(() => null);
    if (!blob || !blob.url) {
      console.log(`KV GET ${key}: blob not found at path ${path}`);
      return null;
    }

    // Fetch with cache-busting to avoid stale CDN responses
    const url = `${blob.url}?t=${Date.now()}`;
    const res = await fetch(url, {
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) {
      console.error(`KV GET ${key}: fetch failed ${res.status} from ${blob.url}`);
      return null;
    }

    const data = await res.json();
    console.log(`KV GET ${key}: success, ${JSON.stringify(data).length} bytes`);
    return data;
  } catch (err) {
    console.error(`KV GET ${key} failed:`, err.message);
    return null;
  }
}

export async function kvSet(key, value) {
  try {
    const path = blobPath(key);
    const body = JSON.stringify(value);

    const blob = await put(path, body, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    console.log(`KV SET ${key}: stored at ${blob.url} (${body.length} bytes)`);
    return true;
  } catch (err) {
    console.error(`KV SET ${key} failed:`, err.message);
    return false;
  }
}

export async function kvDel(key) {
  try {
    const path = blobPath(key);
    const blob = await head(path).catch(() => null);
    if (blob) {
      await del(blob.url);
    }
    return true;
  } catch (err) {
    console.error(`KV DEL ${key} failed:`, err.message);
    return false;
  }
}
