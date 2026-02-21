#!/usr/bin/env python3
"""
Convert election CSV files to JSON format for web consumption.

This script reads CSV files from data/raw/elections{24,25}/ and converts them
to JSON files in data/elections/{year}/ for efficient loading by the frontend.

Usage:
    python3 scripts/convert_elections_to_json.py [--year 2024|2025|all]
"""

import csv
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any


def clean_numeric_value(value: str) -> Any:
    """
    Convert numeric strings to appropriate types.

    Args:
        value: String value from CSV

    Returns:
        Cleaned value (int, float, or original string)
    """
    if value is None or value == '':
        return None

    value_str = str(value).strip()

    if value_str == '':
        return None

    # Already a decimal (percentage converted)
    if '.' in value_str and not '%' in value_str:
        try:
            return float(value_str)
        except ValueError:
            pass

    # Try integer
    try:
        return int(value_str)
    except ValueError:
        pass

    # Try float
    try:
        return float(value_str)
    except ValueError:
        pass

    return value_str


def csv_to_json(csv_path: Path) -> Dict[str, Any]:
    """
    Convert a CSV file to JSON structure.

    Args:
        csv_path: Path to CSV file

    Returns:
        Dictionary with race metadata and results
    """
    race_name = csv_path.stem

    results = []

    with open(csv_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)

        for row in reader:
            # Convert to clean format
            clean_row = {}

            for key, value in row.items():
                # Clean the value
                clean_value = clean_numeric_value(value)

                # Keep original key names from CSV
                clean_row[key] = clean_value

            results.append(clean_row)

    return {
        'race': race_name,
        'precincts': len(results),
        'results': results
    }


def process_year(year: str) -> None:
    """
    Process all CSV files for a given election year.

    Args:
        year: Election year (2024 or 2025)
    """
    source_dir = Path(f'data/raw/elections{year[-2:]}')
    output_dir = Path(f'data/elections/{year}')

    if not source_dir.exists():
        print(f"⚠️  Source directory not found: {source_dir}")
        return

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    # Get all CSV files
    csv_files = sorted(source_dir.glob('*.csv'))

    if not csv_files:
        print(f"⚠️  No CSV files found in {source_dir}")
        return

    print(f"\n📊 Processing {len(csv_files)} files for {year}...")

    # Track statistics separately
    statistics_file = None
    race_files = []

    for csv_file in csv_files:
        if csv_file.stem.lower() == 'summary':
            statistics_file = csv_file
        else:
            race_files.append(csv_file)

    # Process statistics file
    if statistics_file:
        print(f"  📈 Converting statistics: {statistics_file.name}")
        stats_data = csv_to_json(statistics_file)

        output_path = output_dir / 'statistics.json'
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(stats_data, f, indent=2)

        print(f"     ✓ Created {output_path}")

    # Process race files
    print(f"\n  🗳️  Converting {len(race_files)} race files...")

    for csv_file in race_files:
        race_data = csv_to_json(csv_file)

        # Create safe filename (remove special characters)
        safe_name = csv_file.stem.replace('/', '-').replace('\\', '-')
        output_path = output_dir / f'{safe_name}.json'

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(race_data, f, indent=2)

    print(f"     ✓ Created {len(race_files)} race JSON files")

    display_names = {
        '2023': 'November 2023 General Election',
        '2024': 'November 2024 General Election',
        '2025': 'November 2025 General Election',
    }

    # Create metadata catalog
    metadata = {
        'year': year,
        'displayName': display_names.get(year, f'{year} Election'),
        'statistics_file': 'statistics.json' if statistics_file else None,
        'races': [
            {
                'id': csv_file.stem.replace('/', '-').replace('\\', '-'),
                'name': csv_file.stem,
                'file': csv_file.stem.replace('/', '-').replace('\\', '-') + '.json'
            }
            for csv_file in race_files
        ]
    }

    metadata_path = output_dir / 'metadata.json'
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"     ✓ Created {metadata_path}")
    print(f"\n✅ Completed processing for {year}")


def main():
    """Main entry point."""
    # Parse command line arguments
    year = sys.argv[1] if len(sys.argv) > 1 else 'all'

    if year not in ['2023', '2024', '2025', 'all']:
        print("Usage: python3 scripts/convert_elections_to_json.py [--year 2023|2024|2025|all]")
        print("Default: all")
        sys.exit(1)

    print("🔄 Converting election CSV files to JSON...")

    if year == 'all':
        process_year('2023')
        process_year('2024')
        process_year('2025')
    else:
        process_year(year)

    print("\n✅ All conversions complete!")


if __name__ == '__main__':
    main()
