#!/usr/bin/env python3
"""
Parse 2023 election PDFs into CSV files for the web app.

Reads:
  data/raw/2023/11072023-Precinct-by-Precinct-Official-Final-pdf.pdf
  data/raw/2023/11072023-Election-Summary-Official-Final-pdf.pdf

Writes:
  data/raw/elections23/summary.csv       (turnout statistics)
  data/raw/elections23/{race_name}.csv   (one per race)

Then run:
  python3 scripts/convert_elections_to_json.py 2023
"""

import csv
import re
import sys
from pathlib import Path

import pdfplumber


PRECINCT_PDF = Path('data/raw/2023/11072023-Precinct-by-Precinct-Official-Final-pdf.pdf')
SUMMARY_PDF  = Path('data/raw/2023/11072023-Election-Summary-Official-Final-pdf.pdf')
OUTPUT_DIR   = Path('data/raw/elections23')


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def clean_cell(val):
    """Normalise a pdfplumber cell value to a plain string."""
    if val is None:
        return ''
    return str(val).replace('\n', ' ').strip()


def parse_number(val):
    """Convert a number string (possibly with commas or %) to float/int."""
    s = clean_cell(val).replace(',', '').replace('%', '').strip()
    if not s:
        return None
    try:
        f = float(s)
        return int(f) if f == int(f) else f
    except ValueError:
        return s


def turnout_to_decimal(val):
    """Convert '54.76%' or '54.76' or 0.5476 to a decimal like 0.5476."""
    s = clean_cell(val).replace('%', '').strip()
    if not s:
        return None
    try:
        f = float(s)
        return round(f / 100, 6) if f > 1 else round(f, 6)
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Step 1 – collect full race names from the summary PDF
# ---------------------------------------------------------------------------

def get_full_race_names():
    """
    Return an ordered list of all race names from the summary PDF.
    Race names appear as lines immediately before a 'Vote For N' line.
    """
    races = []
    skip_prefixes = ('Custom Table', 'Summary Results', 'OFFICIAL', 'November',
                     'Page ', 'Election', 'Statistics', 'Registered', 'Ballots',
                     'Voter Turnout', 'Precincts')
    with pdfplumber.open(SUMMARY_PDF) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ''
            lines = [l.strip() for l in text.split('\n')]
            for i, line in enumerate(lines):
                if i + 1 < len(lines) and re.match(r'Vote For \d+', lines[i + 1]):
                    if line and not any(line.startswith(p) for p in skip_prefixes):
                        if line not in races:
                            races.append(line)
    return races


def best_match(truncated, full_names):
    """
    Find the best full race name for a (possibly truncated/newline-split) name
    extracted from the precinct PDF.
    Returns the matched name or the cleaned truncated name if no match found.
    """
    cleaned = re.sub(r'\s+', ' ', truncated).strip()
    if not cleaned:
        return cleaned

    # Exact match first
    for name in full_names:
        if name == cleaned:
            return name

    # Prefix match – find all full names that start with cleaned (ignoring case)
    prefix_matches = [n for n in full_names if n.lower().startswith(cleaned.lower())]
    if len(prefix_matches) == 1:
        return prefix_matches[0]
    if len(prefix_matches) > 1:
        # Return the shortest (most specific) match
        return min(prefix_matches, key=len)

    # Reverse: cleaned starts with the full name prefix (full name is shorter)
    for name in full_names:
        if cleaned.lower().startswith(name.lower()[:15]):
            return name

    return cleaned


# ---------------------------------------------------------------------------
# Step 2 – parse statistics from the precinct PDF
# ---------------------------------------------------------------------------

def is_statistics_table(table):
    """Return True if this pdfplumber table is a statistics (turnout) table."""
    if not table or len(table) < 3:
        return False
    row0 = [clean_cell(c) for c in table[0]]
    row1 = [clean_cell(c) for c in table[1]]
    combined = ' '.join(row0 + row1).lower()
    return 'statistics' in combined or 'registered' in combined


def parse_statistics_table(table):
    """
    Return a list of dicts with keys:
      Precinct, Registered Voters - Total, Ballots Cast - Total,
      Ballots Cast - Blank, Voter Turnout - Total
    """
    rows = []
    # Data rows start after the header rows (first non-None col-0 row)
    for row in table:
        precinct = clean_cell(row[0])
        if not precinct or precinct in ('', 'Totals'):
            continue
        # Skip rows that look like headers
        if any(kw in precinct.lower() for kw in ('statistic', 'registered', 'ballots', 'voter')):
            continue
        if len(row) < 5:
            continue
        registered  = parse_number(row[1])
        cast_total  = parse_number(row[2])
        cast_blank  = parse_number(row[3])
        turnout     = turnout_to_decimal(row[4])
        if registered is None:
            continue
        rows.append({
            'Precinct': precinct,
            'Registered Voters - Total': registered,
            'Ballots Cast - Total': cast_total,
            'Ballots Cast - Blank': cast_blank,
            'Voter Turnout - Total': turnout,
        })
    return rows


# ---------------------------------------------------------------------------
# Step 3 – parse race tables from the precinct PDF
# ---------------------------------------------------------------------------

def find_data_start(table):
    """Return the index of the first true data row (precinct code in col 0)."""
    for i, row in enumerate(table):
        val = clean_cell(row[0])
        if val and val != 'Totals' and not any(
            kw in val.lower() for kw in ('vote for', 'statistics', 'registered', 'ballots', 'turnout')
        ):
            return i
    return len(table)


def parse_race_table(table, full_names):
    """
    Parse a race results table (may contain multiple side-by-side races).

    Returns:
        dict mapping race_name -> list of result dicts
        Each result dict: { 'Precinct': ..., candidate_name: votes, ...,
                            'Total Votes Cast': n, 'Overvotes': 0,
                            'Undervotes': n, 'Contest Total': n }
    """
    if not table or len(table) < 4:
        return {}

    data_start = find_data_start(table)
    if data_start >= len(table):
        return {}

    # The row just before data rows contains candidate names
    candidate_row = table[data_start - 1]
    # Row 0 contains race names (may span columns – non-None = start of new race)
    race_name_row = table[0]

    # Build race groups by scanning row 0 for non-None values
    races = []   # list of dicts: {name, start_col, end_col, cand_cols, total_col, contest_col}
    for col_idx, cell in enumerate(race_name_row):
        if col_idx == 0:
            continue
        val = clean_cell(cell)
        if val:
            races.append({
                'raw_name': val,
                'start_col': col_idx,
                'end_col': None,
                'cand_cols': [],     # (col_idx, candidate_name)
                'total_col': None,
                'contest_col': None,
            })

    if not races:
        return {}

    # Set end columns
    for i, race in enumerate(races):
        race['end_col'] = races[i + 1]['start_col'] if i + 1 < len(races) else len(candidate_row)

    # Parse candidate headers within each race's column range
    for race in races:
        for col_idx in range(race['start_col'], race['end_col']):
            cell = clean_cell(candidate_row[col_idx])
            if not cell:
                continue
            if re.search(r'Total\s*Votes\s*Cast', cell, re.I):
                race['total_col'] = col_idx
            elif re.search(r'Contest\s*Total', cell, re.I):
                race['contest_col'] = col_idx
            else:
                # Candidate name – clean up newlines
                cand_name = re.sub(r'\s+', ' ', cell).strip()
                race['cand_cols'].append((col_idx, cand_name))

        # Resolve full race name
        race['name'] = best_match(race['raw_name'], full_names)

    # Collect results per race
    results_by_race = {r['name']: [] for r in races}

    for row in table[data_start:]:
        precinct = clean_cell(row[0])
        if not precinct or precinct == 'Totals':
            continue

        for race in races:
            total_col = race['total_col']
            if total_col is None or total_col >= len(row):
                continue
            total_raw = clean_cell(row[total_col])
            if not total_raw:
                continue  # precinct didn't vote in this race

            total_votes = parse_number(total_raw)
            contest_raw = clean_cell(row[race['contest_col']]) if race['contest_col'] else None
            contest_total = parse_number(contest_raw) if contest_raw else total_votes

            result = {'Precinct': precinct}
            for col_idx, cand_name in race['cand_cols']:
                if col_idx < len(row):
                    result[cand_name] = parse_number(clean_cell(row[col_idx])) or 0

            result['Total Votes Cast'] = total_votes or 0
            result['Contest Total'] = contest_total or 0

            results_by_race[race['name']].append(result)

    return results_by_race


# ---------------------------------------------------------------------------
# Step 4 – write CSV files
# ---------------------------------------------------------------------------

def safe_filename(name):
    """Convert a race name to a safe filename (no special chars)."""
    return re.sub(r'[<>:"/\\|?*]', '', name).strip()


def write_summary_csv(rows, output_dir):
    path = output_dir / 'summary.csv'
    fields = ['Precinct', 'Registered Voters - Total', 'Ballots Cast - Total',
              'Ballots Cast - Blank', 'Voter Turnout - Total']
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    return path


def write_race_csv(race_name, results, output_dir):
    if not results:
        return None
    fields = list(results[0].keys())
    filename = safe_filename(race_name) + '.csv'
    path = output_dir / filename
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(results)
    return path


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print('📋 Reading full race names from summary PDF...')
    full_names = get_full_race_names()
    print(f'   Found {len(full_names)} races')

    all_stats = []
    all_races = {}   # race_name -> list of result dicts

    print('\n📄 Parsing precinct-by-precinct PDF...')
    with pdfplumber.open(PRECINCT_PDF) as pdf:
        total_pages = len(pdf.pages)
        for page_num, page in enumerate(pdf.pages):
            sys.stdout.write(f'\r   Page {page_num + 1}/{total_pages}')
            sys.stdout.flush()

            tables = page.extract_tables()
            for table in tables:
                if is_statistics_table(table):
                    rows = parse_statistics_table(table)
                    all_stats.extend(rows)
                else:
                    race_results = parse_race_table(table, full_names)
                    for race_name, results in race_results.items():
                        if race_name not in all_races:
                            all_races[race_name] = []
                        all_races[race_name].extend(results)

    print(f'\n\n📊 Statistics: {len(all_stats)} precinct rows')
    print(f'🗳️  Races: {len(all_races)} races found')

    # Deduplicate stats rows (same precinct may appear on multiple pages)
    seen_precincts = set()
    unique_stats = []
    for row in all_stats:
        if row['Precinct'] not in seen_precincts:
            seen_precincts.add(row['Precinct'])
            unique_stats.append(row)

    print(f'\n💾 Writing CSVs to {OUTPUT_DIR}/')

    path = write_summary_csv(unique_stats, OUTPUT_DIR)
    print(f'   ✓ {path.name} ({len(unique_stats)} precincts)')

    written = 0
    for race_name, results in sorted(all_races.items()):
        if not results:
            continue
        path = write_race_csv(race_name, results, OUTPUT_DIR)
        if path:
            written += 1

    print(f'   ✓ {written} race CSV files')
    print(f'\n✅ Done. Now run:')
    print(f'   python3 scripts/convert_elections_to_json.py 2023')


if __name__ == '__main__':
    main()
