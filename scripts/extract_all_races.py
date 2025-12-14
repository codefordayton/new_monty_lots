#!/usr/bin/env python3
"""
Extract all races and issues from election PDF files.

This script identifies each race/issue in the PDF and extracts them into
separate CSV files for analysis.

Usage:
    python3 extract_all_races.py

Requirements:
    pip3 install pdfplumber pandas --break-system-packages
"""

import pdfplumber
import pandas as pd
import re
from pathlib import Path

# Directory paths
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
RAW_DIR = DATA_DIR / 'raw' / '2024'
PROCESSED_DIR = DATA_DIR / 'processed'

# Input PDF
PRECINCT_PDF = RAW_DIR / '11052024-Precinct-by-Precinct-Official-Final-with-write-ins.pdf'


def clean_field_name(text):
    """Clean field names for CSV headers."""
    if not text:
        return ''

    # Remove party abbreviations and clean up
    text = str(text).strip()
    text = re.sub(r'\n(DEM|REP|LIB|NPC|OPC|GRE|IND)$', '', text)
    text = text.replace('\n', ' ')
    text = text.strip()

    return text


def sanitize_filename(text):
    """Convert race name to valid filename."""
    # Remove special characters, replace spaces with underscores
    text = str(text).lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '_', text)
    return text[:50]  # Limit length


def identify_race_tables(pdf_path):
    """Identify all unique races/issues and their page ranges."""
    print(f"📖 Scanning PDF for races: {pdf_path.name}")

    races = []
    current_race = None

    with pdfplumber.open(pdf_path) as pdf:
        print(f"   Pages: {len(pdf.pages)}")

        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text()
            if not text:
                continue

            lines = text.split('\n')

            # Look for race title patterns
            for i, line in enumerate(lines):
                line = line.strip()

                # Skip common headers
                if 'Statement of Vote' in line or 'MONTGOMERY COUNTY' in line:
                    continue

                # Check for "VOTE FOR" which indicates a race
                if i + 1 < len(lines) and 'VOTE FOR' in lines[i + 1]:
                    race_name = line

                    # Start new race or continue existing
                    if current_race and current_race['name'] == race_name:
                        current_race['end_page'] = page_num
                    else:
                        if current_race:
                            races.append(current_race)

                        current_race = {
                            'name': race_name,
                            'start_page': page_num,
                            'end_page': page_num
                        }
                    break

                # Check for STATISTICS (first section)
                if 'STATISTICS' in line and not current_race:
                    current_race = {
                        'name': 'STATISTICS',
                        'start_page': page_num,
                        'end_page': page_num
                    }
                elif current_race and current_race['name'] == 'STATISTICS' and 'STATISTICS' in line:
                    current_race['end_page'] = page_num

        # Add last race
        if current_race:
            races.append(current_race)

    print(f"   Found {len(races)} unique races/sections")
    return races


def extract_race_data(pdf_path, race_info):
    """Extract data for a specific race."""
    race_name = race_info['name']
    start_page = race_info['start_page']
    end_page = race_info['end_page']

    print(f"\n   Extracting: {race_name}")
    print(f"   Pages: {start_page + 1} to {end_page + 1}")

    all_rows = []
    candidates = None

    with pdfplumber.open(pdf_path) as pdf:
        for page_num in range(start_page, end_page + 1):
            if page_num >= len(pdf.pages):
                break

            page = pdf.pages[page_num]
            tables = page.extract_tables()

            if not tables:
                continue

            for table in tables:
                if not table or len(table) < 3:
                    continue

                # Identify header rows
                # For STATISTICS: row 0 has "STATISTICS", row 1 has column headers
                # For races: row 0 has race name, row 1 has "VOTE FOR", row 2 has candidates

                if race_name == 'STATISTICS':
                    # STATISTICS table
                    if candidates is None:
                        # Extract column headers from row 1
                        header_row = table[1]
                        candidates = [clean_field_name(h) for h in header_row if h]

                    # Extract data rows (skip first 2 header rows)
                    for row in table[2:]:
                        if not row or not row[0]:
                            continue

                        precinct = str(row[0]).strip()
                        if not precinct or precinct.lower().startswith(('total', 'summary', 'county')):
                            continue

                        # Create row dict
                        row_data = {'precinct_code': precinct}
                        for i, value in enumerate(row[1:], 1):
                            if i <= len(candidates):
                                col_name = candidates[i-1] if candidates[i-1] else f'col_{i}'
                                row_data[col_name] = str(value).strip() if value else None

                        all_rows.append(row_data)

                else:
                    # Race/issue table
                    if candidates is None:
                        # Extract candidate names from row 2
                        candidate_row = table[2] if len(table) > 2 else None
                        if candidate_row:
                            candidates = [clean_field_name(c) for c in candidate_row if c]

                    # Extract data rows (skip first 3 header rows)
                    for row in table[3:]:
                        if not row or not row[0]:
                            continue

                        precinct = str(row[0]).strip()
                        if not precinct or precinct.lower().startswith(('total', 'summary', 'county')):
                            continue

                        # Create row dict
                        row_data = {'precinct_code': precinct}
                        for i, value in enumerate(row[1:], 1):
                            if i <= len(candidates):
                                col_name = candidates[i-1] if candidates[i-1] else f'candidate_{i}'
                                row_data[col_name] = str(value).strip() if value else None

                        all_rows.append(row_data)

    print(f"   Rows extracted: {len(all_rows)}")

    # Remove duplicates (same precinct appearing on multiple pages)
    if all_rows:
        df = pd.DataFrame(all_rows)
        # Keep first occurrence of each precinct
        df = df.drop_duplicates(subset=['precinct_code'], keep='first')
        print(f"   Unique precincts: {len(df)}")
        return df

    return pd.DataFrame()


def main():
    """Main extraction workflow."""
    print("=" * 60)
    print("Montgomery County 2024 Election - All Races Extraction")
    print("=" * 60)

    # Ensure output directory exists
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    # Check if PDF exists
    if not PRECINCT_PDF.exists():
        print(f"\n❌ Error: PDF not found: {PRECINCT_PDF}")
        return

    try:
        # Step 1: Identify all races
        print("\nSTEP 1: Identify all races and issues")
        print("=" * 60)
        races = identify_race_tables(PRECINCT_PDF)

        for i, race in enumerate(races, 1):
            print(f"   {i}. {race['name']} (pages {race['start_page']+1}-{race['end_page']+1})")

        # Step 2: Extract each race
        print("\n" + "=" * 60)
        print("STEP 2: Extract data for each race")
        print("=" * 60)

        extracted_files = []

        for race in races:
            df = extract_race_data(PRECINCT_PDF, race)

            if not df.empty:
                # Save to CSV
                filename = f"race_{sanitize_filename(race['name'])}_2024.csv"
                output_path = PROCESSED_DIR / filename
                df.to_csv(output_path, index=False)
                extracted_files.append(output_path)
                print(f"   ✓ Saved: {filename}")

        # Summary
        print("\n" + "=" * 60)
        print("✅ EXTRACTION COMPLETE")
        print("=" * 60)
        print(f"\nExtracted {len(extracted_files)} race files:")
        for filepath in extracted_files:
            print(f"   - {filepath.name}")

        print(f"\nOutput directory: {PROCESSED_DIR}")

        print("\nNext Steps:")
        print("1. Review the CSV files in data/processed/")
        print("2. Clean numeric fields (remove commas)")
        print("3. Calculate additional metrics (turnout rates, percentages)")
        print("4. Join STATISTICS with precinct GeoJSON using VLABEL field")
        print("5. Analyze race results by geographic area")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
