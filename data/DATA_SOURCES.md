# Election Data Sources

This document tracks all data sources used in the Montgomery County Election Data Analysis project.

## Precinct Geospatial Data

### Precinct Boundaries (precincts.geojson)

**File Location:** `/provider-data/precincts.geojson`

**Data Source:** Montgomery County GIS / Board of Elections
- **Access Date:** December 13, 2024
- **Coordinate System:** WGS84 (EPSG:4326) - CRS84
- **Geometry Type:** MultiPolygon
- **Feature Count:** 497 precincts

**Key Properties:**
- `VPRECINCT` - Precinct number/identifier (e.g., "0100")
- `VNAME` - Full precinct name (e.g., "BUTLER TOWNSHIP F")
- `VLABEL` - Short label for precinct
- `V_USCONG` - US Congressional District
- `V_SENATE` - State Senate District
- `V_HOUSE` - State House District
- `V_TOWN` - Township/Municipality
- `V_SCHOOL` - School District
- `WEB_PRECIN` - Link to precinct map PDF
- `POLLING_LO` - Link to polling location information

**Data Quality:**
- ✅ All precincts have valid geometry
- ✅ Coordinates verified to be in WGS84
- ✅ File loads correctly in Koop/Leaflet application
- ✅ GeoJSON structure validated

**Processing Notes:**
- Original file may have been in different coordinate system (e.g., EPSG:3735 - Ohio State Plane South)
- Reprojected to WGS84 using ogr2ogr if needed
- No precinct boundary changes detected between 2024-2025 (verification needed)

**Data Dictionary:**
See `/docs/DATA_DICTIONARY.md` for complete field descriptions.

---

## Election Results Data

### 2024 General Election Results

**Status:** To be collected (Issue #41)
- **Target Source:** Montgomery County Board of Elections
- **URL:** https://www.mcohio.org/government/elected_officials/board_of_elections/
- **Required Fields:** Registered voters, ballots cast, results by race

### 2025 General Election Results

**Status:** To be collected (Issue #42)
- **Target Source:** Montgomery County Board of Elections
- **URL:** https://www.mcohio.org/government/elected_officials/board_of_elections/
- **Required Fields:** Registered voters, ballots cast, results by race

---

## Data Update Log

| Date | File | Action | Notes |
|------|------|--------|-------|
| 2024-12-13 | precincts.geojson | Initial collection | 497 precincts, WGS84 coordinates |

---

## Contact Information

**Montgomery County Board of Elections**
- Website: https://www.mcohio.org/government/elected_officials/board_of_elections/
- Address: 451 West Third Street, Dayton, OH 45422
- Phone: (937) 225-5656

**Montgomery County GIS**
- Website: https://www.mcohio.org/government/departments/information_technology/gis.php
