from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from vision_engine import identify_drug_from_image

app = FastAPI(title="PharmaPulse Free Gemini AI Vision Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/scan-packaging")
async def scan_packaging(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        result = identify_drug_from_image(image_bytes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)