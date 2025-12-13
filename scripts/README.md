# Election Data Processing Scripts

This directory contains Python scripts for extracting and processing election data from PDF files.

## Setup

### Install Dependencies

```bash
# Install Python libraries (user mode to avoid system conflicts)
pip3 install pdfplumber pandas --user
```

Or create a virtual environment:

```bash
cd scripts
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Scripts

### extract_pdf_data.py

Extracts election data from Montgomery County Board of Elections PDF files and converts to CSV format.

**Usage:**
```bash
python3 scripts/extract_pdf_data.py
```

**What it does:**
1. Reads PDF files from `data/raw/2024/`
2. Extracts tables and text data using pdfplumber
3. Saves raw extracted data to `data/processed/`
4. Creates CSV files ready for further cleaning and analysis

**Input Files:**
- `data/raw/2024/11052024-Precinct-by-Precinct-Official-Final-with-write-ins.pdf`
- `data/raw/2024/11052024es-final-with-write-ins.pdf`

**Output Files:**
- `data/processed/raw_precinct_extraction_2024.csv` - Raw precinct-level data
- `data/processed/raw_summary_extraction_2024.csv` - Raw county summary data

**Next Steps After Running:**
1. Review the raw extraction files
2. Identify data structure and column patterns
3. Create a parsing script to clean and structure the data
4. Join with precinct GeoJSON using precinct IDs

## Workflow

### 1. Download PDFs

Download election result PDFs from Montgomery County Board of Elections:
https://www.mcohio.org/government/elected_officials/board_of_elections/

Place PDFs in `data/raw/2024/`

### 2. Extract Data

```bash
python3 scripts/extract_pdf_data.py
```

### 3. Review Extraction

Open the CSV files in `data/processed/` to examine the extracted data structure.

### 4. Clean and Structure

Create additional parsing scripts to:
- Identify column headers
- Clean field values
- Standardize precinct IDs
- Calculate turnout rates
- Export final clean CSVs

### 5. Join with GeoJSON

Merge cleaned election data with precinct boundaries from `provider-data/precincts.geojson`

## Troubleshooting

### pdfplumber Not Found

```bash
pip3 install pdfplumber --user
```

### PDF Files Not Found

Ensure PDFs are in the correct location:
```bash
ls data/raw/2024/
```

Should show:
- `11052024-Precinct-by-Precinct-Official-Final-with-write-ins.pdf`
- `11052024es-final-with-write-ins.pdf`

### Permission Denied

Make scripts executable:
```bash
chmod +x scripts/*.py
```

## Data Sources

All election data is sourced from:
**Montgomery County Board of Elections**
- Website: https://www.mcohio.org/government/elected_officials/board_of_elections/
- Address: 451 West Third Street, Dayton, OH 45422
- Phone: (937) 225-5656

## Notes

- PDF extraction is imperfect - always review extracted data
- Different PDF formats may require script adjustments
- Precinct IDs must match those in the GeoJSON file
- Keep original PDFs for reference and verification
