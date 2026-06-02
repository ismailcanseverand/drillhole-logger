import requests
import json
import os
import sys

URL = 'https://pjbyjlqlfguebdxobpdj.supabase.co/rest/v1'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYnlqbHFsZmd1ZWJkeG9icGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDQ0MzEsImV4cCI6MjA5NTg4MDQzMX0.E1Md7xE9a7eDb3JcSLF-YPpkM1GN5VfqMk5gvTTuCmg'
HEADERS = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

json_path = 'public/drillhole_data.json'
if not os.path.exists(json_path):
    print(f"Error: {json_path} does not exist. Run merge script first!")
    sys.exit(1)

with open(json_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

print(f"Loaded {len(db)} drillhole records from JSON database.")

all_collars = []
all_surveys = []
all_lithologies = []
all_geotechs = []
all_assays = []

for hole_id, data in db.items():
    c = data.get('collar', {})
    
    # 1. Collar
    all_collars.append({
        'hole_id': hole_id,
        'easting': c.get('easting', 0.0),
        'northing': c.get('northing', 0.0),
        'elevation': c.get('elevation', 0.0),
        'total_depth': c.get('totalDepth', 0.0),
        'dip': c.get('dip', -90.0),
        'azimuth': c.get('azimuth', 0.0),
        'date_started': c.get('dateStarted', ''),
        'date_completed': c.get('dateCompleted', ''),
        'logger': c.get('logger', ''),
        'status': c.get('status', 'Completed'),
        'project': c.get('project', '') # Might fail if database column not active
    })
    
    # 2. Surveys
    if data.get('surveys'):
        for s in data['surveys']:
            all_surveys.append({
                'id': s['id'] if s['id'].startswith(hole_id) else f"{hole_id}_{s['id']}",
                'hole_id': hole_id,
                'depth': s.get('depth', 0.0),
                'dip': s.get('dip', -90.0),
                'azimuth': s.get('azimuth', 0.0)
            })
            
    # 3. Lithologies
    if data.get('lithology'):
        for l in data['lithology']:
            # Handle possible Photo embedding
            desc = l.get('description', '')
            if l.get('photo'):
                desc = f"{desc} [PHOTO:{l['photo']}]".strip()
            all_lithologies.append({
                'id': l['id'] if l['id'].startswith(hole_id) else f"{hole_id}_{l['id']}",
                'hole_id': hole_id,
                'from_depth': l.get('from', 0.0),
                'to_depth': l.get('to', 0.0),
                'rock_code': l.get('rockCode', 'GNAYS'),
                'alteration': l.get('alteration', ''),
                'mineralization': l.get('mineralization', ''),
                'description': desc
            })
            
    # 4. Geotechs
    if data.get('geotech'):
        for g in data['geotech']:
            all_geotechs.append({
                'id': g['id'] if g['id'].startswith(hole_id) else f"{hole_id}_{g['id']}",
                'hole_id': hole_id,
                'from_depth': g.get('from', 0.0),
                'to_depth': g.get('to', 0.0),
                'drilled_length': g.get('drilledLength', 0.0),
                'recovered_length': g.get('recoveredLength', 0.0),
                'solid_pieces_over_10cm': g.get('solidPiecesOver10cm', 0.0),
                'tcr_percent': g.get('tcrPercent', 0.0),
                'rqd_percent': g.get('rqdPercent', 0.0)
            })
            
    # 5. Assays
    if data.get('assays'):
        for a in data['assays']:
            all_assays.append({
                'id': a['id'] if a['id'].startswith(hole_id) else f"{hole_id}_{a['id']}",
                'hole_id': hole_id,
                'sample_id': a.get('sampleId', ''),
                'from_depth': a.get('from', 0.0),
                'to_depth': a.get('to', 0.0),
                'sample_type': a.get('sampleType', 'Core'),
                'al2o3': a.get('al2o3', 0.0),
                'fe2o3': a.get('fe2o3', 0.0),
                'sio2': a.get('sio2', 0.0),
                'tio2': a.get('tio2', 0.0),
                'na2o_k2o': a.get('na2o_k2o', 0.0),
                'loi': a.get('loi', 0.0)
            })

def upload_in_chunks(table_name, items, chunk_size=500):
    total = len(items)
    print(f"Uploading {total} records to table '{table_name}' in chunks of {chunk_size}...")
    for i in range(0, total, chunk_size):
        chunk = items[i:i+chunk_size]
        res = requests.post(f"{URL}/{table_name}", headers=HEADERS, json=chunk)
        if res.status_code not in [200, 201]:
            print(f"Error uploading chunk {i//chunk_size + 1} to {table_name}: {res.status_code} - {res.text}")
            return False
    print(f"Successfully uploaded all {total} records to '{table_name}'.")
    return True

# A. Upload Collars (with schema-fallback for project column)
print("Uploading collars...")
success = False
# Try with 'project' column
res = requests.post(f"{URL}/collars", headers=HEADERS, json=all_collars[:10]) # test small chunk first
if res.status_code in [200, 201]:
    # Table supports project! Upload all
    print("Database supports 'project' column. Upserting collars...")
    success = upload_in_chunks('collars', all_collars)
else:
    # Column not found or failed. Try without project field
    print("Database does NOT yet support 'project' column. Retrying collars without 'project' field...")
    collars_no_project = []
    for col in all_collars:
        col_copy = col.copy()
        col_copy.pop('project', None)
        collars_no_project.append(col_copy)
    success = upload_in_chunks('collars', collars_no_project)
    print("\n[IMPORTANT WARNING] Please run the following SQL command in your Supabase SQL Editor to support the 'project' field:")
    print("ALTER TABLE collars ADD COLUMN IF NOT EXISTS project TEXT DEFAULT '';\n")

if success:
    # B. Upload Child Tables
    upload_in_chunks('surveys', all_surveys, 1000)
    upload_in_chunks('lithologies', all_lithologies, 500)
    upload_in_chunks('geotechs', all_geotechs, 500)
    upload_in_chunks('assays', all_assays, 1000)
    print("\nSupabase database sync complete! All metallic and industrial records uploaded successfully.")
else:
    print("Failed to sync collars to Supabase.")
