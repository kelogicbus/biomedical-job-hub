# Biomedical Research Job Hub

Centralized directory of entry-level biomedical research, pharma, and biotech jobs for new graduates in NYC + NJ.

## Features

- **33 curated job listings** across academia, pharma, biotech, CROs, and government
- **Salary Dashboard** with charts comparing pay by employer type, role level, and region
- **Application Pipeline** — kanban board to track your job applications through every stage
- **6-dimension filtering** — field, region, job type, employer sector, source, and "new this week"
- **24 live feed links** to Indeed, Glassdoor, LinkedIn, ZipRecruiter, and institutional career pages
- **Persistent state** — saved jobs and application tracker survive page reloads (localStorage)
- **CSV export** — download your tracked applications as a spreadsheet

## Setup (one-time)

### Prerequisites
- **Node.js** — download from [nodejs.org](https://nodejs.org) (LTS version)
- **Git** — download from [git-scm.com](https://git-scm.com)
- **GitHub account** — sign up at [github.com](https://github.com)

### Install and run locally

```bash
# 1. Open Terminal (Mac) or Command Prompt (Windows)
# 2. Navigate to where you downloaded this folder
cd biomedical-job-hub

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev

# 5. Open http://localhost:3000 in your browser
```

## Deploy to the internet (free)

### Step 1: Push to GitHub

```bash
cd biomedical-job-hub
git init
git add .
git commit -m "initial commit"
```

Go to [github.com/new](https://github.com/new), create a repository called `biomedical-job-hub`, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/biomedical-job-hub.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Select your `biomedical-job-hub` repository
4. Click **Deploy**
5. Your site will be live at `biomedical-job-hub.vercel.app` within 60 seconds

### Step 3 (optional): Custom domain

In Vercel dashboard → Settings → Domains → Add your domain (e.g., biomedjobs.com)

## Live job fetching (automatic)

The app automatically fetches fresh job listings every 6 hours from Adzuna (Indeed/Glassdoor aggregator), USAJobs (federal positions), and Science/Nature career RSS feeds.

To enable this, see **[docs/LIVE-SETUP-GUIDE.md](docs/LIVE-SETUP-GUIDE.md)** for the one-time setup (~15 minutes, all free).

Once configured, the app handles everything: fetching, deduplication, expiration of old listings, and merging with the curated dataset.

## Manual data refresh (alternative)

See `scripts/REFRESH-PROMPT.md` for manually refreshing via Cowork. This is useful as a supplement to the auto-fetch, or if you prefer manual control.

## Tech stack

- Next.js 14 (React, App Router)
- Tailwind CSS
- Recharts (salary visualizations)
- Vercel (hosting, free tier)
- Vercel Blob (job data caching, 1GB free)
- Adzuna + USAJobs + RSS (live job sources)
- localStorage (client-side persistence)
