#!/usr/bin/env python3
"""
Extract election data from PDF files and convert to CSV format.

This script extracts precinct-level election results from Montgomery County
Board of Elections PDF files and outputs clean CSV files ready for analysis.

Usage:
    python3 extract_pdf_data.py

Requirements:
    pip3 install pdfplumber pandas --user
"""

import pdfplumber
import pandas as pd
import re
import sys
from pathlib import Path

# Directory paths
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
RAW_DIR = DATA_DIR / 'raw' / '2024'
PROCESSED_DIR = DATA_DIR / 'processed'

# Input PDF files
PRECINCT_PDF = RAW_DIR / '11052024-Precinct-by-Precinct-Official-Final-with-write-ins.pdf'
SUMMARY_PDF = RAW_DIR / '11052024es-final-with-write-ins.pdf'

# Output CSV files
PRECINCT_CSV = PROCESSED_DIR / 'precincts_2024.csv'
SUMMARY_CSV = PROCESSED_DIR / 'summary_2024.csv'


def extract_tables_from_pdf(pdf_path):
    """Extract all tables from a PDF file."""
    print(f"📖 Reading PDF: {pdf_path.name}")

    tables = []
    with pdfplumber.open(pdf_path) as pdf:
        print(f"   Pages: {len(pdf.pages)}")

        for i, page in enumerate(pdf.pages, 1):
            if i % 10 == 0:
                print(f"   Processing page {i}...")

            # Extract tables from page
            page_tables = page.extract_tables()
            if page_tables:
                tables.extend(page_tables)

    print(f"   Found {len(tables)} tables")
    return tables


def clean_precinct_id(precinct_str):
    """Clean and standardize precinct identifiers."""
    if not precinct_str:
        return None

    # Remove whitespace and convert to string
    precinct_str = str(precinct_str).strip()

    # Extract 4-digit precinct code (e.g., "0100" from various formats)
    match = re.search(r'\d{4}', precinct_str)
    if match:
        return match.group(0)

    return precinct_str


def parse_precinct_tables(tables):
    """Parse precinct-level election tables."""
    print("\n🔍 Parsing precinct data...")

    all_data = []

    for table_idx, table in enumerate(tables):
        if not table or len(table) < 3:  # Need at least header + 2 rows
            continue

        # Check if this looks like a precinct statistics table
        # Header row usually has "STATISTICS" or similar
        header_row1 = table[0] if len(table) > 0 else []
        header_row2 = table[1] if len(table) > 1 else []

        # Look for "STATISTICS" or voter-related headers
        is_stats_table = False
        if header_row1:
            is_stats_table = any('statistic' in str(cell).lower() for cell in header_row1 if cell)

        if header_row2:
            # Check for voter/ballot headers
            header_text = ' '.join([str(cell).lower() for cell in header_row2 if cell])
            is_stats_table = is_stats_table or ('voter' in header_text and 'ballot' in header_text)

        if not is_stats_table:
            continue

        print(f"   Processing statistics table {table_idx + 1} ({len(table)} rows)...")

        # Extract rows (skip first 2 header rows)
        for row_idx, row in enumerate(table[2:], start=2):
            if not row or len(row) < 2:
                continue

            # First column should be precinct code
            precinct_code = str(row[0]).strip() if row[0] else None

            # Skip if no precinct code or if it's a total/summary row
            if not precinct_code:
                continue

            if precinct_code.lower().startswith(('total', 'summary', 'county', 'none')):
                continue

            # Extract all columns
            row_data = {
                'precinct_code': precinct_code,
                'registered_voters': str(row[1]).strip() if len(row) > 1 and row[1] else None,
                'ballots_cast': str(row[2]).strip() if len(row) > 2 and row[2] else None,
                'blank_ballots': str(row[3]).strip() if len(row) > 3 and row[3] else None,
                'turnout_pct': str(row[4]).strip() if len(row) > 4 and row[4] else None,
            }

            all_data.append(row_data)

    print(f"   Extracted {len(all_data)} precinct rows")
    return all_data


def extract_summary_data(pdf_path):
    """Extract county-wide summary data."""
    print(f"\n📊 Extracting summary from {pdf_path.name}...")

    summary_data = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            # Extract text from page
            text = page.extract_text()

            # Look for key metrics
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
                if line:
                    summary_data.append({'line': line})

    print(f"   Extracted {len(summary_data)} lines")
    return summary_data


def save_raw_extraction(data, output_path):
    """Save raw extracted data to CSV for inspection."""
    print(f"\n💾 Saving raw extraction to {output_path.name}...")

    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)

    print(f"   ✓ Saved {len(df)} rows")
    print(f"   File: {output_path}")


def main():
    """Main extraction workflow."""
    print("=" * 60)
    print("Montgomery County 2024 Election Data Extraction")
    print("=" * 60)

    # Ensure output directory exists
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    # Check if PDFs exist
    if not PRECINCT_PDF.exists():
        print(f"\n❌ Error: PDF not found: {PRECINCT_PDF}")
        print("   Please place the PDF in data/raw/2024/")
        sys.exit(1)

    if not SUMMARY_PDF.exists():
        print(f"\n⚠️  Warning: Summary PDF not found: {SUMMARY_PDF}")
        print("   Skipping summary extraction")

    try:
        # Extract precinct data
        print("\n" + "=" * 60)
        print("STEP 1: Extract Precinct-by-Precinct Data")
        print("=" * 60)

        precinct_tables = extract_tables_from_pdf(PRECINCT_PDF)
        precinct_data = parse_precinct_tables(precinct_tables)

        # Save raw precinct data
        raw_precinct_path = PROCESSED_DIR / 'raw_precinct_extraction_2024.csv'
        save_raw_extraction(precinct_data, raw_precinct_path)

        # Extract summary data if PDF exists
        if SUMMARY_PDF.exists():
            print("\n" + "=" * 60)
            print("STEP 2: Extract Summary Data")
            print("=" * 60)

            summary_data = extract_summary_data(SUMMARY_PDF)

            # Save raw summary data
            raw_summary_path = PROCESSED_DIR / 'raw_summary_extraction_2024.csv'
            save_raw_extraction(summary_data, raw_summary_path)

        print("\n" + "=" * 60)
        print("✅ EXTRACTION COMPLETE")
        print("=" * 60)
        print("\nNext Steps:")
        print("1. Review the raw extraction files in data/processed/")
        print("2. Identify the data structure and column patterns")
        print("3. Create a parsing script to clean and structure the data")
        print("4. Join with precinct GeoJSON using precinct IDs")

        print("\nRaw Files Created:")
        print(f"   - {raw_precinct_path.relative_to(SCRIPT_DIR.parent)}")
        if SUMMARY_PDF.exists():
            print(f"   - {raw_summary_path.relative_to(SCRIPT_DIR.parent)}")

    except Exception as e:
        print(f"\n❌ Error during extraction: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
