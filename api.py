import io
import base64
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

# Initialize FastAPI
app = FastAPI(title="YOLOv8 Ingredient Detector API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Configuration ===
# Placeholder for your YOLOv8 model path (.pt file)
# Example: r'C:\Users\user\Desktop\spinach.v11i.yolov8\runs\detect\train3\weights\best.pt'
MODEL_PATH = r'c:\Users\user\Desktop\spinach.v11i.yolov8\runs\detect\train3\weights\best.pt'

# Global model variable
model = None

def load_model():
    """Lazy load the model to avoid startup errors if path is missing."""
    global model
    if model is None and MODEL_PATH != 'YOUR_MODEL_PATH_HERE':
        try:
            model = YOLO(MODEL_PATH)
            print(f"Model loaded successfully from {MODEL_PATH}")
        except Exception as e:
            print(f"Error loading model: {e}")
    return model

# === Mock Recipe Database (Taiwan/Asian Cuisine Focus) ===
RECIPE_DB = {
    "tomato": {
        "name": "番茄炒蛋",
        "description": "經典家常菜，營養豐富且製作快速。",
        "steps": ["番茄切塊", "雞蛋打散", "熱鍋炒蛋", "加入番茄翻炒"],
        "matches": ["egg"]
    },
    "spinach": {
        "name": "蒜炒菠菜",
        "description": "簡單清脆的經典綠葉菜做法。",
        "steps": ["菠菜洗淨", "蒜末爆香", "大火快炒"],
        "matches": ["garlic"]
    }
}

class DetectionRequest(BaseModel):
    image: str  # Base64 encoded image string

@app.get("/")
def health_check():
    return {"status": "ok", "model_loaded": load_model() is not None}

@app.post("/detect")
async def detect(request: DetectionRequest):
    detector = load_model()
    if not detector:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Decode Base64 image
        encoded = request.image.split(",", 1)[1] if "," in request.image else request.image
        img_data = base64.b64decode(encoded)
        img = Image.open(io.BytesIO(img_data)).convert("RGB")
        
        # Run Inference
        results = detector(img, verbose=False)
        
        # Extract detections & deduplicate
        detected_names = set()
        for r in results:
            for box in r.boxes:
                detected_names.add(detector.names[int(box.cls[0])])
        
        # Build Response
        detections = [{"name": name} for name in detected_names]
        
        # Get recommended recipes based on detections
        recommended = []
        for name in detected_names:
            if name.lower() in RECIPE_DB:
                recommended.append(RECIPE_DB[name.lower()])

        return {
            "detections": detections,
            "recipes": recommended,
            "summary": f"偵測到 {len(detected_names)} 種食材，推薦 {len(recommended)} 個食譜"
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/recommend-recipes")
async def recommend_recipes(ingredients: dict):
    # If the frontend sends a list, we should probably wrap it or change the signature
    # But for now, let's assume it's a dict or update it to handle the list properly.
    items = ingredients.get("ingredients", [])
    return [
        {
            "id": "rec_001",
            "name": "全能型食材濃湯",
            "match_score": 85,
            "description": "運用現有辨識食材合成的高營養湯品。",
            "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=800",
            "time": "20 min"
        },
        {
            "id": "rec_002",
            "name": "感測器推薦：清炒食蔬",
            "match_score": 92,
            "description": "保留食材原始資料與口感的最佳烹飪協議。",
            "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800",
            "time": "15 min"
        }
    ]

from google import genai
import json

# === AI 服務安全介面 (Neural Link Protocol) ===
def call_ai_service(ingredients: list, api_key: str):
    """
    使用 Google GenAI SDK (新版) 生成食譜。
    """
    try:
        # 初始化新版 Client
        client = genai.Client(api_key=api_key)
        
        import time
        prompt = f"""
        [角色任務]
        你是一位冷靜、精準且高效的「直覺系主廚」。
        當前執行時間戳記: {time.time()} (請確保每次生成的創意組合都有所不同)
        
        [背景資訊]
        根據食材清單提供實用方案。
        食材清單: {', '.join(ingredients)}
        
        [具體指令]
        請嚴格生成 3 道料理且必須包裝在 JSON 數組中，結構如下：
        [
            {{
                "id": "chef_logic_1",
                "name": "[純粹類] 料理名稱",
                "matchScore": 95,
                "description": "食材速報：列出食材與比例。",
                "steps": [
                    {{"title": "準備", "description": "描述步驟"}},
                    {{"title": "執行", "description": "描述步驟"}}
                ],
                "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=800",
                "time": "15 MIN",
                "difficulty": "EASY",
                "category": "vegetable",
                "requiredIngredients": ["食材1"]
            }}
        ]
        
        [約束條件]
        1. 每個料理必須包含 3-5 個 "steps"，每個 step 的 description 不超過 20 字。
        2. 禁止廢話：嚴禁情緒化助詞、寒暄或原理說明。
        3. 字數限制：總回覆 JSON 內容控制在 400 中文字內。
        4. 語言：繁體中文。
        5. 僅輸出 JSON 數據，不帶 Markdown 標記。
        """
        
        # 使用新版 SDK 呼叫
        response = client.models.generate_content(
            model='gemini-flash-latest',
            contents=prompt
        )
        
        # 獲取回傳內容
        content = response.text.strip()
        
        # 清洗內容：使用正則表達式尋找 JSON 數組 (Robust extraction)
        import re
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            content = json_match.group(0)
        
        return json.loads(content)
        
    except Exception as e:
        import traceback
        print("--- Gemini API Error Details ---")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        traceback.print_exc()
        print("--------------------------------")
        return None

@app.post("/api/generate-recipe")
async def generate_recipe(data: dict):
    # 安全載入：從環境變數讀取 OPENAI_API_KEY (實際上是 Gemini Key)
    api_key = os.getenv('OPENAI_API_KEY') or os.getenv('VITE_LLM_API_KEY')
    
    # 錯誤處理：若金鑰缺失
    if not api_key:
        raise HTTPException(
            status_code=500, 
            detail="系統環境配置錯誤 (Neural Link Authentication Failed)"
        )
    
    # 接收前端轉傳的「已勾選食材」
    selected_ingredients = data.get("selected_ingredients", [])
    
    if not selected_ingredients:
        raise HTTPException(status_code=400, detail="未偵測到選中食材")

    # 呼叫真實 AI 服務 (Call real AI service)
    recipes = call_ai_service(selected_ingredients, api_key)
    
    if recipes:
        print(f"✅ 成功生成 {len(recipes)} 個食譜")
        return recipes
    
    # 如果 AI 失敗，回傳備份數據 (Fallback to mock if AI fails)
    print("⚠️ 呼叫 AI 失敗，使用系統備份協議回傳")
    return [
        {
            "id": f"fallback_{abs(hash(str(selected_ingredients)))}",
            "name": "核心協議：全能型食材濃湯",
            "matchScore": 85,
            "description": "系統目前處於離線快取模式，提供基礎營養方案。",
            "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=800",
            "time": "25 MIN",
            "difficulty": "MEDIUM",
            "category": "mixed",
            "requiredIngredients": selected_ingredients
        }
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
