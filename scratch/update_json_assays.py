import openpyxl
import json
import os
import re

json_path = 'public/drillhole_data.json'
if not os.path.exists(json_path):
    print("Error: public/drillhole_data.json not found!")
    exit(1)

print("Loading existing JSON database...")
with open(json_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

excel_path = '/Users/ismailcan/Downloads/KM-Metalik_Sondaj_All.xlsx'
print(f"Reading metallic Excel file at {excel_path}...")
wb = openpyxl.load_workbook(excel_path, data_only=True)
sheet = wb['DH_Analysis']

def to_float(val, default=0.0):
    if val is None:
        return default
    try:
        return float(val)
    except ValueError:
        m = re.findall(r"[-+]?\d*\.?\d+", str(val))
        if m:
            try:
                return float(m[0])
            except:
                pass
        return default

print("Enriching JSON assay records with metallic elements...")
enriched_count = 0
for r_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
    hole_id, proj, lic, sample_id, bas, bit = row[:6]
    if not hole_id or not sample_id:
        continue
    c_id = str(hole_id).strip().upper()
    
    if c_id in db:
        assays = db[c_id].get('assays', [])
        found = False
        from_val = to_float(bas)
        to_val = to_float(bit)
        
        # Match by sampleId or depth interval
        for a in assays:
            if a.get('sampleId') == str(sample_id).strip() or (abs(a.get('from', 0.0) - from_val) < 0.01 and abs(a.get('to', 0.0) - to_val) < 0.01):
                a['au_ppb'] = to_float(row[8])
                a['au_ppm'] = to_float(row[10])
                a['ag_ppm'] = to_float(row[11])
                a['cu_ppm'] = to_float(row[22])
                a['pb_ppm'] = to_float(row[34])
                a['zn_ppm'] = to_float(row[45])
                a['as_ppm'] = to_float(row[13])
                found = True
                enriched_count += 1
                break

print(f"Successfully enriched {enriched_count} assay records.")
print(f"Saving changes back to {json_path}...")
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)
print("Complete!")
