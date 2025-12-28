# Data Processing Workflow

**Montgomery County Election Data Visualization Project**

This document describes the complete data processing pipeline from raw PDFs to interactive map visualization.

---

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [Processing Steps](#processing-steps)
4. [Scripts Reference](#scripts-reference)
5. [Reproducibility Guide](#reproducibility-guide)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### Data Flow Summary

```
Raw PDFs (Montgomery County BOE)
    ↓
CSV Files (Parsed election results)
    ↓
JSON Files (Structured race data)
    ↓
Statistics JSON (Aggregate turnout data)
    ↓
GeoJSON Files (Precinct boundaries + election stats)
    ↓
Web Application (Interactive map visualization)
```

### Key Transformations

1. **PDF → CSV**: Extract tabular election results from PDF reports
2. **CSV → JSON**: Convert race results to structured JSON format
3. **JSON → Statistics**: Aggregate precinct-level turnout statistics
4. **Statistics → GeoJSON**: Embed stats into precinct boundary geometries
5. **GeoJSON → Visualization**: Serve via Koop API and display on Leaflet map

---

## Pipeline Architecture

### Directory Structure

```
new_monty_lots/
├── data/
│   ├── raw/                        # Source data
│   │   ├── 2024/                   # 2024 election PDFs
│   │   ├── 2025/                   # 2025 election PDFs
│   │   ├── elections24/            # 2024 parsed CSVs
│   │   └── elections25/            # 2025 parsed CSVs
│   └── elections/                  # Processed data
│       ├── 2024/                   # 2024 race JSONs + statistics
│       └── 2025/                   # 2025 race JSONs + statistics
├── provider-data/                  # Final GeoJSON files served by Koop
│   ├── precincts.geojson          # Base precinct boundaries
│   ├── precincts_2024.geojson     # 2024 with election data
│   └── precincts_2025.geojson     # 2025 with election data
└── scripts/                        # Processing scripts
    ├── convert_elections_to_json.py
    └── embed_statistics.py
```

---

## Processing Steps

### Step 1: Obtain Source PDFs

**Source:** Montgomery County Board of Elections

**Files:**
- `data/raw/2024/11052024-Precinct-by-Precinct-Official-Final-with-write-ins.pdf`
- `data/raw/2025/11042025-Precinct-by-Precincts-Official-Final.pdf`

**Manual Process:**
1. Download official election results from BOE website
2. Save PDFs to `data/raw/{year}/` directory
3. Verify PDFs contain precinct-level results

**Characteristics:**
- Multi-page tabular format
- One race per page or section
- Columns: Precinct, Registered Voters, Ballots Cast, Candidate Votes

---

### Step 2: Parse PDFs to CSV

**Input:** PDF files in `data/raw/{year}/`

**Output:** CSV files in `data/raw/elections{year}/`

**Process:**
- **Tool:** PDF parsing tool (external, not in repository)
- **Format:** One CSV file per race
- **Naming:** Uses race name from PDF (e.g., `Beavercreek CSD - Bond issue 4.9 mills - 37 yrs.csv`)

**Manual Process:**
1. Use PDF extraction tool to convert tables to CSV
2. One CSV per race/contest
3. Save to `data/raw/elections24/` or `data/raw/elections25/`
4. Verify column headers match expected format

**CSV Structure:**
```csv
Precinct,Registered Voters,Ballots Cast,Candidate A,Candidate B,...
BRK-A,1178,923,456,467,...
BRK-B,992,699,345,354,...
```

**Data Quality Notes:**
- Some values may have comma separators (e.g., `"1,178"`)
- Percentage values may include `%` symbol
- These are cleaned in subsequent processing steps

---

### Step 3: Convert CSVs to JSON

**Script:** `scripts/convert_elections_to_json.py`

**Input:** CSV files in `data/raw/elections{year}/`

**Output:** JSON files in `data/elections/{year}/`

**Command:**
```bash
python3 scripts/convert_elections_to_json.py
```

**Process:**
1. Scans `data/raw/elections24/` and `data/raw/elections25/` directories
2. For each CSV file:
   - Parses CSV structure
   - Identifies precinct column and candidate columns
   - Converts to structured JSON format
   - Saves with matching filename (`.json` extension)

**JSON Output Format:**
```json
{
  "race": "Beavercreek CSD - Bond issue 4.9 mills - 37 yrs",
  "precincts": 10,
  "results": [
    {
      "Precinct": "BRK-A",
      "Registered Voters": 1178,
      "Ballots Cast": 923,
      "For the Tax Levy": 456,
      "Against the Tax Levy": 467
    }
  ]
}
```

**Features:**
- Preserves all candidate/choice columns
- Maintains precinct identifiers
- Generates race manifests listing all available races

**Output Files:**
- Individual race JSONs: `data/elections/{year}/*.json`
- Race manifest: `data/elections/{year}/manifest.json` (lists all races)

---

### Step 4: Generate Statistics Summary

**Script:** `scripts/convert_elections_to_json.py` (also generates statistics)

**Input:** CSV files with summary/turnout data

**Output:** `data/elections/{year}/statistics.json`

**Format:**
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

**Purpose:**
- Provides aggregate turnout data for each precinct
- Used to embed statistics into GeoJSON files
- Source for analysis scripts

**Data Quality:**
- May contain comma-separated numbers
- May contain percentage strings
- Cleaned during GeoJSON embedding step

---

### Step 5: Embed Statistics into GeoJSON

**Script:** `scripts/embed_statistics.py`

**Input:**
- Base precinct GeoJSON: `provider-data/precincts.geojson`
- Statistics JSON: `data/elections/{year}/statistics.json`
- Precinct mapping: `config/precinct-mapping.json`

**Output:**
- `provider-data/precincts_2024.geojson`
- `provider-data/precincts_2025.geojson`

**Command:**
```bash
# Process both years
python3 scripts/embed_statistics.py

# Process specific year
python3 scripts/embed_statistics.py 2024
python3 scripts/embed_statistics.py 2025
```

**Process:**

1. **Load Base Precincts**
   - Reads `precincts.geojson` (497 precincts with boundaries)
   - Provides geographic polygon data

2. **Load Statistics**
   - Reads `statistics.json` for specified year
   - Creates lookup dictionary by precinct code

3. **Normalize Precinct Codes**
   - Removes zero-padding from district numbers
   - Example: `CTN 01-A` → `CTN 1-A`
   - Ensures matching between GeoJSON and election data

4. **Clean Numeric Values**
   - Removes commas from numbers: `"1,178"` → `1178`
   - Converts percentages to decimals: `"78.35%"` → `0.7835`
   - Ensures proper data types (Integer for counts, Decimal for percentages)

5. **Aggregate Sub-Precincts** (2025 only)
   - Uses `config/precinct-mapping.json` to identify parent-child relationships
   - Sums numeric fields across sub-precincts
   - Recalculates turnout percentage for aggregated data
   - Adds `_subprecincts` and `_subprecinct_count` metadata

6. **Embed into Features**
   - Matches statistics to GeoJSON features by precinct code
   - Adds year-prefixed fields (e.g., `2024_Registered_Voters_Total`)
   - Preserves all original GeoJSON properties

7. **Write Output**
   - Saves to `provider-data/precincts_{year}.geojson`
   - ~12-13 MB per file
   - Ready for Koop API serving

**Data Transformations:**

| Input (statistics.json) | Output (GeoJSON property) | Transformation |
|------------------------|---------------------------|----------------|
| `"Registered Voters - Total": "1,178"` | `2024_Registered_Voters_Total: 1178` | Remove commas, convert to integer |
| `"Ballots Cast - Total": 923` | `2024_Ballots_Cast_Total: 923` | Pass through as integer |
| `"Voter Turnout - Total": "78.35%"` | `2024_Voter_Turnout_Total: 0.7835` | Remove %, divide by 100, convert to decimal |

**Validation:**
- Reports matched vs. unmatched precincts
- Logs sub-precinct aggregations (2025)
- Outputs statistics about processing

**Example Output:**
```
📊 Processing 2024 election data...
  📂 Loading base precinct GeoJSON...
     ✓ Loaded 497 precincts
  📈 Loading 2024 statistics...
     ✓ Loaded statistics for 381 precincts
  🔗 Matching statistics to precincts...
     ✓ Matched 497 of 497 precincts
  💾 Writing provider-data/precincts_2024.geojson...
     ✓ Created provider-data/precincts_2024.geojson (12.3 MB)
✅ Completed processing for 2024
```

---

### Step 6: Serve via Koop API

**Process:** Automatic (no manual steps)

**Server:** `index.js` (Koop server with `@koopjs/provider-file-geojson`)

**How it Works:**
1. Koop scans `provider-data/` directory on startup
2. Registers each `.geojson` file as a FeatureServer service
3. Makes data available via REST API endpoints

**API Endpoints:**
```
GET /catalog
  → Lists all available services

GET /file-geojson/rest/services/precincts_2024/FeatureServer
  → Service metadata

GET /file-geojson/rest/services/precincts_2024/FeatureServer/0/query?f=geojson&where=1=1&outFields=*
  → All features as GeoJSON
```

**No Processing Required:**
- GeoJSON files are served as-is
- Koop handles format conversion and querying
- Standard Esri FeatureServer API compatibility

---

### Step 7: Frontend Visualization

**Process:** Automatic (client-side JavaScript)

**Files:**
- `index.html` - Main application
- `static/scripts/` - Frontend JavaScript modules

**Data Loading Flow:**

1. **Discover Available Layers**
   ```javascript
   fetch('/catalog')
     .then(response => response.json())
     .then(data => {
       // data.services contains list of available GeoJSON files
     });
   ```

2. **Load Precinct Data**
   ```javascript
   fetch('/file-geojson/rest/services/precincts_2024/FeatureServer/0/query?f=geojson&where=1=1&outFields=*')
     .then(response => response.json())
     .then(geojson => {
       // Add to Leaflet map
       L.geoJSON(geojson).addTo(map);
     });
   ```

3. **Load Race Data**
   ```javascript
   fetch('/data/elections/2024/manifest.json')
     .then(response => response.json())
     .then(races => {
       // Populate race dropdown
       races.forEach(race => {
         addRaceOption(race.name, race.file);
       });
     });
   ```

4. **Style and Render**
   - Precincts colored by turnout or race results
   - Dynamic styling based on selected visualization
   - Interactive popups with detailed statistics

**No Manual Steps:**
- All data loading is automatic
- Visualization updates based on user selections
- Real-time filtering and comparison

---

## Scripts Reference

### `scripts/convert_elections_to_json.py`

**Purpose:** Convert CSV election results to structured JSON

**Usage:**
```bash
python3 scripts/convert_elections_to_json.py
```

**Input:**
- `data/raw/elections24/*.csv`
- `data/raw/elections25/*.csv`

**Output:**
- `data/elections/2024/*.json` (one file per race)
- `data/elections/2025/*.json` (one file per race)
- `data/elections/{year}/manifest.json` (list of all races)
- `data/elections/{year}/statistics.json` (turnout summary)

**Key Functions:**
- CSV parsing and validation
- JSON structure generation
- Manifest file creation

---

### `scripts/embed_statistics.py`

**Purpose:** Embed election statistics into precinct GeoJSON files

**Usage:**
```bash
# Process all years
python3 scripts/embed_statistics.py

# Process specific year
python3 scripts/embed_statistics.py 2024
python3 scripts/embed_statistics.py 2025
```

**Input:**
- `provider-data/precincts.geojson` (base precinct boundaries)
- `data/elections/{year}/statistics.json` (election statistics)
- `config/precinct-mapping.json` (sub-precinct mappings)

**Output:**
- `provider-data/precincts_2024.geojson`
- `provider-data/precincts_2025.geojson`

**Key Functions:**
- `normalize_precinct_code()` - Removes zero-padding from district numbers
- `clean_numeric_value()` - Strips commas and converts to proper types
- `aggregate_subprecinct_stats()` - Combines sub-precinct data
- `load_precinct_mapping()` - Loads parent-child precinct relationships

**Options:**
- `--year 2024|2025|all` - Specify which year(s) to process

---

### `scripts/analyze_turnout.js`

**Purpose:** Statistical analysis of voter turnout

**Usage:**
```bash
node scripts/analyze_turnout.js
```

**Input:**
- `provider-data/precincts_2024.geojson`
- `provider-data/precincts_2025.geojson`

**Output:**
- `analysis/summary_statistics.md` - Statistical report
- `analysis/precinct_rankings.csv` - Top 10 precincts by turnout
- `analysis/skipped_precincts.md` - Data quality report

**What It Does:**
- Calculates county-wide turnout rates
- Computes distribution statistics (mean, median, std dev)
- Identifies top/bottom precincts
- Generates year-over-year comparisons
- Validates data quality

---

### `scripts/analyze_geographic_patterns.js`

**Purpose:** Geographic analysis of turnout patterns

**Usage:**
```bash
node scripts/analyze_geographic_patterns.js
```

**Input:**
- `provider-data/precincts_2024.geojson`
- `provider-data/precincts_2025.geojson`

**Output:**
- `analysis/geographic_patterns.md` - Geographic analysis report

**What It Does:**
- Groups precincts by municipality (city/township)
- Categorizes as Urban/Suburban/Rural
- Calculates aggregate statistics by geography
- Identifies spatial patterns and clusters
- Year-over-year geographic comparisons

---

## Reproducibility Guide

### Prerequisites

**Software:**
- Python 3.8+ (for processing scripts)
- Node.js 14+ (for analysis and server)
- npm (comes with Node.js)

**Python Packages:**
```bash
# Install if needed (scripts use standard library only)
# No external packages required for current scripts
```

**Node.js Packages:**
```bash
npm install  # Installs all dependencies from package.json
```

### Complete Pipeline Reproduction

**Step-by-Step:**

1. **Obtain Source Data**
   ```bash
   # Download PDFs from Montgomery County BOE
   # Place in data/raw/2024/ and data/raw/2025/
   ```

2. **Parse PDFs to CSV**
   ```bash
   # Use PDF extraction tool (manual process)
   # Output to data/raw/elections24/ and data/raw/elections25/
   ```

3. **Convert CSVs to JSON**
   ```bash
   python3 scripts/convert_elections_to_json.py
   ```

4. **Embed Statistics into GeoJSON**
   ```bash
   python3 scripts/embed_statistics.py
   ```

5. **Run Analysis Scripts** (optional)
   ```bash
   node scripts/analyze_turnout.js
   node scripts/analyze_geographic_patterns.js
   ```

6. **Start Server**
   ```bash
   npm start
   # Or for development:
   npm run dev
   ```

7. **Access Application**
   ```
   Open browser to http://localhost:8080
   ```

### Updating Data

**When New Election Data Becomes Available:**

1. Download new PDF from BOE
2. Parse to CSV format
3. Re-run conversion script:
   ```bash
   python3 scripts/convert_elections_to_json.py
   ```
4. Re-run embedding script:
   ```bash
   python3 scripts/embed_statistics.py
   ```
5. Restart server (or let Railway auto-deploy)

**No Code Changes Required:**
- Pipeline is year-agnostic
- New years can be added by following same directory structure
- Frontend automatically discovers new datasets via `/catalog` endpoint

---

## Troubleshooting

### Common Issues

#### Issue: CSV parsing errors

**Symptoms:**
- `convert_elections_to_json.py` fails to parse CSV
- Missing or misaligned data in JSON output

**Solutions:**
- Verify CSV structure matches expected format
- Check for extra columns or merged cells
- Ensure consistent header row naming
- Validate character encoding (should be UTF-8)

---

#### Issue: Precinct matching failures

**Symptoms:**
- `embed_statistics.py` reports many unmatched precincts
- GeoJSON features missing election data

**Solutions:**
- Check precinct code normalization
- Verify `VLABEL` field in base GeoJSON matches precinct codes in statistics
- Review `normalize_precinct_code()` function logic
- Add mappings to `config/precinct-mapping.json` if needed

---

#### Issue: Numeric parsing errors

**Symptoms:**
- Analysis scripts skip many precincts
- Turnout values appear incorrect (e.g., 1% instead of 78%)

**Solutions:**
- Verify `clean_numeric_value()` function in `embed_statistics.py`
- Check for unexpected number formats in source data
- Review `analysis/skipped_precincts.md` for specific errors
- Ensure commas and percentage signs are being stripped

---

#### Issue: Sub-precinct aggregation problems

**Symptoms:**
- 2025 data shows duplicate or missing precincts
- Aggregated turnout doesn't match manual calculation

**Solutions:**
- Review `config/precinct-mapping.json` for correct mappings
- Verify all sub-precincts are listed under correct parent
- Check for typos in precinct codes
- Ensure aggregation function sums correctly

---

### Data Validation

**Recommended Checks:**

1. **Feature Count Validation**
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync('provider-data/precincts_2024.geojson')).features.length)"
   # Should output: 497
   ```

2. **Sample Data Inspection**
   ```bash
   node scripts/analyze_turnout.js
   # Check analysis/skipped_precincts.md for data quality issues
   ```

3. **Turnout Range Check**
   - All turnout values should be between 0% and 100%
   - Registered voters should be positive integers
   - Ballots cast should not exceed registered voters (with small margin)

---

## Appendices

### File Size Reference

| File | Typical Size | Description |
|------|-------------|-------------|
| Raw PDFs | 5-10 MB each | Original election reports |
| CSV files | 1-50 KB each | Parsed race results |
| JSON files | 1-50 KB each | Structured race data |
| statistics.json | ~50 KB | Aggregate turnout data |
| precincts.geojson | ~6 MB | Base precinct boundaries |
| precincts_2024.geojson | ~12 MB | With 2024 election data |
| precincts_2025.geojson | ~13 MB | With 2025 election data |

### Performance Notes

- GeoJSON embedding: ~2-3 seconds per year
- Analysis scripts: ~1-2 seconds each
- Server startup: ~1 second
- Frontend load time: ~2-3 seconds (depends on network)

### Maintenance Schedule

| Task | Frequency | Script/Process |
|------|-----------|----------------|
| New election data | After each election | Full pipeline |
| Data quality audit | Quarterly | Run analysis scripts, review reports |
| GeoJSON regeneration | When source boundaries update | Re-run embed_statistics.py |
| Documentation updates | As needed | Manual updates to docs/ |

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-28 | 1.0 | Initial data processing documentation created |

---

## References

- [Data Dictionary](./DATA_DICTIONARY.md)
- [Project README](../README.md)
- [CLAUDE.md](../CLAUDE.md) - AI assistant guidelines
- [Montgomery County BOE](https://www.montgomery.boe.ohio.gov/)
