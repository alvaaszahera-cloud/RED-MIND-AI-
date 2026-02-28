import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "redmind.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class User(BaseModel):
    username: str
    password: str

class CodeInput(BaseModel):
    code: str
    simulate_attack: bool = False

@app.post("/signup")
async def signup(user: User):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (user.username, user.password))
        conn.commit()
        return {"message": "User created successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")
    finally:
        conn.close()

@app.post("/login")
async def login(user: User):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ? AND password = ?", (user.username, user.password))
    result = cursor.fetchone()
    conn.close()
    if result:
        return {"message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

def run_rule_based_analysis(code: str) -> Dict:
    issues = []
    score = "Low"
    
    if "eval(" in code:
        issues.append({"type": "Security", "message": "Usage of eval() detected, which is highly insecure."})
        score = "High"
    if "password =" in code or "password=" in code:
         issues.append({"type": "Security", "message": "Hardcoded password detected."})
         if score != "High": score = "Medium"
    if "SELECT" in code.upper() and ("+" in code or "%" in code):
        issues.append({"type": "Security", "message": "Potential SQL Injection pattern detected."})
        score = "High"
    if "while True" in code or "while(true)" in code.replace(" ", ""):
        issues.append({"type": "Performance", "message": "Infinite loop pattern detected."})
        if score != "High": score = "Medium"
    
    return {"risk_score": score, "issues": issues}

def analyze_with_ai(code: str, issues: List[Dict]):
    suggestions = []
    optimized_code = code

    # Generate dynamic suggestions based on detected issues
    for issue in issues:
        if "eval()" in issue["message"]:
            suggestions.append("Prevention: Never use eval() with untrusted input. Use safer alternatives like ast.literal_eval() or built-in functions.")
            optimized_code = optimized_code.replace("eval(", "ast.literal_eval(") # Basic naive replacement for demonstration
            
        elif "Hardcoded password" in issue["message"]:
            suggestions.append("Prevention: Store secrets in environment variables (.env files) or secure vaults instead of plaintext code.")
            optimized_code = optimized_code.replace("password = ", "password = os.getenv('DB_PASSWORD') ")
            optimized_code = optimized_code.replace("password=", "password=os.getenv('DB_PASSWORD')")
            
        elif "SQL Injection" in issue["message"]:
            suggestions.append("Prevention: Always use parameterized queries or Prepared Statements. Never concatenate strings to build SQL.")
            # Naive string replacement to simulate parameterization
            optimized_code = optimized_code.replace(" + ", ", ")
            optimized_code = optimized_code.replace(" % ", ", ")
            
        elif "Infinite loop" in issue["message"]:
            suggestions.append("Prevention: Ensure while loops have a clear break condition to avoid locking up application resources.")

    if not suggestions:
        suggestions.append("Code looks structurally sound based on basic heuristic rules. No immediate AI preventions needed.")

    # Add comments to the top of the optimized code block
    final_output = "# AI Suggested Secure/Optimized Code:\n"
    if "ast.literal_eval" in optimized_code or "os.getenv" in optimized_code:
        final_output += "import os\nimport ast\n"
    final_output += optimized_code

    return {
        "optimized_code": final_output,
        "suggestions": suggestions
    }

@app.post("/analyze")
async def analyze_code(input_data: CodeInput):
    analysis = run_rule_based_analysis(input_data.code)
    ai_results = analyze_with_ai(input_data.code, analysis["issues"])
    
    response = {
        "risk_score": analysis["risk_score"],
        "issues": analysis["issues"],
        "ai_optimized_code": ai_results["optimized_code"],
        "ai_suggestions": ai_results["suggestions"]
    }
    
    if input_data.simulate_attack:
        response["attack_simulation"] = "Simulated Attack Log:\n[!] Attempting SQL injection payload ' OR 1=1 --\n"
        if "High" in analysis["risk_score"]:
            response["attack_simulation"] += "[CRITICAL] Attack successful due to detected vulnerabilities!"
        else:
            response["attack_simulation"] += "[INFO] Attack failed. Code appears safe against basic payloads."
            
    return response

# Serve frontend statically in production, but for now we separate them.
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
