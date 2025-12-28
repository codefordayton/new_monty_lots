# Montgomery County Election Data Visualization - Project Overview

**A Democracy Fellows Initiative**

---

## Table of Contents

1. [Project Goals](#project-goals)
2. [Data Sources](#data-sources)
3. [Methodology](#methodology)
4. [Key Findings](#key-findings)
5. [Technical Architecture](#technical-architecture)
6. [Project Timeline](#project-timeline)
7. [Team and Acknowledgments](#team-and-acknowledgments)

---

## Project Goals

### Primary Objectives

This project aims to make Montgomery County, Ohio election data accessible, understandable, and actionable for residents, researchers, civic organizations, and Democracy Fellows.

**Core Goals:**

1. **Transparency**: Make precinct-level election results easily accessible to the public
2. **Engagement**: Enable data-driven conversations about voter turnout and civic participation
3. **Analysis**: Provide tools to identify geographic patterns and trends in voter behavior
4. **Accessibility**: Create an intuitive interface requiring no GIS or technical expertise
5. **Reproducibility**: Build a sustainable system for processing future election cycles

### Target Audience

- **Residents**: Understanding voting patterns in their community
- **Researchers**: Analyzing civic engagement trends across Montgomery County
- **Democracy Fellows**: Supporting voter engagement and turnout initiatives
- **Civic Organizations**: Identifying areas for targeted outreach
- **Election Officials**: Visualizing precinct-level results geographically
- **Journalists**: Reporting on election outcomes with spatial context

### Success Metrics

✅ **Data Accessibility**: 180+ races and 497 precincts visualized
✅ **User Engagement**: Interactive map with filtering and comparison features
✅ **Analysis Depth**: Statistical reports on turnout patterns and geographic trends
✅ **Reproducibility**: Documented pipeline for processing future elections
✅ **Open Source**: Public GitHub repository for community collaboration

---

## Data Sources

### Primary Data Source

**Montgomery County Board of Elections**
- Website: https://www.montgomery.boe.ohio.gov/
- Data Type: Official precinct-level election results
- Format: PDF reports (Precinct-by-Precinct Official Final Results)
- Coverage: All precincts across Montgomery County

**Elections Analyzed:**
- **2024 General Election** (November 5, 2024)
  - Presidential election year
  - 70+ races across county
  - High turnout election

- **2025 General Election** (November 4, 2025)
  - Off-year election
  - 110+ races (local focus)
  - Lower turnout election

### Geographic Data Source

**Montgomery County GIS Services**
- Website: http://gis.mcohio.org/
- Data Type: Precinct boundary shapefiles/GeoJSON
- Projection: WGS 84 (EPSG:4326)
- Features: 497 precinct polygons with jurisdiction metadata

### Data Collection Process

1. **Official Results**: Downloaded from BOE website as PDF documents
2. **Parsing**: Converted PDF tables to CSV format (manual process)
3. **Structuring**: Transformed CSV data to JSON for each race
4. **Geographic Integration**: Merged election statistics with precinct boundaries
5. **Quality Validation**: Cross-checked totals against county-wide summaries

### Data Completeness

| Dataset | Precincts Covered | Races Included | Coverage |
|---------|------------------|----------------|----------|
| 2024 General | 497 precincts | 70+ races | 100% |
| 2025 General | 497 precincts | 110+ races | 100% |
| Geographic Boundaries | 497 precincts | N/A | 100% |

**Data Quality Notes:**
- All official results from Montgomery County BOE
- Precinct boundaries current as of 2025
- Sub-precinct splits aggregated for consistency
- See [DATA_DICTIONARY.md](./DATA_DICTIONARY.md) for field details

---

## Methodology

### Analysis Framework

#### 1. Data Processing Pipeline

**Raw Data → Structured Data → Geographic Data → Visualization**

See [DATA_PROCESSING.md](./DATA_PROCESSING.md) for complete pipeline documentation.

**Key Steps:**
1. Extract tabular data from official PDFs
2. Structure race results as JSON
3. Calculate turnout statistics
4. Embed statistics into precinct GeoJSON
5. Serve via Koop REST API
6. Display via interactive Leaflet map

#### 2. Turnout Calculation

**Formula:**
```
Voter Turnout = (Ballots Cast) / (Registered Voters) × 100%
```

**Application:**
- Calculated for each precinct individually
- Aggregated to municipality level (city/township)
- Categorized by urban/suburban/rural designation
- Compared year-over-year (2024 vs 2025)

**Validation:**
- Precinct-level calculations cross-checked with county totals
- Data quality rules applied (see DATA_DICTIONARY.md)
- Outliers and errors flagged in analysis reports

#### 3. Geographic Analysis

**Spatial Groupings:**
- **By Municipality**: Grouped 497 precincts into 185 cities/townships
- **By Type**: Categorized as Urban, Suburban, or Rural/Township
- **By Region**: Analyzed spatial clusters and patterns

**Methods:**
- Aggregate statistics by geographic area
- Identify high/low turnout clusters
- Compare urban vs suburban vs rural patterns
- Map spatial distribution of voter engagement

#### 4. Comparison Analysis

**2024 vs 2025 Election Comparison:**
- Presidential (2024) vs Off-Year (2025) turnout differences
- Geographic patterns across election types
- Municipality-level changes
- Persistent high/low turnout areas

**Key Metrics:**
- Overall turnout change: 69.08% (2024) → 24.24% (2025)
- Suburban-urban gap: 12.05 pp (2024), 3.52 pp (2025)
- Geographic consistency in relative performance

---

## Key Findings

### Overall Turnout Statistics

#### 2024 General Election (Presidential Year)

| Metric | Value |
|--------|-------|
| **Overall Turnout** | **69.08%** |
| Registered Voters | 483,431 |
| Ballots Cast | 333,999 |
| Precincts Analyzed | 497 |
| Mean Precinct Turnout | 68.94% |
| Median Precinct Turnout | 71.23% |
| Turnout Range | 14.93% - 86.42% |

#### 2025 General Election (Off-Year)

| Metric | Value |
|--------|-------|
| **Overall Turnout** | **24.24%** |
| Registered Voters | 462,026 |
| Ballots Cast | 112,001 |
| Precincts Analyzed | 497 |
| Mean Precinct Turnout | 24.07% |
| Median Precinct Turnout | 23.68% |
| Turnout Range | 5.34% - 52.03% |

**Year-over-Year Change:** **-44.84 percentage points** (-64.9% relative decrease)

### Geographic Patterns

#### Urban vs. Suburban vs. Rural Turnout

**2024 Presidential Election:**

| Type | Precincts | Registered | Overall Turnout | Range |
|------|-----------|-----------|----------------|-------|
| Suburban | 113 | 112,481 | **74.95%** | 53.34% - 86.38% |
| Rural/Township | 128 | 125,852 | **74.47%** | 44.73% - 86.42% |
| Urban | 240 | 229,850 | **62.90%** | 14.93% - 84.24% |

**Key Insight:** Suburban and rural areas significantly outperformed urban areas by ~12 percentage points.

**2025 Off-Year Election:**

| Type | Precincts | Registered | Overall Turnout | Range |
|------|-----------|-----------|----------------|-------|
| Suburban | 113 | 109,293 | **26.16%** | 6.74% - 52.03% |
| Rural/Township | 128 | 121,461 | **25.14%** | 8.55% - 39.66% |
| Urban | 240 | 216,389 | **22.64%** | 6.59% - 46.69% |

**Key Insight:** Geographic gaps narrowed in off-year election, but suburban areas still led.

#### Top Performing Municipalities (2024)

1. **Perry Township A**: 86.42% turnout
2. **Centerville I**: 86.38% turnout
3. **Washington Township H**: 85.70% turnout
4. **Washington Township B**: 85.38% turnout
5. **Washington Township F**: 85.37% turnout

**Pattern:** Rural townships and high-income suburban areas showed highest engagement.

#### Lowest Performing Municipalities (2024)

1. **Harrison Township C**: 43.00% turnout
2. **Harrison Township K**: 44.73% turnout
3. **Page Manor**: 46.15% turnout
4. **Harrison Township H**: 50.70% turnout
5. **Jefferson Township B**: 52.33% turnout

**Pattern:** Certain townships and urban precincts showed persistent low turnout.

### Demographic and Spatial Insights

**Dayton City (Urban Core):**
- 122 precincts
- 54.78% turnout (2024), 19.38% (2025)
- Below county average in both elections
- Represents largest concentration of low-turnout precincts

**Oakwood (Affluent Suburb):**
- Consistently high turnout (70-85% range in 2024)
- 40-50% range in 2025
- Among highest-performing communities both years

**Harrison Township (Rural/Mixed):**
- Wide variation within township (43% to 80% in 2024)
- Suggests internal demographic diversity
- Target area for voter engagement efforts

### Comparison Mode Insights

**Feature:** Users can toggle "Comparison Mode" to see 2024 vs 2025 changes

**Findings:**
- Most precincts showed 40-50 pp decrease (expected for off-year)
- Some precincts showed smaller decreases (more engaged in local elections)
- Geographic patterns remained consistent across election types

---

## Technical Architecture

### System Components

#### Backend

**Koop GIS Server:**
- Framework: @koopjs/koop-core v10.4.17
- Provider: @koopjs/provider-file-geojson v2.2.0
- Purpose: Serves GeoJSON as Esri FeatureServer API
- Performance: ~2-3 second load times for 12-13 MB files

**Custom Endpoints:**
- `GET /catalog` - Lists available datasets
- `GET /health` - Server health check
- `GET /api/styles/config` - Layer styling configuration

**Data Storage:**
- Local: `provider-data/` directory with GeoJSON files
- Optional: S3-compatible storage (DigitalOcean Spaces, AWS S3)
- Cache: None required (GeoJSON served directly)

#### Frontend

**Mapping Library:**
- Leaflet v1.9.4 with Marker Clustering
- OpenStreetMap tile layer
- Custom choropleth rendering

**UI Framework:**
- Vanilla JavaScript (ES6 modules)
- Component-based architecture
- State management via MapState and LayerState classes

**Key Features:**
- Dynamic layer loading (user-controlled)
- Year selection (2024/2025)
- Race dropdown (180+ races)
- Comparison mode toggle
- Precinct filtering (by name, turnout, winner)
- Full election history view

#### Data Processing

**Python Scripts:**
- `convert_elections_to_json.py` - CSV to JSON conversion
- `embed_statistics.py` - GeoJSON generation

**Node.js Scripts:**
- `analyze_turnout.js` - Statistical analysis
- `analyze_geographic_patterns.js` - Geographic analysis

### Deployment

**Hosting:** Railway.app
- **Production URL**: https://newmontylots-production.up.railway.app/
- **Auto-Deploy**: On push to main branch via GitHub integration
- **Environment**: Node.js 14+, PORT=8080

**Performance:**
- Initial load: ~2-3 seconds
- Layer switching: <1 second
- Precinct popup: Instant
- Filter application: <500ms

---

## Project Timeline

### Phase 1: Data Collection and Processing (Weeks 1-2)

✅ Downloaded 2024 and 2025 election PDFs
✅ Parsed PDFs to CSV format
✅ Converted CSVs to structured JSON
✅ Generated turnout statistics
✅ Embedded statistics into precinct GeoJSON

### Phase 2: Visualization Development (Weeks 2-3)

✅ Built Koop server with GeoJSON provider
✅ Created Leaflet map interface
✅ Implemented year selection
✅ Added race dropdown with 180+ contests
✅ Built voter turnout choropleth visualization

### Phase 3: Advanced Features (Week 4)

✅ Implemented comparison mode (2024 vs 2025)
✅ Created precinct filtering system
✅ Added full election history panel
✅ Built precinct summary statistics
✅ Implemented responsive mobile design

### Phase 4: Analysis and Documentation (Weeks 5-6)

✅ Generated statistical analysis reports
✅ Created geographic pattern analysis
✅ Documented data dictionary
✅ Documented processing pipeline
✅ Created user guides and project overview
✅ Deployed to production (Railway)

### Phase 5: Delivery and Handoff (Week 6)

- ✅ Final project report compilation
- ✅ Comprehensive documentation
- ⏳ Stakeholder presentation
- ⏳ Knowledge transfer to Democracy Fellows

---

## Team and Acknowledgments

### Development Team

**Code for Dayton**
- Civic tech volunteer organization
- Open-source development community
- GitHub: https://github.com/codefordayton

**Contributors:**
- Data processing and pipeline development
- Interactive visualization implementation
- Statistical and geographic analysis
- Documentation and user guides

### Supported By

**Democracy Fellows**
- Program supporting civic engagement through data transparency
- Focus on voter turnout and participation analysis
- Community outreach and education initiatives

### Data Providers

**Montgomery County Board of Elections**
- Official election results (PDF reports)
- Certified precinct-level vote totals
- Public data access and transparency

**Montgomery County GIS Services**
- Precinct boundary shapefiles
- Jurisdiction and district metadata
- Geographic data accuracy

### Technology Partners

**Open Source Tools:**
- Koop (Esri) - GIS data transformation framework
- Leaflet - Interactive mapping library
- OpenStreetMap - Base map tiles

**Hosting:**
- Railway.app - Application deployment
- GitHub - Code repository and collaboration

---

## Impact and Future Work

### Project Impact

**Transparency:**
- Made 180+ race results accessible via interactive map
- Enabled precinct-level analysis for all Montgomery County elections
- Public GitHub repository for community contributions

**Analysis:**
- Identified 12-point suburban-urban turnout gap
- Highlighted persistent low-turnout areas for engagement efforts
- Documented geographic patterns across election types

**Reproducibility:**
- Complete pipeline for processing future elections
- Automated scripts reduce manual effort by ~90%
- Documentation enables knowledge transfer

### Future Enhancements

**Data Integration:**
- Demographic data overlay (census tracts)
- Historical trend analysis (5+ election cycles)
- Real-time election night results (if API available)

**Features:**
- Export functionality (PDF maps, CSV data)
- Custom area selection (draw polygon, radius search)
- Precinct comparison tool (side-by-side view)
- Embedding widgets for external websites

**Analysis:**
- Predictive modeling (turnout forecasting)
- Voter behavior clustering (k-means, hierarchical)
- Correlation analysis (demographics vs turnout)

---

## References and Resources

### Documentation

- [README.md](../README.md) - Getting started and features
- [DATA_DICTIONARY.md](./DATA_DICTIONARY.md) - Field reference
- [DATA_PROCESSING.md](./DATA_PROCESSING.md) - Pipeline documentation
- [USER_GUIDE.md](./USER_GUIDE.md) - How to use the visualization
- [FUTURE_UPDATES.md](./FUTURE_UPDATES.md) - Adding new elections

### External Resources

- **Montgomery County BOE**: https://www.montgomery.boe.ohio.gov/
- **Montgomery County GIS**: http://gis.mcohio.org/
- **Code for Dayton**: https://www.codefordayton.org/
- **Project Repository**: https://github.com/codefordayton/new_monty_lots
- **Live Application**: https://newmontylots-production.up.railway.app/

### Analysis Reports

- [analysis/summary_statistics.md](../analysis/summary_statistics.md) - Turnout statistics
- [analysis/geographic_patterns.md](../analysis/geographic_patterns.md) - Spatial analysis
- [analysis/precinct_rankings.csv](../analysis/precinct_rankings.csv) - Top performers
- [analysis/skipped_precincts.md](../analysis/skipped_precincts.md) - Data quality

---

## Contact

**Questions or Feedback:**
- GitHub Issues: https://github.com/codefordayton/new_monty_lots/issues
- Code for Dayton: info@codefordayton.org

**Contributions Welcome:**
- Fork the repository
- Submit pull requests
- Report bugs or request features
- Improve documentation

---

*This project was created to support Democracy Fellows' mission of promoting civic engagement through data transparency and accessibility.*

**Last Updated:** December 28, 2025
