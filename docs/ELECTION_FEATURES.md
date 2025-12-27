# Election Data Visualization Features

This document describes the election data visualization features added to the Monty Lots application.

## Overview

The application now supports viewing and analyzing election data at the precinct level for 2024 and 2025 elections. Election data is dynamically loaded and overlaid onto precinct boundaries.

## How to Use

### 1. Load a Precinct Layer

First, load one of the precinct layers from the sidebar:
- `precincts_2024` - 2024 precinct boundaries with embedded voter turnout statistics
- `precincts_2025` - 2025 precinct boundaries with embedded voter turnout statistics

### 2. Select an Election Year

Once a precinct layer is loaded, the **Election Data** section will appear in the sidebar.

1. Click the **Year** dropdown
2. Select either **2024** or **2025**

### 3. Select a Race

After selecting a year, the **Race** dropdown will populate with all available races for that election:

**2024 Races** (69 races including):
- Presidential
- U.S. Senator
- Congressional Districts
- State Senate/House Districts
- County races (Commissioner, Sheriff, etc.)
- Local ballot issues

**2025 Races** (109 races including):
- Dayton Mayor
- Dayton Commission
- Local school boards
- Township trustees
- Municipal ballot issues

### 4. View Results

When you select a race:

**Map Visualization:**
- Precincts are color-coded by the winning candidate's margin of victory
- Darker blue = larger margin (landslide win)
- Lighter blue = smaller margin (close race)
- Very light/white = extremely close race

**Race Summary Panel:**
- Shows county-wide vote totals
- Lists top candidates with vote counts and percentages
- Visual vote bars for each candidate
- Number of precincts reporting

**Click on Precincts:**
- Click any precinct to see detailed results for that precinct
- Popup shows all candidates and their vote counts
- Displays percentages and total votes cast

## Color Coding

### Voter Turnout Mode (No Race Selected)
- **Dark Green**: 70%+ turnout (very high)
- **Medium Green**: 60-70% turnout (high)
- **Light Green**: 50-60% turnout (moderate)
- **Very Light Green**: 40-50% turnout (low-moderate)
- **Almost White**: <40% turnout (low)

### Race Results Mode (Race Selected)
- **Dark Blue**: 70%+ margin (landslide)
- **Medium Blue**: 60-70% margin (strong win)
- **Light Blue**: 55-60% margin (moderate win)
- **Very Light Blue**: 50-55% margin (narrow win)
- **Almost White**: <50% margin (very close/tied)

## Technical Details

### Data Structure

**Embedded Statistics (in GeoJSON):**
- `2024_Registered_Voters_Total`
- `2024_Ballots_Cast_Total`
- `2024_Voter_Turnout_Total`
- `2025_Registered_Voters_Total`
- `2025_Ballots_Cast_Total`
- `2025_Voter_Turnout_Total`

**Race Data (loaded on-demand):**
- Individual race results stored as JSON files
- Loaded via `/api/elections/{year}/races/{raceId}`
- Temporarily injected into precinct features as `_currentRace` property

### Sub-Precinct Aggregation

The 2025 election includes split precincts (e.g., BRK-A split into BRK-A1 and BRK-A2). The system automatically:
- Aggregates sub-precinct data into parent precinct totals
- Maintains granular sub-precinct data in JSON files
- Displays aggregated results on the map
- Includes metadata showing which sub-precincts were combined

### API Endpoints

- `GET /api/elections` - List available election years
- `GET /api/elections/{year}` - Get metadata for specific year
- `GET /api/elections/{year}/statistics` - Get voter registration/turnout
- `GET /api/elections/{year}/races/{raceId}` - Get specific race results

## Implementation Details

### Frontend Components

**RaceDataManager** (`static/scripts/race-data-manager.js`):
- Handles loading election data from API
- Injects race data into precinct features
- Calculates county-wide totals
- Determines winning candidates

**ElectionUI** (`static/scripts/components/ElectionUI.js`):
- Manages election UI controls (dropdowns, summary panel)
- Handles user interactions (year/race selection)
- Updates map styling based on selected data
- Generates race summary displays

### Backend Processing

**Precinct Mapping** (`config/precinct-mapping.json`):
- Maps 67 parent precincts to 153 sub-precincts
- Used to aggregate 2025 split precinct data
- Enables backwards compatibility with existing GeoJSON

**Embedding Scripts** (`scripts/`):
- `convert_elections_to_json.py` - Converts CSV files to JSON
- `embed_statistics.py` - Embeds statistics into GeoJSON files

## Future Enhancements

Potential improvements for iteration:

1. **Comparison Mode**: Side-by-side view of 2024 vs 2025 results
2. **Advanced Filtering**: Filter precincts by turnout, margin, etc.
3. **Historical Trends**: Show how precincts have voted over time
4. **Export Features**: Download race results as CSV
5. **Race Categories**: Group races by type (federal, state, local)
6. **Search**: Search for specific races or candidates
7. **Legend Updates**: Dynamic legend showing current visualization mode

## Notes

- The system uses dynamic property injection, so race data doesn't permanently modify the GeoJSON
- Switching races updates the visualization in real-time
- Clearing the race selection returns to turnout visualization
- Sub-precinct data is preserved in JSON files for potential future use
