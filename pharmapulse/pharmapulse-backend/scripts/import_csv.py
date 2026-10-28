import csv
import json
import os
import mysql.connector

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Thetiger1!',  # Replace with your actual MySQL password
    'database': 'pharmapulse',
    'port': 3306
}

def import_csv_to_mysql():
    csv_path = os.path.join(os.path.dirname(__file__), "fda_ghana_registered_drugs.csv")

    if not os.path.exists(csv_path):
        print(f"❌ File not found: {csv_path}")
        return

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        insert_sql = """
        INSERT INTO clinical_knowledge_base 
            (drug_code, drug_name, generic_name, therapeutic_class, dosage_forms, standard_dosage, contraindications, side_effects, regulatory_status, source_reference)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            drug_name = VALUES(drug_name),
            generic_name = VALUES(generic_name),
            therapeutic_class = VALUES(therapeutic_class),
            regulatory_status = VALUES(regulatory_status);
        """

        count = 0
        with open(csv_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)

            for index, row in enumerate(reader):
                product_name = row.get('Product Name') or f"FDA-Drug-{index+1}"
                active_ingredient = row.get('Active Ingredient') or product_name
                reg_num = row.get('FDA Reg No') or f"FDA-GH-REG-{index+1:05d}"
                category = row.get('Therapeutic Category') or "Pharmaceutical"
                dosage = row.get('Dosage / Strength') or "As prescribed"

                # Safely truncate strings to fit MySQL column capacity (VARCHAR 255 / 100)
                clean_drug_code = reg_num.strip()[:50]
                clean_drug_name = product_name.strip()[:250]
                clean_generic_name = active_ingredient.strip()[:250]
                clean_category = category.strip()[:100]

                data = (
                    clean_drug_code,
                    clean_drug_name,
                    clean_generic_name,
                    clean_category,
                    json.dumps({"strength": dosage}),
                    dosage.strip(),
                    "Refer to Product Package Leaflet",
                    "Refer to Product Package Leaflet",
                    "Approved - FDA Ghana",
                    "FDA_GHANA"
                )

                cursor.execute(insert_sql, data)
                count += 1

        conn.commit()
        print(f"🎉 SUCCESS! Imported {count} FDA Ghana registered drugs into `clinical_knowledge_base`!")
        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Database Import Error: {e}")

if __name__ == '__main__':
    import_csv_to_mysql()