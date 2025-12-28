# User Guide - Montgomery County Election Data Visualization

**How to Use the Interactive Map**

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Navigation](#basic-navigation)
3. [Viewing Election Data](#viewing-election-data)
4. [Advanced Features](#advanced-features)
5. [Tips and Tricks](#tips-and-tricks)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the Application

**Production URL**: https://newmontylots-production.up.railway.app/

**Local Development**:
```bash
git clone https://github.com/codefordayton/new_monty_lots.git
cd new_monty_lots
npm install
npm start
# Open http://localhost:8080
```

**System Requirements:**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Internet connection for map tiles
- Recommended: Desktop/laptop for best experience (mobile supported)

### Interface Overview

When you first open the application, you'll see:

**Left Sidebar (Collapsible):**
- Layer list with Load buttons
- Election year selector
- Race dropdown
- Voter turnout option
- Comparison mode toggle
- Precinct filter section

**Main Map Area:**
- Interactive Leaflet map
- Precinct boundaries (when loaded)
- Color-coded by selected visualization
- Zoom/pan controls

**Bottom Panels (When Active):**
- Legend (color scale explanation)
- Statistics summary
- Precinct summary panel

---

## Basic Navigation

###  Map Controls

**Zoom:**
- **Mouse wheel**: Scroll to zoom in/out
- **+/- buttons**: Top-left corner of map
- **Double-click**: Zoom in on location
- **Shift + drag**: Zoom to selected area

**Pan:**
- **Click and drag**: Move around the map
- **Arrow keys**: Pan in cardinal directions

**Reset View:**
- Click "Reset View" button (if available)
- Or zoom out fully and recenter

### Sidebar Management

**Collapse/Expand:**
- Click the **☰** (hamburger) icon in top-left
- Gives more map viewing space
- Sidebar remembers your selections when collapsed

**Mobile View:**
- Sidebar automatically collapses on small screens
- Access via hamburger menu
- Swipe gestures supported for map navigation

---

## Viewing Election Data

### Step 1: Select Election Year

**Options:**
- **2024** - Presidential election (November 5, 2024)
- **2025** - Off-year election (November 4, 2025)

**How to:**
1. Look for "Election Year" section in sidebar
2. Click radio button for desired year
3. Race dropdown updates with races for that year

**What Changes:**
- Available races in dropdown
- Precinct statistics (turnout, registration)
- Comparison mode base year (if enabled)

### Step 2: Load Precinct Layer

**Why Load Manually:**
- Large datasets (12-13 MB)
- User controls when to load for performance
- Choose which layers to display

**How to Load:**
1. Find layer name (e.g., "precincts_2024") in sidebar
2. Click **"Load"** button next to layer
3. Wait for layer to appear on map (2-3 seconds)
4. Button changes to **"Unload"** when active

**What You'll See:**
- Precinct boundaries appear on map
- Initially styled with default colors
- Clickable for more information

### Step 3: Select a Race or Visualization

**Option A: View Specific Race Results**

1. Click "Select a race..." dropdown
2. Scroll through 70+ (2024) or 110+ (2025) races
3. Click desired race (e.g., "President and Vice President")
4. Map updates with color coding by winner/percentage

**Color Scheme:**
- Different color for each candidate/choice
- Darker = higher vote percentage
- Hover over precinct for details

**Option B: View Voter Turnout**

1. Click **"📊 View Voter Turnout"** in race dropdown
2. Map shows 8-tier color scale:
   - **Dark Red** (< 20%) - Very low turnout
   - **Orange/Yellow** (20-60%) - Moderate turnout
   - **Green** (60-70%) - Good turnout
   - **Dark Green** (> 80%) - Excellent turnout

**Statistics Displayed:**
- Average turnout across all precincts
- Minimum turnout precinct
- Maximum turnout precinct

### Step 4: Explore Precinct Details

**Click Any Precinct:**
- Popup appears with precinct information
- Shows:
  - Precinct name
  - Turnout percentage
  - Registered voters
  - Ballots cast
  - Race results (if race selected)

**View Full Election History:**
1. Click precinct to open popup
2. Click **"View Full Election History"** button
3. Panel slides in from right showing:
   - All races from selected year
   - Each race card with candidates and vote counts
   - Year-over-year comparison (if available)

**Close History Panel:**
- Click **X** button in top-right
- Or click anywhere on map

---

## Advanced Features

### Comparison Mode

**Purpose:** Compare 2024 vs 2025 election results side-by-side

**How to Enable:**
1. Ensure a precinct layer is loaded
2. Toggle **"Enable Comparison Mode"** checkbox
3. Map switches to diverging color scheme:
   - **Red** = Turnout decreased from 2024 to 2025
   - **Gray** = No change
   - **Green** = Turnout increased from 2024 to 2025

**Statistics Shown:**
- Average turnout change
- Top 5 precincts with biggest increases
- Top 5 precincts with biggest decreases

**Use Cases:**
- Identify areas where local engagement improved
- Find precincts with declining participation
- Compare presidential vs off-year patterns

**Note:** Only works with turnout visualization, not individual races.

### Precinct Filtering

**Access:** Expand "🔍 Filter Precincts" section in sidebar

**Filter Options:**

**1. By Name:**
- Type precinct name in search box
- Real-time filtering as you type
- Example: "KETTERING" shows all Kettering precincts
- Clear box to reset

**2. By Turnout Range:**
- Set minimum turnout percentage (e.g., 50%)
- Set maximum turnout percentage (e.g., 80%)
- Click **"Apply Filters"**
- Matching precincts highlighted in blue

**3. By Race Winner:**
- Select a race from dropdown
- Type candidate name
- Filters to precincts where that candidate won
- Example: "Biden" shows precincts Biden won

**Filter Behavior:**
- Matching precincts: **Highlighted in blue**
- Non-matching precincts: **Dimmed/grayed out**
- Results count shown (e.g., "42 of 497 precincts match")

**Clear Filters:**
- Click **"Clear Filters"** button
- All precincts return to normal styling
- Filter inputs reset

**Combining Filters:**
- Use multiple filters together (AND logic)
- Example: Name="DAYTON" + Turnout >60% = high-turnout Dayton precincts

### Legend

**What It Shows:**
- Color scale explanation
- Value ranges for each color
- Updates based on current visualization

**Location:** Bottom-left of map

**Collapsible:** Click legend title to collapse/expand

**Example Legend Entries:**
- **Voter Turnout**: "80-100% (Dark Green)", "60-80% (Green)", etc.
- **Race Results**: "Candidate A (Blue)", "Candidate B (Red)", etc.

### Statistics Summary

**Location:** Appears below map when active

**Shows:**
- Average value across all precincts
- Minimum value and precinct
- Maximum value and precinct
- Standard deviation (for turnout)

**Updates:** Automatically when:
- Changing visualization
- Applying filters
- Switching years

---

## Tips and Tricks

### Performance Optimization

**Tip 1: Load Only What You Need**
- Don't load all layers at once
- Unload layers when switching years
- Browser caches data for faster subsequent loads

**Tip 2: Use Filters for Large Datasets**
- Filter before viewing full election history
- Reduces number of popups to load
- Improves responsiveness

**Tip 3: Refresh Page if Slow**
- Clears cached map tiles
- Resets layer states
- Recommended after viewing many races

### Effective Analysis Strategies

**Strategy 1: Geographic Patterns**
1. Load 2024 turnout visualization
2. Note high/low turnout clusters
3. Repeat for 2025
4. Use comparison mode to see changes

**Strategy 2: Race-Specific Analysis**
1. Select contentious race (e.g., school levy)
2. Note geographic voting patterns
3. Use precinct filter to isolate specific areas
4. Compare to demographic knowledge of area

**Strategy 3: Turnout Deep Dive**
1. View turnout choropleth
2. Click lowest-turnout precinct
3. View full election history
4. Identify if low turnout is persistent or race-specific

**Strategy 4: Year-over-Year Comparison**
1. Enable comparison mode
2. Look for red (decreased) vs green (increased) areas
3. Click interesting precincts
4. Analyze what local races may have driven engagement

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **+** | Zoom in |
| **-** | Zoom out |
| **Arrow Keys** | Pan map |
| **Esc** | Close popup/panel |
| **Space** | Toggle sidebar (if focus is on button) |

### URL Sharing

**Current Limitation:** URL does not persist selections

**Workaround:**
- Take screenshots of interesting views
- Note precinct names and selections manually
- Future enhancement: Shareable URLs with query parameters

### Data Export

**Current Limitation:** No export functionality built-in

**Workaround:**
- Download raw data from `/data/elections/` directory
- Use browser developer tools to export GeoJSON
- Contact maintainers for CSV exports

**Future Enhancement:** Export button for:
- Filtered precinct lists (CSV)
- Current map view (PNG)
- Race results table (CSV/Excel)

---

## Troubleshooting

### Issue: Map Doesn't Load

**Symptoms:**
- Blank gray area instead of map
- No base map tiles visible

**Solutions:**
1. Check internet connection (required for OpenStreetMap tiles)
2. Disable browser extensions (ad blockers may interfere)
3. Try different browser
4. Clear browser cache and reload

---

### Issue: Layer Won't Load

**Symptoms:**
- Clicking "Load" button does nothing
- Layer button stays grayed out
- Error message in console

**Solutions:**
1. Wait longer (large files take 2-3 seconds)
2. Check browser console for errors (F12)
3. Reload page and try again
4. Verify server is running (check health endpoint: `/health`)

---

### Issue: Precinct Data Missing

**Symptoms:**
- Precinct boundaries visible but no statistics
- Popup shows "No data available"
- Turnout shows 0%

**Solutions:**
1. Verify correct year loaded (2024 vs 2025)
2. Check if precinct has data in source files
3. Review `analysis/skipped_precincts.md` for data quality issues
4. May be sub-precinct that needs aggregation

---

### Issue: Comparison Mode Not Working

**Symptoms:**
- Toggle checkbox does nothing
- Colors don't change
- No statistics appear

**Solutions:**
1. Ensure turnout visualization is selected (not a race)
2. Verify both 2024 and 2025 data loaded
3. Try unloading layer and reloading
4. Check console for JavaScript errors

---

### Issue: Filters Not Applying

**Symptoms:**
- Clicking "Apply Filters" does nothing
- All precincts remain same color
- No results count updates

**Solutions:**
1. Verify precinct layer is loaded
2. Check filter values are valid (e.g., min < max for turnout)
3. Try clearing filters and reapplying
4. Check browser console for errors
5. Reload page if persistent

---

### Issue: Slow Performance

**Symptoms:**
- Map lags when zooming/panning
- Popup takes long to appear
- Browser becomes unresponsive

**Solutions:**
1. Unload unnecessary layers
2. Close election history panel if open
3. Clear filters to reduce processing
4. Use modern browser (Chrome/Firefox recommended)
5. Close other browser tabs
6. Refresh page to clear memory

---

### Issue: Mobile Display Problems

**Symptoms:**
- Sidebar covers map entirely
- Buttons too small to click
- Map doesn't respond to touch

**Solutions:**
1. Use landscape orientation for better view
2. Collapse sidebar using hamburger menu
3. Pinch to zoom on map
4. Tap precincts to select (may require precise tap)
5. Consider using desktop for complex analysis

---

## Getting Help

### Documentation

- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) - Project goals and findings
- [DATA_DICTIONARY.md](./DATA_DICTIONARY.md) - Field definitions
- [DATA_PROCESSING.md](./DATA_PROCESSING.md) - How data is processed
- [FUTURE_UPDATES.md](./FUTURE_UPDATES.md) - Adding new elections

### Support Channels

**GitHub Issues:**
- Report bugs: https://github.com/codefordayton/new_monty_lots/issues
- Request features
- Ask questions

**Code for Dayton:**
- Email: info@codefordayton.org
- Community meetings and workshops

### Contributing

**Found a Bug?**
1. Check existing GitHub issues
2. Create new issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Browser and OS info
   - Screenshots if helpful

**Want to Contribute?**
1. Fork repository
2. Make improvements
3. Submit pull request
4. See CONTRIBUTING.md for guidelines

---

## Appendix: Common Use Cases

### Use Case 1: Identify Low-Turnout Areas for Outreach

**Goal:** Find precincts with persistently low turnout

**Steps:**
1. Load 2024 precincts
2. View voter turnout
3. Click "🔍 Filter Precincts"
4. Set max turnout to 40%
5. Apply filters
6. Note highlighted precincts (displayed in blue)
7. Repeat for 2025 to see if same precincts appear
8. Target these areas for voter engagement

**Expected Result:** List of 10-20 precincts with <40% turnout in both years

---

### Use Case 2: Analyze School Levy Results by Geography

**Goal:** See which neighborhoods supported/opposed school levy

**Steps:**
1. Load precincts for year with levy on ballot
2. Select levy race from dropdown (e.g., "Centerville CSD - Additional 3.9 mills")
3. Map colors by Yes/No vote percentage
4. Click precincts to see exact vote counts
5. Note geographic patterns (e.g., which townships/cities supported)
6. Use filter to find precincts where levy passed/failed

**Expected Result:** Clear geographic visualization of levy support

---

### Use Case 3: Compare Presidential vs Local Turnout

**Goal:** See if local elections drive different turnout patterns

**Steps:**
1. Load 2024 precincts
2. View voter turnout (presidential year)
3. Note overall patterns and statistics
4. Switch to 2025
5. View voter turnout (off-year)
6. Enable comparison mode
7. Identify green areas (increased local engagement)

**Expected Result:** Some precincts show higher relative turnout in local elections

---

### Use Case 4: Research Specific Neighborhood

**Goal:** Deep dive into one precinct's voting history

**Steps:**
1. Load 2024 or 2025 precincts
2. Use name filter to find precinct (e.g., "KETTERING 03-J")
3. Click precinct when highlighted
4. Click "View Full Election History"
5. Review all races and results
6. Compare to other Kettering precincts if desired

**Expected Result:** Complete voting record for selected precinct

---

*For questions or feedback, please contact Code for Dayton or submit a GitHub issue.*

**Last Updated:** December 28, 2025
