# Match Day Automation

This is a separate small project from the main app. Its only job is to
check football data sources on a schedule and save the results as JSON
files, so the app never needs manual updates again.

## What it does

- **Lincoln City**: scrapes footballwebpages.co.uk (fixtures/results + league
  table) — no API key needed.
- **Non League**: uses the official Football Web Pages non-league API —
  needs a free API key (see below).

Both write into the `data/` folder as JSON files. A GitHub Actions workflow
runs both scripts automatically every Monday and Thursday morning, and
commits any changes back to this repo.

## One-time setup

1. Create a new GitHub repository (public is fine, e.g. `match-day-data`).
2. Upload this whole folder's contents into that repository.
3. If/when you get an API key from footballwebpages.co.uk:
   - Go to the repo's **Settings → Secrets and variables → Actions**
   - Click **New repository secret**
   - Name: `FWP_API_KEY`, Value: (the key they email you)
4. Go to the **Actions** tab in your repo and enable workflows if prompted.
5. That's it — it'll run automatically on the schedule. You can also click
   **Run workflow** manually any time from the Actions tab to force an
   immediate update.

## Connecting the main app

Once this is running and `data/lincoln-city.json` exists in the repo, the
main app can fetch it directly from GitHub's raw content URL, e.g.:

```
https://raw.githubusercontent.com/<your-username>/match-day-data/main/data/lincoln-city.json
```

The LincolnCity.jsx and NonLeague.jsx pages will need a small change to
fetch from this URL instead of using hardcoded arrays — this is the next
step once this repo is live and producing data.

## Non League team IDs still needed

`scripts/fetch-non-league.js` has placeholder `id: null` for each tracked
team. Once the API key arrives, we need to look up each team's numeric ID
via the API's `/teams.json` endpoint and fill these in.
