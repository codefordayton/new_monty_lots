# Montgomery County Election Data Project - GitHub Issues

## Overview
This document contains suggested GitHub issues for the election data analysis and visualization project. Issues are organized by project phase and can be created as needed.

---

## Phase 1: Data Collection & Preparation (6 hours)

### Issue #1: Download and collect 2024 General Election data
**Labels:** `data-collection`, `priority-high`
**Assignee:** David (1hr) + Janet (2hrs)
**Estimate:** 3 hours

**Description:**
Download official election results from Montgomery County Board of Elections for November 2024 General Election.

**Tasks:**
- [ ] Download precinct-level results from Montgomery County BOE
- [ ] Collect total registered voters by precinct
- [ ] Collect ballots cast by precinct
- [ ] Download results by race (President, Senate, etc.)
- [ ] Download results by issue/ballot measure
- [ ] Collect early voting vs. election day breakdowns
- [ ] Document all data source URLs and access dates
- [ ] Store raw data in `/data/raw/2024/` directory

**Deliverables:**
- Raw election data files (CSV/Excel)
- Data sources documentation (URLs, access dates)

**Data Sources:**
- Montgomery County Board of Elections: https://www.mcohio.org/government/elected_officials/board_of_elections/

---

### Issue #2: Download and collect 2025 General Election data
**Labels:** `data-collection`, `priority-high`
**Assignee:** David (0.5hr) + Janet (1hr)
**Estimate:** 1.5 hours

**Description:**
Download official election results from Montgomery County Board of Elections for November 2025 General Election for comparison analysis.

**Tasks:**
- [ ] Download precinct-level results from Montgomery County BOE
- [ ] Collect total registered voters by precinct
- [ ] Collect ballots cast by precinct
- [ ] Download results by race/issue
- [ ] Collect early voting vs. election day breakdowns
- [ ] Document all data source URLs and access dates
- [ ] Store raw data in `/data/raw/2025/` directory

**Deliverables:**
- Raw election data files (CSV/Excel)
- Data sources documentation

**Notes:**
- Use same methodology as 2024 data collection for consistency
- Ensure precinct identifiers match between 2024 and 2025 datasets

---

### Issue #3: Collect and validate precinct geospatial data
**Labels:** `data-collection`, `geospatial`, `priority-high`
**Assignee:** David (0.5hr) + Janet (0.5hr)
**Estimate:** 1 hour

**Description:**
Download and validate geospatial data (GeoJSON/Shapefile) for Montgomery County voting precincts to enable map visualization.

**Tasks:**
- [ ] Download precinct boundary shapefile/GeoJSON from county GIS
- [ ] Verify precinct identifiers match election data
- [ ] Check for any precinct boundary changes between 2024-2025
- [ ] Convert to GeoJSON format if needed (using ogr2ogr)
- [ ] Ensure coordinates are in WGS84 (EPSG:4326)
- [ ] Validate GeoJSON structure
- [ ] Store in `/provider-data/` directory
- [ ] Document data source and date

**Deliverables:**
- Precinct boundaries GeoJSON file
- Documentation of any precinct boundary changes

**Technical Notes:**
- File should be compatible with existing Koop/Leaflet infrastructure
- Use `ogr2ogr -t_srs EPSG:4326` if reprojection needed

---

### Issue #4: Create cleaned and analysis-ready datasets
**Labels:** `data-processing`, `priority-high`
**Assignee:** Janet (1hr)
**Estimate:** 1 hour

**Description:**
Process raw election data into cleaned, standardized datasets ready for analysis and visualization.

**Tasks:**
- [ ] Standardize precinct identifiers across all datasets
- [ ] Calculate derived metrics:
  - Turnout rate (ballots cast / registered voters)
  - Turnout change (2025 rate - 2024 rate)
  - Participation rate for top-of-ticket vs. down-ballot
- [ ] Create joined dataset with precinct, 2024 data, 2025 data
- [ ] Handle missing/null values appropriately
- [ ] Export cleaned data as CSV
- [ ] Store in `/data/processed/` directory

**Deliverables:**
- `precincts_2024.csv` - Cleaned 2024 election data
- `precincts_2025.csv` - Cleaned 2025 election data
- `precincts_combined.csv` - Combined analysis-ready dataset

**Data Structure:**
```csv
precinct_id,precinct_name,registered_voters_2024,ballots_cast_2024,turnout_rate_2024,registered_voters_2025,ballots_cast_2025,turnout_rate_2025,turnout_change
```

---

### Issue #5: Create data dictionary and processing documentation
**Labels:** `documentation`, `priority-medium`
**Assignee:** Janet (0.5hr)
**Estimate:** 0.5 hours

**Description:**
Document all data fields, calculations, and processing steps for reproducibility.

**Tasks:**
- [ ] Create `DATA_DICTIONARY.md` documenting:
  - All field names and descriptions
  - Data types and valid ranges
  - Calculation formulas for derived metrics
  - Data source references
- [ ] Document data processing workflow
- [ ] Create or document scripts used for data cleaning
- [ ] Include examples and edge cases

**Deliverables:**
- `/docs/DATA_DICTIONARY.md`
- `/docs/DATA_PROCESSING.md`
- Processing scripts (Python/R/etc.) in `/scripts/` if applicable

---

## Phase 2: Analysis & Insights (4 hours)

### Issue #6: Calculate summary statistics for county-wide turnout
**Labels:** `analysis`, `priority-high`
**Assignee:** David (0.5hr) + Janet (1hr)
**Estimate:** 1.5 hours

**Description:**
Calculate high-level summary statistics for Montgomery County election turnout.

**Tasks:**
- [ ] Calculate overall county turnout rate for 2024
- [ ] Calculate overall county turnout rate for 2025
- [ ] Calculate percentage change in turnout (2024 to 2025)
- [ ] Calculate distribution statistics:
  - Mean precinct turnout rate
  - Median precinct turnout rate
  - Standard deviation
  - Min/max turnout rates
- [ ] Identify top 10 highest turnout precincts
- [ ] Identify top 10 lowest turnout precincts
- [ ] Document findings in analysis notebook/document

**Deliverables:**
- Summary statistics document (`/analysis/summary_statistics.md`)
- CSV with precinct rankings

---

### Issue #7: Identify geographic patterns in voter turnout
**Labels:** `analysis`, `geospatial`, `priority-high`
**Assignee:** Janet (1.5hrs)
**Estimate:** 1.5 hours

**Description:**
Analyze spatial patterns and geographic clusters of voter turnout across Montgomery County.

**Tasks:**
- [ ] Group precincts by township/city
- [ ] Calculate average turnout by geographic area
- [ ] Identify geographic clusters of high turnout
- [ ] Identify geographic clusters of low turnout
- [ ] Analyze urban vs. suburban vs. rural patterns
- [ ] Compare national election (2024) vs. local election (2025) patterns
- [ ] Create visualizations (charts/maps) showing patterns
- [ ] Document key findings

**Deliverables:**
- Geographic analysis document (`/analysis/geographic_patterns.md`)
- Charts/graphs for final report
- Maps highlighting key patterns

---

### Issue #8: Generate key findings and insights memo
**Labels:** `analysis`, `documentation`, `priority-high`
**Assignee:** David (0.5hr) + Janet (0.5hr)
**Estimate:** 1 hour

**Description:**
Synthesize analysis results into key findings memo for Democracy Fellows and stakeholders.

**Tasks:**
- [ ] Compile top 5-7 key findings
- [ ] Identify actionable insights for civic engagement
- [ ] Highlight precincts/areas for targeted outreach
- [ ] Compare national vs. "hometown" election engagement
- [ ] Draft recommendations for Democracy Fellows
- [ ] Create executive summary
- [ ] Include supporting charts/visualizations

**Deliverables:**
- Key findings memo (`/analysis/KEY_FINDINGS.md`)
- Executive summary for final report

---

## Phase 3: Interactive Visualization Development (6 hours)

### Issue #9: Integrate election data with precinct GeoJSON
**Labels:** `visualization`, `geospatial`, `priority-high`
**Assignee:** David (1hr)
**Estimate:** 1 hour

**Description:**
Merge cleaned election datasets with precinct boundary GeoJSON for map visualization.

**Tasks:**
- [ ] Join 2024 election data to precinct GeoJSON properties
- [ ] Join 2025 election data to precinct GeoJSON properties
- [ ] Add calculated metrics (turnout rates, changes) to properties
- [ ] Validate that all precincts have matching data
- [ ] Handle any missing/unmatched precincts
- [ ] Export enhanced GeoJSON files to `/provider-data/`
- [ ] Test loading in current Koop application

**Deliverables:**
- `precincts_2024_election.geojson` - Precincts with 2024 data
- `precincts_2025_election.geojson` - Precincts with 2025 data
- `precincts_turnout_change.geojson` - Precincts with change analysis

**Technical Notes:**
- Ensure GeoJSON validates correctly
- Preserve all original geometry
- Use consistent property naming

---

### Issue #10: Implement choropleth map visualization for turnout rates
**Labels:** `visualization`, `enhancement`, `priority-high`
**Assignee:** David (2hrs)
**Estimate:** 2 hours

**Description:**
Create color-coded choropleth maps showing precinct turnout rates with dynamic legend.

**Tasks:**
- [ ] Define color scale for turnout rates (e.g., 0-20%, 20-40%, 40-60%, 60-80%, 80-100%)
- [ ] Implement dynamic styling function for choropleth coloring
- [ ] Create color legend component showing turnout rate ranges
- [ ] Add layer toggles for:
  - 2024 General Election turnout
  - 2025 General Election turnout
  - Turnout change (2024 to 2025)
- [ ] Ensure smooth layer switching
- [ ] Test color accessibility/readability
- [ ] Add tooltips on hover showing turnout percentage

**Deliverables:**
- Choropleth styling implementation
- Interactive layer toggle UI
- Color legend component

**Design Notes:**
- Use colorblind-friendly color palette
- Consider diverging color scale for turnout change (red = decrease, green = increase)

---

### Issue #11: Enhance precinct popups with detailed election data
**Labels:** `visualization`, `enhancement`, `priority-high`
**Assignee:** David (1.5hrs)
**Estimate:** 1.5 hours

**Description:**
Improve precinct popup content to show comprehensive election information and context.

**Tasks:**
- [ ] Update `field-labels.json` with election data field mappings
- [ ] Configure popup to display:
  - Precinct identifier and name
  - 2024: Registered voters, ballots cast, turnout %
  - 2025: Registered voters, ballots cast, turnout %
  - Turnout change (percentage points)
  - Comparison to county average
  - Township/city/municipality
  - Links to detailed results (BOE website)
- [ ] Format percentages and numbers for readability
- [ ] Add visual indicators (↑↓ arrows for change)
- [ ] Optimize popup layout for mobile devices
- [ ] Add "Share this precinct" functionality (optional)

**Deliverables:**
- Enhanced popup template
- Updated field labels configuration
- Mobile-responsive popup layout

---

### Issue #12: Add data filtering and search capabilities
**Labels:** `visualization`, `enhancement`, `priority-medium`
**Assignee:** David (1hr)
**Estimate:** 1 hour

**Description:**
Enable users to filter and search for specific precincts or turnout ranges.

**Tasks:**
- [ ] Add turnout rate range filter (slider or dropdown)
- [ ] Add township/city filter dropdown
- [ ] Enable search by precinct name/ID
- [ ] Implement "Show only high turnout" / "Show only low turnout" quick filters
- [ ] Add "Reset filters" button
- [ ] Ensure filtered precincts update map display
- [ ] Update statistics panel to show filtered data

**Deliverables:**
- Filter controls UI
- Search functionality
- Quick filter buttons

**Technical Notes:**
- Leverage existing search infrastructure from generic search feature
- Update field analyzer if needed for election data fields

---

### Issue #13: Create comparison view for 2024 vs 2025 elections
**Labels:** `visualization`, `enhancement`, `priority-medium`
**Assignee:** David (0.5hr)
**Estimate:** 0.5 hours

**Description:**
Add side-by-side or toggle comparison view for visualizing differences between 2024 and 2025 turnout.

**Tasks:**
- [ ] Add "Comparison Mode" toggle/button
- [ ] Implement split-screen view (optional) or layer overlay
- [ ] Add visual indicators for significant changes
- [ ] Create legend for diverging color scale (increase/decrease)
- [ ] Add statistics comparing 2024 vs 2025 in sidebar
- [ ] Test usability and performance

**Deliverables:**
- Comparison mode UI
- Split-screen or overlay visualization
- Comparative statistics display

---

## Phase 4: Documentation & Reporting (2 hours)

### Issue #14: Create comprehensive project documentation
**Labels:** `documentation`, `priority-high`
**Assignee:** Janet (1hr)
**Estimate:** 1 hour

**Description:**
Document the project methodology, data sources, and visualization tool usage for future reference and updates.

**Tasks:**
- [ ] Create `PROJECT_OVERVIEW.md` with:
  - Project goals and objectives
  - Data sources and collection methodology
  - Analysis approach
  - Key findings summary
  - Tool description and features
- [ ] Create `USER_GUIDE.md` for using the visualization tool:
  - How to access the map
  - How to interpret the visualizations
  - How to use filters and search
  - How to export/share insights
- [ ] Create `FUTURE_UPDATES.md` with:
  - Instructions for adding new election cycles
  - Data processing workflow
  - How to update the map with new data
- [ ] Add screenshots and annotated images

**Deliverables:**
- `/docs/PROJECT_OVERVIEW.md`
- `/docs/USER_GUIDE.md`
- `/docs/FUTURE_UPDATES.md`
- Screenshots in `/docs/images/`

---

### Issue #15: Compile final project report
**Labels:** `documentation`, `reporting`, `priority-high`
**Assignee:** Janet (1hr)
**Estimate:** 1 hour

**Description:**
Create comprehensive final report for Democracy Fellows and contract deliverable.

**Tasks:**
- [ ] Write executive summary of findings
- [ ] Document data sources and methodology
- [ ] Include key insights from analysis (from Issue #8)
- [ ] Describe visualization tool and features
- [ ] Add recommendations for Democracy Fellows
- [ ] Include links to:
  - Interactive map (deployed URL)
  - GitHub repository
  - Datasets (CSV downloads)
- [ ] Add screenshots of key visualizations
- [ ] Format for professional presentation (PDF + Markdown)
- [ ] Include all elements required for contract section 2.5

**Deliverables:**
- Final project report (PDF)
- Final project report (Markdown)
- All required elements for monthly report submission

**Report Sections:**
1. Executive Summary
2. Project Background and Goals
3. Data Sources and Collection
4. Methodology
5. Analysis and Key Findings
6. Visualization Tool Description
7. Recommendations for Democracy Fellows
8. Future Enhancements
9. Appendices (Data Dictionary, Technical Details)

---

## Infrastructure/Support Issues

### Issue #16: Set up project directory structure and data management
**Labels:** `infrastructure`, `priority-high`
**Assignee:** David (0.5hr)
**Estimate:** 0.5 hours

**Description:**
Organize project files and establish data management conventions.

**Tasks:**
- [ ] Create directory structure:
  ```
  /data
    /raw
      /2024
      /2025
    /processed
  /analysis
  /docs
    /images
  /scripts
  ```
- [ ] Add `.gitignore` for large data files
- [ ] Document file naming conventions
- [ ] Set up data backup strategy
- [ ] Add README to each directory explaining contents

**Deliverables:**
- Organized directory structure
- Updated `.gitignore`
- Directory README files

---

### Issue #17: Deploy updated application for public access
**Labels:** `deployment`, `priority-high`
**Assignee:** David (0.5hr)
**Estimate:** 0.5 hours

**Description:**
Deploy the enhanced election data visualization to production environment.

**Tasks:**
- [ ] Test application locally with all election data
- [ ] Update environment variables if needed
- [ ] Deploy to Railway (or hosting platform)
- [ ] Verify all layers load correctly
- [ ] Test on mobile devices
- [ ] Create shareable URL
- [ ] Add analytics tracking (optional)

**Deliverables:**
- Production deployment URL
- Deployment documentation

---

## Milestones

### Milestone 1: Data Collection Complete
- Issues #1, #2, #3, #4, #5
- Target: Week 1

### Milestone 2: Analysis Complete
- Issues #6, #7, #8
- Target: Week 2

### Milestone 3: Visualization Complete
- Issues #9, #10, #11, #12, #13
- Target: Week 3

### Milestone 4: Documentation & Delivery
- Issues #14, #15, #17
- Target: Week 4

---

## Labels to Create

```
data-collection
data-processing
analysis
visualization
geospatial
documentation
reporting
infrastructure
deployment
priority-high
priority-medium
priority-low
enhancement
```

---

## Notes

- Total estimated hours: ~18 hours (matches budget)
- Issues can be worked in parallel where dependencies allow
- Consider creating a project board to track progress
- Some issues may be split further based on actual implementation needs
- Adjust priorities based on project timeline and deadlines
