// Builds worker/src/data/airports.json from the OurAirports airports.csv (public domain).
// Usage: node scripts/build-airports.mjs path/to/airports.csv
// Source: https://github.com/davidmegginson/ourairports-data (mirror of ourairports.com/data)
import { readFileSync, writeFileSync } from 'node:fs';

const [csvPath] = process.argv.slice(2);
if (!csvPath) throw new Error('Usage: node scripts/build-airports.mjs airports.csv');

/** Minimal CSV parser: handles quoted fields, commas and "" escapes inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const [header, ...rows] = parseCsv(readFileSync(csvPath, 'utf8'));
const col = Object.fromEntries(header.map((h, i) => [h, i]));

const airports = rows
  .filter(
    (r) =>
      (r[col.type] === 'large_airport' || r[col.type] === 'medium_airport') &&
      r[col.scheduled_service] === 'yes' &&
      /^[A-Z]{3}$/.test(r[col.iata_code] ?? ''),
  )
  .map((r) => [
    r[col.iata_code],
    r[col.name],
    r[col.municipality],
    r[col.iso_country],
    Math.round(Number(r[col.latitude_deg]) * 1e4) / 1e4,
    Math.round(Number(r[col.longitude_deg]) * 1e4) / 1e4,
    r[col.type] === 'large_airport' ? 1 : 0,
  ])
  .sort((a, b) => a[0].localeCompare(b[0]));

const out = {
  source: 'OurAirports (https://ourairports.com/data/), public domain',
  generated: new Date().toISOString().slice(0, 10),
  // Each row: [iata, name, city, countryCode, lat, lon, isLarge(1/0)]
  airports,
};
writeFileSync('worker/src/data/airports.json', JSON.stringify(out));
console.log(`Wrote ${airports.length} airports`);
