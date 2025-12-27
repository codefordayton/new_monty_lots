#!/usr/bin/env python3
"""
Embed election statistics into precinct GeoJSON files.

This script reads the base precincts.geojson file and election statistics JSON,
then creates year-specific GeoJSON files with embedded turnout/registration data.

Usage:
    python3 scripts/embed_statistics.py [--year 2024|2025|all]
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List


def normalize_precinct_code(code: str) -> str:
    """
    Normalize precinct codes for matching.

    Handles inconsistencies between GeoJSON and election data:
    - GeoJSON uses zero-padded district numbers: "CTN 01-A", "DAY 02-B"
    - Election CSVs use non-padded numbers: "CTN 1-A", "DAY 2-B"

    Args:
        code: Precinct code

    Returns:
        Normalized code (removes zero-padding from district numbers)
    """
    if not code:
        return ''

    import re

    # Remove leading/trailing whitespace
    code = code.strip()

    # Remove zero-padding from district numbers
    # Pattern: matches things like "CTN 01-A" or "DAY 02-B"
    # and converts them to "CTN 1-A" or "DAY 2-B"
    code = re.sub(r'\b0(\d+)', r'\1', code)

    return code


def load_precinct_mapping() -> Dict[str, List[str]]:
    """
    Load the precinct mapping configuration.

    Returns:
        Dictionary mapping parent precinct codes to list of sub-precinct codes
    """
    mapping_path = Path('config/precinct-mapping.json')

    if not mapping_path.exists():
        return {}

    with open(mapping_path, 'r', encoding='utf-8') as f:
        mapping_data = json.load(f)

    return mapping_data.get('mappings', {})


def aggregate_subprecinct_stats(sub_stats: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Aggregate statistics from multiple sub-precincts into parent precinct stats.

    Args:
        sub_stats: List of statistics dictionaries from sub-precincts

    Returns:
        Aggregated statistics dictionary
    """
    if not sub_stats:
        return {}

    # Aggregate numeric fields by summing
    numeric_fields = [
        'Registered Voters - Total',
        'Ballots Cast - Total',
        'Ballots Cast - Blank'
    ]

    aggregated = {}
    for field in numeric_fields:
        total = sum(stat.get(field, 0) or 0 for stat in sub_stats)
        aggregated[field] = total

    # Calculate voter turnout as percentage
    if aggregated.get('Registered Voters - Total', 0) > 0:
        turnout = aggregated['Ballots Cast - Total'] / aggregated['Registered Voters - Total']
        aggregated['Voter Turnout - Total'] = round(turnout, 4)
    else:
        aggregated['Voter Turnout - Total'] = 0.0

    # Add metadata about aggregation
    aggregated['_subprecincts'] = [stat.get('Precinct') for stat in sub_stats]
    aggregated['_subprecinct_count'] = len(sub_stats)

    return aggregated


def load_base_precincts() -> Dict[str, Any]:
    """
    Load the base precinct GeoJSON file.

    Returns:
        GeoJSON FeatureCollection
    """
    precinct_path = Path('provider-data/precincts.geojson')

    if not precinct_path.exists():
        raise FileNotFoundError(f"Base precinct file not found: {precinct_path}")

    with open(precinct_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_statistics(year: str) -> Dict[str, Dict[str, Any]]:
    """
    Load election statistics for a given year.

    For 2025, aggregates sub-precinct data into parent precincts using the mapping.

    Args:
        year: Election year (2024 or 2025)

    Returns:
        Dictionary mapping precinct code to statistics
    """
    stats_path = Path(f'data/elections/{year}/statistics.json')

    if not stats_path.exists():
        print(f"⚠️  No statistics file found for {year}: {stats_path}")
        return {}

    with open(stats_path, 'r', encoding='utf-8') as f:
        stats_data = json.load(f)

    # Convert to lookup dictionary by precinct code (normalized)
    stats_by_precinct = {}

    for result in stats_data.get('results', []):
        precinct_code = result.get('Precinct')
        if precinct_code:
            # Normalize the precinct code from election data too
            normalized_code = normalize_precinct_code(precinct_code)
            stats_by_precinct[normalized_code] = result

    # For 2025, also aggregate sub-precincts into parent precincts
    if year == '2025':
        mapping = load_precinct_mapping()
        aggregation_count = 0

        for parent_code, sub_codes in mapping.items():
            # Collect stats for all sub-precincts
            sub_stats = []
            for sub_code in sub_codes:
                if sub_code in stats_by_precinct:
                    sub_stats.append(stats_by_precinct[sub_code])

            # If we found any sub-precinct data, create aggregated parent stats
            if sub_stats:
                aggregated = aggregate_subprecinct_stats(sub_stats)
                # Store under parent code
                stats_by_precinct[parent_code] = aggregated
                aggregation_count += 1

        if aggregation_count > 0:
            print(f"     ℹ️  Aggregated {aggregation_count} split precincts into parent precincts")

    return stats_by_precinct


def embed_statistics_for_year(year: str) -> None:
    """
    Create a year-specific precinct GeoJSON with embedded statistics.

    Args:
        year: Election year (2024 or 2025)
    """
    print(f"\n📊 Processing {year} election data...")

    # Load base precincts
    print("  📂 Loading base precinct GeoJSON...")
    geojson = load_base_precincts()
    feature_count = len(geojson.get('features', []))
    print(f"     ✓ Loaded {feature_count} precincts")

    # Load statistics
    print(f"  📈 Loading {year} statistics...")
    stats_by_precinct = load_statistics(year)

    if not stats_by_precinct:
        print(f"     ⚠️  No statistics available for {year}, skipping")
        return

    print(f"     ✓ Loaded statistics for {len(stats_by_precinct)} precincts")

    # Embed statistics into features
    print("  🔗 Matching statistics to precincts...")

    matched_count = 0
    unmatched_precincts = []

    for feature in geojson['features']:
        props = feature.get('properties', {})
        vlabel = normalize_precinct_code(props.get('VLABEL', ''))

        if vlabel in stats_by_precinct:
            # Embed all statistics into properties with election year prefix
            stats = stats_by_precinct[vlabel]

            for key, value in stats.items():
                if key != 'Precinct':  # Don't duplicate the precinct code
                    # Add with year prefix to avoid conflicts
                    new_key = f'{year}_{key.replace(" - ", "_").replace(" ", "_")}'
                    props[new_key] = value

            matched_count += 1
        else:
            unmatched_precincts.append(vlabel)

    print(f"     ✓ Matched {matched_count} of {feature_count} precincts")

    if unmatched_precincts:
        print(f"     ⚠️  {len(unmatched_precincts)} precincts without statistics")
        if len(unmatched_precincts) <= 10:
            print(f"        Unmatched: {', '.join(unmatched_precincts[:10])}")
        else:
            print(f"        First 10: {', '.join(unmatched_precincts[:10])}")

    # Save output
    output_path = Path(f'provider-data/precincts_{year}.geojson')

    print(f"  💾 Writing {output_path}...")

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2)

    file_size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"     ✓ Created {output_path} ({file_size_mb:.1f} MB)")

    print(f"\n✅ Completed processing for {year}")


def main():
    """Main entry point."""
    # Parse command line arguments
    year = sys.argv[1] if len(sys.argv) > 1 else 'all'

    if year not in ['2024', '2025', 'all']:
        print("Usage: python3 scripts/embed_statistics.py [year]")
        print("  year: 2024, 2025, or all (default: all)")
        sys.exit(1)

    print("🔄 Embedding election statistics into precinct GeoJSON...")

    if year == 'all':
        embed_statistics_for_year('2024')
        embed_statistics_for_year('2025')
    else:
        embed_statistics_for_year(year)

    print("\n✅ All embedding complete!")
    print("\n📍 Created files:")
    print("  - provider-data/precincts_2024.geojson (if 2024 stats available)")
    print("  - provider-data/precincts_2025.geojson (if 2025 stats available)")


if __name__ == '__main__':
    main()
