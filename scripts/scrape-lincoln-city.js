// Scrapes footballwebpages.co.uk for Lincoln City's Championship fixtures,
// results and league table position, and writes data/lincoln-city.json.
//
// Run manually with: npm run scrape:lincoln
// Run automatically every week by .github/workflows/update-data.yml

import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync } from 'node:fs';

const FIXTURES_URL = 'https://www.footballwebpages.co.uk/lincoln-city/fixtures-results';
const TABLE_URL = 'https://www.footballwebpages.co.uk/championship';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (personal fan project; contact: n/a)',
};

async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parseFixturesAndResults(html) {
  const $ = cheerio.load(html);
  const rows = [];

  // The fixtures/results table has columns: Date | H/A | Opponent | Competition | KO/Score
  $('table')
    .first()
    .find('tr')
    .each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length < 5) return; // skip header row
      const date = $(cells[0]).text().trim();
      const venue = $(cells[1]).text().trim();
      const opponent = $(cells[2]).text().trim();
      const competition = $(cells[3]).text().trim();
      const koOrScore = $(cells[4]).text().trim();
      if (!date || !opponent) return;
      rows.push({ date, venue, opponent, competition, koOrScore });
    });

  return rows;
}

function splitFixturesAndResults(rows) {
  // A row is a played result if the KO/Score column looks like "X - Y",
  // otherwise it's an upcoming fixture (a kickoff time like "3pm").
  const scorePattern = /^\d+\s*-\s*\d+$/;
  const results = rows.filter((r) => scorePattern.test(r.koOrScore));
  const fixtures = rows.filter((r) => !scorePattern.test(r.koOrScore));
  return { results, fixtures };
}

function parseLeagueTable(html, focusTeam = 'Lincoln City', spread = 3) {
  const $ = cheerio.load(html);
  const allRows = [];

  $('table')
    .first()
    .find('tr')
    .each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length < 9) return;
      const team = $(cells[1]).text().trim() || $(cells[0]).text().trim();
      const p = $(cells[cells.length - 8]).text().trim();
      const w = $(cells[cells.length - 7]).text().trim();
      const d = $(cells[cells.length - 6]).text().trim();
      const l = $(cells[cells.length - 5]).text().trim();
      const gd = $(cells[cells.length - 2]).text().trim();
      const pts = $(cells[cells.length - 1]).text().trim();
      if (!team || !p) return;
      allRows.push({ team, p, w, d, l, gd, pts });
    });

  const focusIndex = allRows.findIndex((r) =>
    r.team.toLowerCase().includes(focusTeam.toLowerCase())
  );
  if (focusIndex === -1) return allRows; // fallback: return everything found

  const start = Math.max(0, focusIndex - spread);
  const end = Math.min(allRows.length, focusIndex + spread + 1);
  return allRows.slice(start, end).map((r, i) => ({
    ...r,
    pos: start + i + 1,
    isFocusTeam: start + i === focusIndex,
  }));
}

async function main() {
  console.log('Fetching Lincoln City fixtures/results...');
  const fixturesHtml = await fetchHtml(FIXTURES_URL);
  const allRows = parseFixturesAndResults(fixturesHtml);
  const { results, fixtures } = splitFixturesAndResults(allRows);

  console.log('Fetching Championship table...');
  const tableHtml = await fetchHtml(TABLE_URL);
  const table = parseLeagueTable(tableHtml);

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'footballwebpages.co.uk',
    table,
    // last 3 results, most recent last
    lastResults: results.slice(-3),
    // next 5 upcoming fixtures
    nextFixtures: fixtures.slice(0, 5),
  };

  mkdirSync('data', { recursive: true });
  writeFileSync('data/lincoln-city.json', JSON.stringify(output, null, 2));
  console.log('Wrote data/lincoln-city.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
