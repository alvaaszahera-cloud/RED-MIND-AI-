from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS so frontend can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeRequest(BaseModel):
    code: str
    simulate_attack: bool

@app.post("/analyze")
def analyze_code(request: CodeRequest):
    code = request.code.lower()
    issues = []

    if "eval(" in code:
        issues.append({
            "type": "Code Injection",
            "severity": "High",
            "fix": "Avoid using eval(). Use safer alternatives."
        })

    if "password =" in code:
        issues.append({
            "type": "Hardcoded Password",
            "severity": "Medium",
            "fix": "Store passwords securely in environment variables."
        })

    if "select * from" in code:
        issues.append({
            "type": "SQL Injection Risk",
            "severity": "High",
            "fix": "Use parameterized queries."
        })

    if len(issues) == 0:
        risk_score = 10
    elif len(issues) == 1:
        risk_score = 50
    else:
        risk_score = 85

    attack_simulation = None
    if request.simulate_attack and issues:
        attack_simulation = "⚠️ Simulated Attack: An attacker could exploit these vulnerabilities to access sensitive data."

    return {
        "risk_score": risk_score,
        "issues": issues,
        "attack_simulation": attack_simulation
    }
app.mount("/", StaticFiles(directory="static", html=True), name="static")