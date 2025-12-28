# Data Dictionary

**Montgomery County Election Data Visualization Project**

This document describes all data fields, types, calculations, and transformations used in the election data visualization system.

---

## Table of Contents

1. [Precinct GeoJSON Files](#precinct-geojson-files)
2. [Election Statistics JSON](#election-statistics-json)
3. [Calculated Fields](#calculated-fields)
4. [Data Types and Formats](#data-types-and-formats)
5. [Edge Cases and Special Values](#edge-cases-and-special-values)

---

## Precinct GeoJSON Files

### File Locations

- `provider-data/precincts.geojson` - Base precinct boundaries (no election data)
- `provider-data/precincts_2024.geojson` - Precincts with 2024 election statistics
- `provider-data/precincts_2025.geojson` - Precincts with 2025 election statistics

### Base Precinct Fields

These fields come from Montgomery County GIS and are present in all precinct files.

| Field Name | Type | Description | Example |
|-----------|------|-------------|---------|
| `OBJECTID` | Integer | Unique object identifier from GIS system | `1` |
| `VPRECINCT` | String | Zero-padded precinct code | `"0100"` |
| `VNAME` | String | Human-readable precinct name | `"BUTLER TOWNSHIP F"` |
| `VLABEL` | String | Short precinct label/code | `"BTLTWP-F"` |
| `VPREC_SPLI` | String | Precinct split identifier | `"01"` |
| `V_USCONG` | String | US Congressional district | `"CN10"` |
| `V_SENATE` | String | State Senate district | `"SN05"` |
| `V_HOUSE` | String | State House district | `"HS39"` |
| `V_CITY` | String or null | City jurisdiction (if applicable) | `null` or `"DAY"` |
| `V_VILLAGE` | String or null | Village jurisdiction | `null` |
| `V_TOWN` | String | Township code | `"BTLTWP"` |
| `V_COBDED` | String or null | County board of education district | `null` |
| `V_SCHOOL` | String | School district code | `"VB"` |
| `V_VOCSCH` | String | Vocational school district | `"MV"` |
| `V_COURTS` | String | Court district | `"VD"` |
| `V_LIBRARY` | String | Library district | `"DAY"` |
| `V_WARD` | String | Ward designation | `"BTLTWP"` |
| `V_UNCTWP` | String or null | Unincorporated township | `null` |
| `V_COCRTS` | String or null | County court designation | `null` |
| `V_CRTAPL` | String | Court of appeals district | `"AP02"` |
| `V_STBDED` | String | State board of education district | `"ED03"` |
| `V_TYPE2` | String or null | Precinct type classification | `null` |
| `V_LOCATION` | String | Polling place code | `"PP0313"` |
| `V_RESULT_J` | String | Results jurisdiction code | `"0100"` |
| `V_POLICE` | String | Police jurisdiction | `"BTLTWP"` |
| `V_FIRE` | String | Fire district | `"BTLTWP"` |
| `V_PARK` | String | Park district | (varies) |
| `V_ROADS` | String | Road district | (varies) |
| `V_OTHER` | String | Other jurisdiction | (varies) |
| `WEB_PRECIN` | String (URL) | Link to precinct PDF map | `"http://gis.mcohio.org/web_docs/ELECTION_PDF/BTF.pdf"` |
| `EXTRACT_NA` | String | Extract name identifier | `"BTLTWP_F"` |
| `BOE_HOME_P` | String or null | Board of Elections home page link | (varies) |
| `ISSUES` | String or null | Issues on ballot in precinct | (varies) |
| `CANDIDATES` | String or null | Candidates on ballot | (varies) |
| `POLLING_LO` | String or null | Polling location address | (varies) |
| `DEFINITION` | String or null | Precinct boundary definition | (varies) |
| `GlobalID` | String (UUID) | Global unique identifier | `"{ABC-123-...}"` |
| `Shape_STAr` | Number | Shape area (square meters) | `12345678.90` |
| `Shape_STLe` | Number | Shape perimeter length (meters) | `23456.78` |

### Election Year-Specific Fields

These fields are added by the `embed_statistics.py` script and are prefixed with the election year (e.g., `2024_` or `2025_`).

| Field Name Pattern | Type | Description | Example (2024) | Example (2025) |
|-------------------|------|-------------|----------------|----------------|
| `{YEAR}_Registered_Voters_Total` | Integer | Total registered voters in precinct | `1194` | `929` |
| `{YEAR}_Ballots_Cast_Total` | Integer | Total ballots cast (all types) | `931` | `225` |
| `{YEAR}_Ballots_Cast_Blank` | Integer | Number of blank ballots | `5` | `1` |
| `{YEAR}_Voter_Turnout_Total` | Decimal | Turnout rate (0.0 to 1.0) | `0.7797` (77.97%) | `0.2422` (24.22%) |

**Calculation:**
```
Voter_Turnout_Total = Ballots_Cast_Total / Registered_Voters_Total
```

### Sub-Precinct Aggregation Fields

For 2025 data, some precincts are split into sub-precincts (e.g., `DAY 1-C1`, `DAY 1-C2`). These are aggregated into parent precincts using `config/precinct-mapping.json`.

| Field Name | Type | Description | Example |
|-----------|------|-------------|---------|
| `_subprecincts` | Array of Strings | List of sub-precinct codes that were aggregated | `["DAY 1-C1", "DAY 1-C2"]` |
| `_subprecinct_count` | Integer | Number of sub-precincts aggregated | `2` |

**Note:** These fields only appear in aggregated parent precincts in 2025 data.

---

## Election Statistics JSON

### File Locations

- `data/elections/2024/statistics.json` - 2024 election summary statistics
- `data/elections/2025/statistics.json` - 2025 election summary statistics

### Structure

```json
{
  "race": "Summary",
  "precincts": 381,
  "results": [
    {
      "Precinct": "BRK-A",
      "Registered Voters - Total": "1,178",
      "Ballots Cast - Total": 923,
      "Ballots Cast - Blank": 5,
      "Voter Turnout - Total": "78.35%"
    }
  ]
}
```

### Fields

| Field Name | Type (Raw) | Type (Processed) | Description |
|-----------|-----------|------------------|-------------|
| `race` | String | String | Race name (always "Summary" for statistics files) |
| `precincts` | Integer | Integer | Total number of precincts in dataset |
| `results` | Array | Array | Array of precinct-level results |
| `results[].Precinct` | String | String | Precinct code (non-padded, e.g., "BRK-A") |
| `results[].Registered Voters - Total` | String (with commas) | Integer | Total registered voters (cleaned to integer) |
| `results[].Ballots Cast - Total` | Integer or String | Integer | Total ballots cast |
| `results[].Ballots Cast - Blank` | Integer | Integer | Blank ballots submitted |
| `results[].Voter Turnout - Total` | String (percentage) | Decimal | Turnout percentage (converted to 0.0-1.0) |

**Data Cleaning Notes:**
- `Registered Voters - Total` may have commas (e.g., `"1,178"`) which are removed during processing
- `Voter Turnout - Total` percentages (e.g., `"78.35%"`) are converted to decimals (e.g., `0.7835`)
- See `scripts/embed_statistics.py` for cleaning implementation

---

## Calculated Fields

### Voter Turnout Calculation

**Formula:**
```
Turnout = (Ballots Cast - Total) / (Registered Voters - Total)
```

**Result:** Decimal between 0.0 and 1.0 (0% to 100%)

**Example:**
- Registered Voters: 1,194
- Ballots Cast: 931
- Turnout: 931 / 1,194 = 0.7797 (77.97%)

### Sub-Precinct Aggregation

When multiple sub-precincts map to a single parent precinct, statistics are aggregated:

**Numeric Fields (Summed):**
- `Registered Voters - Total` = Sum of all sub-precinct registered voters
- `Ballots Cast - Total` = Sum of all sub-precinct ballots cast
- `Ballots Cast - Blank` = Sum of all sub-precinct blank ballots

**Calculated After Aggregation:**
- `Voter Turnout - Total` = Aggregated Ballots / Aggregated Registered Voters

**Example:**
```
Sub-precinct DAY 1-C1: 500 registered, 200 ballots
Sub-precinct DAY 1-C2: 600 registered, 240 ballots

Parent DAY 1-C:
  Registered: 500 + 600 = 1,100
  Ballots: 200 + 240 = 440
  Turnout: 440 / 1,100 = 0.40 (40%)
```

---

## Data Types and Formats

### Standard Data Types

| Type | Description | Example | Storage Format |
|------|-------------|---------|----------------|
| Integer | Whole numbers | `1194`, `931` | JavaScript Number |
| Decimal | Floating-point numbers | `0.7797`, `0.2422` | JavaScript Number |
| String | Text values | `"BUTLER TOWNSHIP F"` | UTF-8 encoded |
| Boolean | True/false values | `true`, `false` | JavaScript Boolean |
| Null | Absence of value | `null` | JavaScript null |
| Array | Ordered list | `["DAY 1-C1", "DAY 1-C2"]` | JavaScript Array |
| UUID | Globally unique identifier | `"{ABC-123-...}"` | String format |
| URL | Web address | `"http://example.com"` | String format |

### Coordinate System

**Projection:** WGS 84 (EPSG:4326)
**Format:** GeoJSON standard
**Coordinates:** `[longitude, latitude]`

**Example:**
```json
{
  "type": "Polygon",
  "coordinates": [[
    [-84.1234, 39.7567],
    [-84.1235, 39.7568],
    ...
  ]]
}
```

---

## Edge Cases and Special Values

### Missing or Invalid Data

| Scenario | Representation | Handling |
|----------|---------------|----------|
| No value available | `null` | Excluded from calculations |
| Empty string | `""` | Treated as null |
| Zero registered voters | `0` | Precinct excluded from turnout analysis |
| Negative values | N/A | Data validation error (should not occur) |
| Ballots > Registered | Rare | May indicate data entry error; flagged in analysis |

### Data Validation Rules

Applied during analysis (see `scripts/analyze_turnout.js`):

1. **Minimum Registered Voters:** ≥ 10 (filters out data errors)
2. **Ballots Cast Range:** 0 < ballots ≤ (registered × 1.1)
   - Allows 10% margin for same-day registration or data entry variance
3. **Turnout Range:** 0.0 < turnout ≤ 1.0 (0% to 100%)

### Special Precinct Types

| Type | Identifier | Description | Example |
|------|-----------|-------------|---------|
| Standard Precinct | Normal naming | Single voting location | `KETTERING 03-J` |
| Split Precinct | Contains sub-parts | Divided for capacity | `DAY 1-C` (parent of C1, C2) |
| Sub-Precinct | Hyphenated suffix | Part of larger precinct | `DAY 1-C1`, `DAY 1-C2` |

### Precinct Code Normalization

Precinct codes are normalized to handle inconsistencies:

**Rule:** Remove leading zeros from district numbers

| Original | Normalized |
|----------|-----------|
| `CTN 01-A` | `CTN 1-A` |
| `DAY 02-B` | `DAY 2-B` |
| `BRK-A` | `BRK-A` (unchanged) |

**Implementation:** See `normalize_precinct_code()` in `scripts/embed_statistics.py`

### Percentage Format Variants

The system handles multiple percentage formats:

| Input Format | Parsed Value | Type After Processing |
|-------------|--------------|---------------------|
| `"78.35%"` | `0.7835` | Decimal (0.0-1.0) |
| `78.35` | `0.7835` | Decimal (0.0-1.0) |
| `0.7835` | `0.7835` | Decimal (0.0-1.0) |

**Note:** All percentages are stored as decimals (0.0 to 1.0) in the final GeoJSON files.

---

## Data Quality Notes

### Known Issues

1. **2024 Source Data:** Original `statistics.json` had comma-separated number strings (e.g., `"1,178"`) which are now cleaned during processing
2. **Sub-Precinct Coverage:** Not all split precincts have mappings; unmapped sub-precincts remain as individual entries
3. **Historical Data:** Only 2024 and 2025 elections currently included

### Data Validation Reports

The analysis scripts generate validation reports:

- `analysis/skipped_precincts.md` - Lists precincts excluded from analysis with reasons
- Each precinct must pass validation rules to be included in aggregate statistics

### Future Enhancements

- Demographic data integration (when available)
- Historical trend analysis (additional election years)
- Real-time election night results (if API becomes available)

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-28 | 1.0 | Initial data dictionary created |

---

## References

- **Montgomery County Board of Elections:** https://www.montgomery.boe.ohio.gov/
- **Montgomery County GIS:** http://gis.mcohio.org/
- **GeoJSON Specification:** https://geojson.org/
- **Project Repository:** https://github.com/codefordayton/new_monty_lots
