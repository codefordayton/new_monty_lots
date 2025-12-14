#!/usr/bin/env python3
"""Quick PDF inspection script to understand structure."""

import pdfplumber
from pathlib import Path

pdf_path = Path(__file__).parent.parent / 'data/raw/2024/11052024-Precinct-by-Precinct-Official-Final-with-write-ins.pdf'

print(f"Inspecting: {pdf_path.name}\n")

with pdfplumber.open(pdf_path) as pdf:
    # Check first few pages
    for i in [0, 1, 2]:
        if i >= len(pdf.pages):
            break

        page = pdf.pages[i]
        print(f"=" * 60)
        print(f"PAGE {i+1}")
        print("=" * 60)

        # Get text
        text = page.extract_text()
        if text:
            lines = text.split('\n')[:15]  # First 15 lines
            print("\nFirst 15 lines of text:")
            for line in lines:
                print(f"  {line}")

        # Get tables
        tables = page.extract_tables()
        print(f"\nTables found: {len(tables)}")

        if tables:
            for j, table in enumerate(tables):
                print(f"\n  Table {j+1}: {len(table)} rows x {len(table[0]) if table else 0} cols")
                if table and len(table) > 0:
                    print(f"    First row: {table[0][:5]}")  # First 5 cells
                    if len(table) > 1:
                        print(f"    Second row: {table[1][:5]}")

        print()
