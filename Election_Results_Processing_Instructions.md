# Instructions for Processing Montgomery County Election Results into Web Pages

## Purpose
Convert Montgomery County Board of Elections Excel files (.xlsx) into standalone HTML web pages that can be linked from the elections timeline, printed, or downloaded by users.

## Prerequisites
- Excel file (.xlsx format) from Montgomery County Board of Elections
- File should contain election results data with standard structure

## Process Overview

### Step 1: Upload the Excel File
Upload the .xlsx file to the Claude Project. The file name should follow the pattern:
- `Nov7-2023_Montgomery_Co_Election_Results.xlsx`
- `Nov5-2024_Montgomery_County_Presidential_.xlsx`
- `Nov4-2025_Montgomery_Co_OHElection_Results.xlsx`

### Step 2: Provide Election Details
Tell Claude the following information for the banner header:

**Required Information:**
1. **Election Type**: Presidential, General, or "Hometown Election"
2. **Color Code**: 
   - Purple for Presidential elections
   - Blue for General elections  
   - Green for "Hometown" (municipal) elections
3. **Election Date**: Full date (e.g., "November 7, 2023")
4. **Finality Text**: 2-3 lines for the right side of the banner describing the status of results, such as:
   - "OFFICIAL CANVASS"
   - "Final Results With Write-Ins"
   - "MONTGOMERY COUNTY, OH"

### Step 3: Processing Request
Use this exact phrasing to Claude:

```
Please process this election results file into a web page using the same methodology you used for the Nov 7, 2023 results.

Election details:
- Election Type: [Presidential/General/Hometown Election]
- Color: [Purple/Blue/Green]
- Date: [Full date]
- Finality text: 
  [Line 1]
  [Line 2]
  [Line 3]
```

### Step 4: What Claude Will Do

Claude will:
1. Extract race data from the Excel file using the established parser
2. Handle special cases:
   - Split race titles (e.g., "Centerville" + "Mayor")
   - FTC/FTE designations for judge races
   - Uncontested races with single candidates
   - Column variations (data may be in columns 26 OR 27, 36 OR 37)
3. Create an HTML file with:
   - Fixed banner with election info, search box, download/print buttons
   - Race titles highlighted in yellow with green left border
   - Properly aligned data tables with correct column headers
   - All 156+ races from the source file

### Step 5: Review and Corrections

After Claude provides the HTML file, review it and report any issues:

**Common issues to check:**
- Race titles showing candidate names instead (e.g., "Frank Gehres" instead of "Dayton Municipal Court Judge")
- Missing FTC/FTE dates for judge races
- Column misalignment (numbers in wrong columns)
- Missing races

**How to report issues:**
List specific problems like:
- "Line: [candidate name] should read: [correct race title]"
- "Columns are misaligned for [race name]"
- "Missing [specific race]"

Claude will fix these issues while keeping everything else exactly the same.

## Technical Details (for developers)

### Data Structure
The Excel files have data in specific columns:
- Column 0: Candidate name / Race title
- Column 14: Additional race info (FTC dates, etc.)
- Column 17: Combined "Total + Vote %" (e.g., "4,131  64.97%")
- Columns 26/27: Election Day votes (check both)
- Column 30: Early Voting (E)
- Column 31: Early Voting (continued)
- Column 35: Provisional
- Columns 36/37: Absentee Add-In (check both)
- Column 39: Election Day Add-In

### Race Identification Logic
A row is a race title if:
- Column 0 has text
- Column 17 is empty (no vote data)
- Does NOT start with "REP ", "DEM ", "LIB ", "GRN "
- Does NOT match keywords: "Vote For", "TOTAL", "Overvotes", "Undervotes", "Total Votes Cast", "Precincts Reporting"
- "Day" as exact word only (not "Dayton")

### Output Format
- HTML file with embedded JavaScript for races data
- Yellow highlighting (#FFFF99) on race titles
- Green left border (#228B22) on race titles
- Sticky banner at top
- Search, print, and download functionality
- Responsive table layout

## File Naming Convention
Output files should be named:
- `Nov7-2023-Montgomery-County-Results.html`
- `Nov5-2024-Montgomery-County-Results.html`
- `Nov4-2025-Montgomery-County-Results.html`

## Known Limitations
- Search "tab to next occurrence" feature is not fully functional
- Download button triggers print dialog (not true download)
- Users can use browser "Save As" for actual download

## For Future Enhancements
The software engineer on the team can:
- Implement proper search navigation
- Add true download functionality
- Integrate with elections.codefordayton.org
- Connect to timeline pop-up boxes
- Add additional styling or features
