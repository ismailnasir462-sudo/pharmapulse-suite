import os
import json
import base64
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Initialize OpenAI Client pointing to DeepSeek's API Base URL
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

def identify_drug_from_image(image_bytes: bytes) -> dict:
    """Sends image bytes to DeepSeek API via OpenAI-compatible SDK to extract drug details."""
    try:
        # Convert raw image bytes to Base64 string
        base64_image = base64.b64encode(image_bytes).decode('utf-8')

        prompt = """
        You are a clinical pharmacy vision assistant. 
        Examine this drug packaging, blister pack, bottle, or medication photo carefully.
        Extract the medication brand name, generic name, strength, dosage form, active ingredient, manufacturer, batch number, and expiration date.

        Return strict JSON format ONLY using this structure:
        {
          "brand_name": "Extracted brand/trade name or null",
          "generic_name": "Active chemical composition or null",
          "strength": "Dosage strength (e.g. 500mg, 80mg/480mg) or null",
          "dosage_form": "Tablet, Capsule, Syrup, Suspension, etc. or null",
          "active_ingredient": "Main active pharmaceutical ingredient or null",
          "manufacturer": "Manufacturing company or null",
          "batch_number": "Lot/Batch number or null",
          "expiry_date": "Expiration date (YYYY-MM-DD or MM/YYYY) or null"
        }

        Do NOT include markdown block backticks or any conversation text outside the valid JSON object.
        """

        # Call DeepSeek Flash model (supports multimodal vision and fast JSON extraction)
        response = client.chat.completions.create(
            model="deepseek-flash",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.1
        )

        raw_content = response.choices[0].message.content.strip()
        
        # Clean response string if backticks exist
        clean_json_str = raw_content.replace('```json', '').replace('```', '').strip()
        extracted_data = json.loads(clean_json_str)

        return {
            "success": True,
            "data": extracted_data
        }

    except Exception as e:
        print(f"DeepSeek API Processing Error: {e}")
        return {
            "success": False,
            "message": f"DeepSeek Packaging Recognition failed: {str(e)}"
        }