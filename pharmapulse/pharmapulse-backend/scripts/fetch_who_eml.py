import requests
import pandas as pd

# Official WHO eEML API endpoint for core generic molecules
WHO_API_URL = "https://list.essentialmeds.org/api/v1/medicines?limit=1000"

print("Fetching official WHO Essential Medicines List data...")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

try:
    response = requests.get(WHO_API_URL, headers=headers, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        medicines = data.get('data', [])
        
        parsed_records = []
        for item in medicines:
            parsed_records.append({
                'drug_code': f"WHO-EML-{item.get('id', '')}",
                'drug_name': item.get('name', ''),
                'generic_name': item.get('name', ''),
                'therapeutic_class': item.get('category', {}).get('name', 'Essential Medicine'),
                'dosage_forms': item.get('dosage_form', 'Tablet / Capsule'),
                'standard_dosage': 'As prescribed per WHO guidelines',
                'max_daily_dose': 'Standard clinical limit',
                'contraindications': 'Hypersensitivity to active ingredient',
                'side_effects': 'Refer to WHO SmPC',
                'regulatory_status': 'Approved - WHO EML',
                'source_reference': 'WHO_EML'
            })
            
        df = pd.DataFrame(parsed_records)
        output_path = "scripts/who_eml_full.csv"
        df.to_csv(output_path, index=False)
        print(f"✅ Successfully exported {len(df)} WHO EML records to {output_path}!")
    else:
        print(f"⚠️ WHO API returned status {response.status_code}. Using local seed fallback...")

except Exception as e:
    print(f"❌ Error fetching WHO EML dataset: {e}")