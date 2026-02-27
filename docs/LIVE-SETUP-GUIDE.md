# Live Job Fetching — Setup Guide

Your job hub can automatically fetch fresh biomedical job postings every 6 hours from 3 free sources: Adzuna (aggregates Indeed/Glassdoor), USAJobs (federal research positions), and Science/Nature career feeds. Jobs are cached in Vercel Blob storage (1GB free).

## What you need (all free)

1. **Adzuna API key** — aggregates job boards (Indeed, Glassdoor, etc.)
2. **USAJobs API key** — federal government research positions
3. **Vercel Blob store** — caches fetched jobs (built into Vercel, no external account needed)

Total cost: $0/month on free tiers.

---

## Step 1: Get an Adzuna API key

1. Go to [developer.adzuna.com](https://developer.adzuna.com)
2. Click "Sign Up" and create a free account
3. Once logged in, you'll see your **Application ID** and **Application Key**
4. Copy both — you'll need them in Step 4

Free tier: 1,000 API calls/month (we use ~480/month, plenty of room).

## Step 2: Get a USAJobs API key

1. Go to [developer.usajobs.gov](https://developer.usajobs.gov/APIRequest/Index)
2. Fill out the API key request form
3. You'll receive your API key by email (usually within minutes)
4. Copy it — you'll need it in Step 4

Free tier: Unlimited calls.

## Step 3: Create a Vercel Blob store

1. Go to your [Vercel dashboard](https://vercel.com/dashboard)
2. Click on your `biomedical-job-hub` project
3. Go to the **Storage** tab (in the top nav)
4. Click **Create** → Select **Blob**
5. Name it `job-cache` (or anything you like)
6. Click **Create**
7. Vercel automatically adds the `BLOB_READ_WRITE_TOKEN` environment variable to your project

That's it. No external accounts, no SQL, no tables to create.

Free tier: 1GB storage, 10,000 reads/month, 2,000 writes/month.

## Step 4: Add environment variables

1. In your Vercel dashboard, go to your project
2. Click **Settings** → **Environment Variables**
3. The `BLOB_READ_WRITE_TOKEN` was already added in Step 3. Add these 4 more:

| Name | Value | Where to find it |
|------|-------|-------------------|
| `ADZUNA_API_ID` | Your Adzuna Application ID | developer.adzuna.com dashboard |
| `ADZUNA_API_KEY` | Your Adzuna Application Key | developer.adzuna.com dashboard |
| `USAJOBS_API_KEY` | Your USAJobs API key | Email from developer.usajobs.gov |
| `CRON_SECRET` | Any random string (e.g., `my-secret-cron-key-2024`) | You make this up |

4. Click **Save** for each one
5. Make sure all are set for **Production** environment

## Step 5: Deploy

```bash
cd biomedical-job-hub
npm install
git add .
git commit -m "add live job fetching with vercel blob"
git push
```

Vercel will auto-deploy. The cron job starts running every 6 hours automatically.

## Step 6: Verify it works

1. Wait for the first cron run (up to 6 hours), OR trigger it manually:
   - In Vercel dashboard → your project → **Cron Jobs** tab → click **Trigger** next to the fetch-jobs entry
2. Check your site — you should see new jobs appearing
3. In the header, you'll see "Updated Xh ago" with a green dot when live data is active
4. In Vercel dashboard → **Storage** → your Blob store — you should see files like `bjh/jobs-live.json`

---

## Troubleshooting

**Jobs not updating?**
- Check Vercel dashboard → **Cron Jobs** tab → verify executions are succeeding
- Check that all environment variables are set (especially `BLOB_READ_WRITE_TOKEN`)
- Try visiting `https://your-site.vercel.app/api/jobs` directly — it should return JSON

**Seeing only fallback data?**
- The cron hasn't run yet. Wait up to 6 hours or trigger manually
- If Blob isn't set up, the app gracefully falls back to the curated 33-job list

**API rate limits?**
- Adzuna: 1,000 calls/month. We use ~4 calls per cron run x 4 runs/day x 30 days = ~480/month
- USAJobs: Unlimited
- RSS: No limits
- Blob: 2,000 writes/month. We use ~4 writes per cron x 4/day x 30 = ~480/month

**Storage size?**
- Even 1,000 jobs with full descriptions = ~1MB. The 1GB free tier can hold ~1,000x that.

---

## How it works

```
Every 6 hours (Vercel cron):
  Adzuna API ──┐
  USAJobs API ─┤──→ Normalize ──→ Deduplicate ──→ Remove expired ──→ Store in Blob
  RSS Feeds ───┘

On page load:
  /api/jobs ──→ Read from Blob ──→ Return JSON ──→ Frontend renders
                  ↓ (if Blob fails)
              Fall back to static jobs.json
```

The cron job fetches from all 3 sources in parallel, normalizes results to a consistent schema, deduplicates by title+company+location, removes jobs older than 30 days, merges with your curated static list, and stores as a JSON blob. The frontend reads from `/api/jobs` on every page load.
