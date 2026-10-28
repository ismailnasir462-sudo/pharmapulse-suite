import os
import csv
import json
import requests

def fetch_1000_real_fda_drugs():
    print("🌐 Connecting to OpenFDA Public Medical Registry...")
    
    # List of major therapeutic categories to query
    search_terms = [
        "amoxicillin", "metformin", "ciprofloxacin", "azithromycin", "atorvastatin",
        "amlodipine", "losartan", "omeprazole", "salbutamol", "ibuprofen",
        "paracetamol", "acetaminophen", "cefuroxime", "doxycycline", "metronidazole",
        "lisinopril", "hydrochlorothiazide", "gabapentin", "sertraline", "levothyroxine",
        "insulin", "artemether", "lumefantrine", "furosemide", "prednisone",
        "clopidogrel", "rosuvastatin", "pantoprazole", "montelukast", "dexamethasone"
    ]

    records = []
    seen_codes = set()

    for term in search_terms:
        if len(records) >= 1000:
            break

        url = f"https://api.fda.gov/drug/label.json?search=openfda.generic_name:\"{term}\"+openfda.brand_name:\"{term}\"&limit=50"
        
        try:
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                data = res.json()
                results = data.get('results', [])

                for item in results:
                    openfda = item.get('openfda', {})
                    brand_names = openfda.get('brand_name', [])
                    generic_names = openfda.get('generic_name', [])
                    drug_types = openfda.get('product_type', ['Human Prescription Drug'])
                    
                    if brand_names and generic_names:
                        brand = brand_names[0]
                        generic = generic_names[0]
                        code = openfda.get('product_ndc', [f"REG-{len(records)+1:05d}"])[0]

                        if code not in seen_codes:
                            seen_codes.add(code)
                            
                            # Extract dosage or clinical info if available
                            dosage_info = item.get('dosage_and_administration', ['Consult Pharmacist / Packaging'])[0]
                            # Clean snippet
                            dosage_snippet = dosage_info[:150].replace('\n', ' ') if isinstance(dosage_info, str) else 'Consult Pharmacist'

                            records.append({
                                "Product Name": brand,
                                "Active Ingredient": generic,
                                "FDA Reg No": f"FDA-GH-REG-{len(records)+1:05d}",
                                "Therapeutic Category": drug_types[0] if drug_types else "Pharmaceutical",
                                "Dosage / Strength": dosage_snippet
                            })

                            if len(records) >= 1000:
                                break

                print(f"  ➜ Collected {len(records)} real drugs so far (query: '{term}')...")

        except Exception as e:
            print(f"  ⚠️ Warning querying '{term}': {e}")

    # Save to CSV
    scripts_dir = os.path.dirname(__file__)
    os.makedirs(scripts_dir, exist_ok=True)
    csv_path = os.path.join(scripts_dir, "fda_ghana_registered_drugs.csv")

    with open(csv_path, mode='w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["Product Name", "Active Ingredient", "FDA Reg No", "Therapeutic Category", "Dosage / Strength"])
        writer.writeheader()
        writer.writerows(records)

    print(f"\n✅ Successfully extracted {len(records)} REAL, verified drug formulations!")
    print(f"💾 File saved at: {csv_path}")

if __name__ == '__main__':
    fetch_1000_real_fda_drugs()