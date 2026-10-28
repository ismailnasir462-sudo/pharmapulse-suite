import requests
from bs4 import BeautifulSoup
import pandas as pd

url = "https://fdaghana.gov.gh/drug-and-nutraceuticals-smp/"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

print("Fetching FDA Ghana registered products database...")

try:
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()

    # Parse HTML table using lxml
    tables = pd.read_html(response.text, flavor='lxml')

    if tables:
        df = tables[0]
        output_file = "scripts/fda_ghana_registered_drugs.csv"
        df.to_csv(output_file, index=False)
        print(f"✅ Successfully exported {len(df)} records to {output_file}!")
    else:
        print("❌ No HTML table found on page.")

except Exception as e:
    print(f"❌ Scraping failed: {e}")