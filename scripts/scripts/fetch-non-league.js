// Fetches upcoming fixtures for the tracked Non League teams using the
// OFFICIAL Football Web Pages non-league API (not scraping).
//
// Requires an API key from footballwebpages.co.uk, set as the FWP_API_KEY
// environment variable (stored as a GitHub Actions secret in production).
//
// Run manually with: FWP_API_KEY=xxxx npm run fetch:non-league

import { writeFileSync, mkdirSync } from 'node:fs';

const API_KEY = process.env.FWP_API_KEY;
const BASE_URL = 'https://api.footballwebpages.co.uk/v2';

// Team IDs need filling in once we have API access and can look them up
// via the /teams.json endpoint. Placeholder structure for now.
const TRACKED_TEAMS = [
  { name: 'Molesey', id: null },
  { name: 'Corinthian Casuals', id: null },
  { name: 'Metropolitan Police', id: null },
  { name: 'Walton & Hersham', id: null },
  { name: 'Kingstonian', id: null },
  { name: 'Cobham', id: null },
  { name: 'Sutton United', id: null },
  { name: 'Hampton & Richmond Borough', id: null },
];

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'FWP-API-Key': API_KEY },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function isMidweek(dateStr) {
  const day = new Date(dateStr).getDay(); // 0=Sun ... 6=Sat
  return day >= 1 && day <= 5;
}

async function main() {
  if (!API_KEY) {
    console.error(
      'FWP_API_KEY is not set. Request a key from footballwebpages.co.uk, ' +
        'then set it as an environment variable (or GitHub Actions secret) before running this script.'
    );
    process.exit(1);
  }

  const allFixtures = [];

  for (const team of TRACKED_TEAMS) {
    if (!team.id) {
      console.warn(`Skipping ${team.name} — no team ID set yet. Look this up via /teams.json once the API key arrives.`);
      continue;
    }
    console.log(`Fetching fixtures for ${team.name}...`);
    const data = await fetchJson(`${BASE_URL}/fixtures-results.json?team=${team.id}`);
    const upcoming = (data.fixtures || []).filter(
      (f) => f.status === 'fixture' && f.venue === 'home' && isMidweek(f.date)
    );
    for (const f of upcoming) {
      allFixtures.push({
        team: team.name,
        date: f.date,
        time: f.time,
        opponent: f['team-b']?.name || f.opponent,
        competition: f.competition?.name,
      });
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'footballwebpages.co.uk (official non-league API)',
    midweekHomeFixtures: allFixtures,
  };

  mkdirSync('data', { recursive: true });
  writeFileSync('data/non-league.json', JSON.stringify(output, null, 2));
  console.log('Wrote data/non-league.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
