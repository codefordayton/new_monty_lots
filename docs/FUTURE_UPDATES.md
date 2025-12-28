# Future Updates Guide

**Adding New Election Cycles to the Visualization**

This guide provides step-by-step instructions for processing and adding new election data to the Montgomery County Election Data Visualization system.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Process](#step-by-step-process)
4. [Validation and Testing](#validation-and-testing)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### When to Add New Data

- After each Montgomery County election (November of each year)
- When official certified results are published by the Board of Elections
- Typically 2-4 weeks after Election Day

### Time Estimate

| Task | Estimated Time |
|------|---------------|
| Download and organize PDFs | 15 minutes |
| Parse PDFs to CSV | 1-2 hours (manual or tool-dependent) |
| Run processing scripts | 5-10 minutes |
| Validation and testing | 30 minutes |
| Deployment | 5 minutes (automatic via Railway) |
| **Total** | **2-3 hours** |

### Skills Required

- Basic command line usage
- Running Python and Node.js scripts
- Git version control (for deployment)
- PDF to CSV conversion (or access to extraction tool)

---

## Prerequisites

### Software Requirements

**Required:**
- Python 3.8 or higher
- Node.js 14 or higher
- npm (comes with Node.js)
- Git

**Optional (Helpful):**
- PDF extraction tool (Tabula, Adobe Acrobat, custom script)
- Text editor (VS Code, Sublime, etc.)

**Install Check:**
```bash
# Verify installations
python3 --version  # Should show Python 3.8+
node --version     # Should show Node.js 14+
npm --version      # Should show npm 6+
git --version      # Should show Git 2+
```

### Repository Setup

```bash
# Clone repository (if not already done)
git clone https://github.com/codefordayton/new_monty_lots.git
cd new_monty_lots

# Install dependencies
npm install

# Verify scripts are executable
chmod +x scripts/*.py scripts/*.js
```

---

## Step-by-Step Process

### Step 1: Obtain Official Results PDFs

**Source:** Montgomery County Board of Elections
- Website: https://www.montgomery.boe.ohio.gov/
- Look for "Election Results" or "Archives"
- Download "Precinct-by-Precinct Official Final Results with Write-ins"

**What to Download:**
- Main results PDF (usually 50-100+ pages)
- Summary/turnout statistics PDF
- Any supplemental reports

**Where to Save:**
```bash
# Create directory for new year
mkdir -p data/raw/{YEAR}

# Example for 2026:
mkdir -p data/raw/2026

# Save PDFs to this directory
# data/raw/2026/11042026-Precinct-by-Precinct-Official-Final.pdf
```

**Verification:**
- Ensure PDF contains precinct-level results (not county totals only)
- Verify all races are included
- Check that precinct names match previous years

---

### Step 2: Parse PDFs to CSV Format

**Overview:**

Convert PDF tables to CSV files, one file per race.

**Manual Method (Using Tabula or Similar):**

1. Open PDF in extraction tool
2. Select table area for one race
3. Export as CSV
4. Save with descriptive filename
5. Repeat for all races

**Naming Convention:**
```
Race name from PDF.csv

Examples:
President and Vice President.csv
Governor and Lieutenant Governor.csv
Centerville CSD - Additional 3.9 mills.csv
```

**Output Location:**
```bash
# Create CSV directory
mkdir -p data/raw/elections{YEAR}

# Example for 2026:
mkdir -p data/raw/elections26

# Save CSVs here
# data/raw/elections26/President and Vice President.csv
# data/raw/elections26/Centerville CSD - Additional 3.9 mills.csv
```

**CSV Format Requirements:**

```csv
Precinct,Registered Voters,Ballots Cast,Candidate A,Candidate B,...
BRK-A,1178,923,456,467,...
BRK-B,992,699,345,354,...
```

**Important:**
- First column: Precinct code/name
- Must include "Registered Voters" and "Ballots Cast" columns
- Candidate/choice columns follow
- Headers must be in first row

**Quality Checks:**
- ✅ All races extracted
- ✅ Column headers present and clear
- ✅ Precinct names match GeoJSON (use VLABEL or similar format)
- ✅ No merged cells or formatting artifacts
- ✅ Numbers are clean (commas okay, will be cleaned later)

---

### Step 3: Convert CSVs to JSON

**Script:** `scripts/convert_elections_to_json.py`

**What It Does:**
- Scans `data/raw/elections{YY}/` directories
- Converts each CSV to structured JSON
- Creates race manifest file
- Generates statistics summary

**Run the Script:**
```bash
python3 scripts/convert_elections_to_json.py
```

**Expected Output:**
```
Processing data/raw/elections26/...
  ✓ Converted President and Vice President.csv
  ✓ Converted Governor and Lieutenant Governor.csv
  ✓ Converted Centerville CSD.csv
  ... (all races)

Created files:
  data/elections/2026/President and Vice President.json
  data/elections/2026/manifest.json
  data/elections/2026/statistics.json
```

**Verify Output:**

```bash
# Check manifest file
cat data/elections/2026/manifest.json

# Should list all races:
# [
#   {"name": "President and Vice President", "file": "President and Vice President.json"},
#   ...
# ]

# Check statistics file
head -20 data/elections/2026/statistics.json

# Should show turnout data for each precinct
```

**Troubleshooting:**
- If script fails, check CSV format
- Ensure column headers are correct
- Verify no special characters in filenames
- Check Python console for specific error messages

---

### Step 4: Create or Update Precinct Mapping

**When Needed:** Only if new sub-precinct splits are introduced

**File:** `config/precinct-mapping.json`

**Purpose:** Maps sub-precincts to parent precincts for aggregation

**Example:**
```json
{
  "mappings": {
    "DAY 1-C": ["DAY 1-C1", "DAY 1-C2"],
    "DAY 2-A": ["DAY 2-A1", "DAY 2-A2", "DAY 2-A3"]
  }
}
```

**How to Update:**

1. Review new election results for sub-precinct codes
2. Identify precincts that were split (e.g., DAY 1-C → DAY 1-C1, DAY 1-C2)
3. Add mapping to `config/precinct-mapping.json`
4. Format: `"parent_code": ["child1", "child2", ...]`

**Validation:**
```bash
# Check JSON syntax
python3 -m json.tool config/precinct-mapping.json
```

---

### Step 5: Embed Statistics into GeoJSON

**Script:** `scripts/embed_statistics.py`

**What It Does:**
- Reads base precinct boundaries
- Loads statistics for specified year
- Cleans numeric values (removes commas, converts percentages)
- Aggregates sub-precincts (if mappings exist)
- Embeds statistics into GeoJSON properties
- Writes year-specific GeoJSON file

**Run the Script:**
```bash
# For specific year (recommended)
python3 scripts/embed_statistics.py 2026

# Or for all years (processes 2024, 2025, 2026, etc.)
python3 scripts/embed_statistics.py
```

**Expected Output:**
```
📊 Processing 2026 election data...
  📂 Loading base precinct GeoJSON...
     ✓ Loaded 497 precincts
  📈 Loading 2026 statistics...
     ✓ Loaded statistics for 400 precincts
     ℹ️  Aggregated 25 split precincts into parent precincts
  🔗 Matching statistics to precincts...
     ✓ Matched 497 of 497 precincts
  💾 Writing provider-data/precincts_2026.geojson...
     ✓ Created provider-data/precincts_2026.geojson (13.2 MB)

✅ Completed processing for 2026
```

**Verify Output:**
```bash
# Check file was created
ls -lh provider-data/precincts_2026.geojson

# Verify structure
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('provider-data/precincts_2026.geojson')); console.log('Features:', data.features.length); console.log('Sample properties:', Object.keys(data.features[0].properties).filter(k => k.includes('2026')).join(', '));"

# Should output:
# Features: 497
# Sample properties: 2026_Registered_Voters_Total, 2026_Ballots_Cast_Total, 2026_Voter_Turnout_Total
```

**Common Issues:**
- Unmatched precincts: Check precinct code normalization
- Missing data: Verify statistics.json has data for all precincts
- Aggregation errors: Review precinct-mapping.json

---

### Step 6: Update Frontend (if needed)

**Typically No Changes Required** - The frontend automatically discovers new datasets via the `/catalog` endpoint.

**Optional Updates:**

**A. Add Year to Year Selector (if not auto-detected):**

File: `index.html`

```html
<!-- Add new radio button -->
<label>
  <input type="radio" name="year" value="2026">
  2026
</label>
```

**B. Update Comparison Mode Logic (if needed):**

File: `static/scripts/components/ElectionUI.js`

```javascript
// If comparison mode needs to support new base year
// Usually auto-detects, but can hardcode if needed
```

**Most Common Case:** No changes needed, system auto-discovers new GeoJSON files.

---

## Validation and Testing

### Automated Analysis

**Run Statistical Analysis:**
```bash
node scripts/analyze_turnout.js
```

**Expected Output:**
- `analysis/summary_statistics.md` - Updated with new year data
- `analysis/precinct_rankings.csv` - Top 10 precincts for new year
- `analysis/skipped_precincts.md` - Data quality report

**Verify:**
- Turnout rates seem reasonable (10-80% range)
- Precinct count matches expected (497)
- No large number of skipped precincts
- Statistics match county totals (check against BOE summary)

**Run Geographic Analysis:**
```bash
node scripts/analyze_geographic_patterns.js
```

**Expected Output:**
- `analysis/geographic_patterns.md` - Updated with new year

**Verify:**
- Municipality counts match previous years
- Geographic patterns make sense
- No obvious data errors

### Manual Testing

**Start Local Server:**
```bash
npm start
# Or for development:
npm run dev
```

**Open Browser:**
```
http://localhost:8080
```

**Test Checklist:**

- [ ] New year appears in year selector
- [ ] New precinct layer loads (precincts_2026)
- [ ] Layer loads within 2-3 seconds
- [ ] Precincts display on map correctly
- [ ] Turnout visualization works
- [ ] Race dropdown populated with new races
- [ ] Clicking precinct shows popup with data
- [ ] Statistics shown in popup are correct
- [ ] Full election history button works
- [ ] Comparison mode works (if comparing to previous year)
- [ ] Filters work correctly
- [ ] No JavaScript errors in console (F12)

**Sample Precincts to Test:**
- High turnout precinct (verify shows green)
- Low turnout precinct (verify shows red)
- Urban precinct (Dayton)
- Suburban precinct (Centerville, Oakwood)
- Rural precinct (township)

---

## Deployment

### Git Workflow

**Always Create a Feature Branch:**

```bash
# Pull latest
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/add-2026-election-data

# Add all new files
git add data/elections/2026/
git add provider-data/precincts_2026.geojson
git add analysis/  # If updated
git add config/    # If mapping changed
git add docs/      # If documentation updated

# Commit
git commit -m "Add 2026 election data

- Processed 120 races from 2026 general election
- Generated precincts_2026.geojson with statistics
- Updated analysis reports
- All 497 precincts included with valid data

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push branch
git push -u origin feature/add-2026-election-data
```

**Create Pull Request:**
```bash
gh pr create --title "Add 2026 election data" --body "## Summary

Adds complete 2026 general election data to the visualization.

## Changes

- Processed 120 races from November 2026 election
- Generated \`precincts_2026.geojson\` (13MB)
- Updated analysis reports with 2026 statistics
- Verified all 497 precincts have valid data

## Testing

- ✅ Local testing completed
- ✅ All races load correctly
- ✅ Turnout visualization works
- ✅ Comparison mode functional
- ✅ No console errors

## Data Quality

- Total registered voters: 485,000
- Total ballots cast: 145,000
- Overall turnout: 29.9%
- Precincts analyzed: 497
- Precincts skipped: 0

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

### Railway Auto-Deployment

**After PR is Merged to Main:**

1. Railway detects push to main branch
2. Automatically builds and deploys
3. New data available at production URL within 2-3 minutes
4. Monitor deployment: https://railway.app (if you have access)

**Verify Production Deployment:**
```bash
# Check health endpoint
curl https://newmontylots-production.up.railway.app/health

# Check catalog includes new layer
curl https://newmontylots-production.up.railway.app/catalog
```

**Manual Verification:**
1. Visit https://newmontylots-production.up.railway.app/
2. Select new year (2026)
3. Load precinct layer
4. Verify data loads correctly
5. Test a few races
6. Check comparison mode

---

## Troubleshooting

### Issue: CSV Parsing Errors

**Problem:** `convert_elections_to_json.py` fails to parse CSVs

**Common Causes:**
- Merged cells in PDF extraction
- Missing column headers
- Special characters in race names
- Inconsistent delimiters (tab vs comma)

**Solutions:**
1. Re-export CSV with correct delimiter
2. Clean up column headers manually
3. Remove special characters from filenames
4. Ensure first row is headers, data starts row 2

---

### Issue: Precinct Matching Failures

**Problem:** `embed_statistics.py` reports many unmatched precincts

**Common Causes:**
- Precinct code format changed
- New precinct codes not in GeoJSON
- Normalization issue (zero-padding, spacing)

**Solutions:**
1. Check `VLABEL` field in base `precincts.geojson`
2. Verify precinct codes in `statistics.json`
3. Update `normalize_precinct_code()` function if format changed
4. Contact county GIS for updated precinct boundaries

**Debug Command:**
```bash
# List all VLABEL values from GeoJSON
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('provider-data/precincts.geojson')); data.features.forEach(f => console.log(f.properties.VLABEL));" | sort

# List all precinct codes from statistics
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('data/elections/2026/statistics.json')); data.results.forEach(r => console.log(r.Precinct));" | sort
```

Compare lists to identify mismatches.

---

### Issue: Sub-Precinct Aggregation Problems

**Problem:** Duplicate or missing precincts after aggregation

**Common Causes:**
- Mapping file outdated
- New splits not in mapping
- Parent-child code mismatch

**Solutions:**
1. Review `config/precinct-mapping.json`
2. Add new mappings for any new splits
3. Verify parent codes match GeoJSON exactly
4. Check embedding script output for aggregation count

---

### Issue: Turnout Values Look Wrong

**Problem:** Unrealistic turnout percentages (>100% or very low)

**Common Causes:**
- Comma in numbers not stripped: `"1,178"` → `1` instead of `1178`
- Percentage not converted: `"78.35%"` treated as string
- Ballots > Registered (data entry error)

**Solutions:**
1. Verify `clean_numeric_value()` function in `embed_statistics.py`
2. Check source CSV for formatting issues
3. Run analysis script and review `skipped_precincts.md`
4. Cross-check a few precincts manually against official PDFs

---

### Issue: Frontend Not Showing New Year

**Problem:** Year selector doesn't include new year, or layer doesn't load

**Common Causes:**
- Frontend caching old layer list
- GeoJSON file not in `provider-data/`
- Koop server not restarted
- File permissions issue

**Solutions:**
1. Verify file exists: `ls -lh provider-data/precincts_2026.geojson`
2. Restart local server: `npm start` (or `npm run dev`)
3. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
4. Check `/catalog` endpoint directly: `http://localhost:8080/catalog`

---

## Best Practices

### Documentation

**Update Documentation After Each Election:**
- [ ] Update PROJECT_OVERVIEW.md with new findings
- [ ] Add new year to analysis reports
- [ ] Document any data quality issues encountered
- [ ] Note any process improvements for next time

### Data Quality

**Always Validate:**
- Cross-check county totals with aggregated precinct totals
- Review skipped_precincts.md for data errors
- Spot-check high/low turnout precincts for accuracy
- Compare to previous years for reasonableness

### Version Control

**Use Meaningful Commit Messages:**
```bash
# Good
git commit -m "Add 2026 election data with 120 races and turnout analysis"

# Bad
git commit -m "Updated files"
```

**Create Pull Requests for Review:**
- Don't push directly to main
- Get second set of eyes on data quality
- Document testing in PR description

### Backup

**Before Making Changes:**
```bash
# Backup current data
cp -r provider-data/ backup-provider-data-$(date +%Y%m%d)/
cp -r data/elections/ backup-elections-$(date +%Y%m%d)/
```

---

## Future Enhancements

### Automation Opportunities

**PDF Extraction:**
- Script automated PDF table extraction (Tabula-py, PyPDF2)
- Reduce manual CSV creation time
- Standardize column naming

**Data Validation:**
- Automated cross-checks against county totals
- Flag outliers automatically
- Generate validation report

**Deployment:**
- Automated testing before merge
- Staging environment for preview
- Rollback capability

### Additional Data Sources

**Demographics:**
- Census tract data overlay
- Income, education, age statistics
- Correlation analysis with turnout

**Historical Trends:**
- 10+ years of election data
- Trend lines and predictions
- Precinct-level time series

---

## Contact and Support

**Questions About Process:**
- GitHub Issues: https://github.com/codefordayton/new_monty_lots/issues
- Email: info@codefordayton.org

**Technical Support:**
- Code for Dayton community
- Documentation: All files in `/docs/` directory

**Data Questions:**
- Montgomery County BOE: https://www.montgomery.boe.ohio.gov/
- County GIS: http://gis.mcohio.org/

---

**Last Updated:** December 28, 2025

*This guide is maintained by Code for Dayton. Pull requests welcome for improvements!*
