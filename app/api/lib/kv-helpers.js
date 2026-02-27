/**
 * KV Storage helpers using Vercel Blob.
 * Stores each key as a JSON file in Blob storage.
 * Gracefully falls back to null if Blob unavailable.
 *
 * Required env var (auto-set when you create a Blob store in Vercel dashboard):
 *   BLOB_READ_WRITE_TOKEN
 *
 * Free tier: 1GB storage, 10k reads/month, 2k writes/month.
 */

import { put, list, del, head } from "@vercel/blob";

const PREFIX = "bjh/"; // namespace all keys under bjh/

function blobPath(key) {
  return `${PREFIX}${key}.json`;
}

export async function kvGet(key) {
  try {
    const path = blobPath(key);

    // Check if blob exists first
    const info = await head(path).catch(() => null);
    if (!info) return null;

    // Fetch the blob content
    const res = await fetch(info.url);
    if (!res.ok) return null;

    const data = await res.json();
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

    await put(path, body, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false, // use exact path so we can overwrite
    });

    return true;
  } catch (err) {
    console.error(`KV SET ${key} failed:`, err.message);
    return false;
  }
}

export async function kvDel(key) {
  try {
    const path = blobPath(key);
    const info = await head(path).catch(() => null);
    if (info) {
      await del(info.url);
    }
    return true;
  } catch (err) {
    console.error(`KV DEL ${key} failed:`, err.message);
    return false;
  }
}
