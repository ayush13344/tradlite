import random

def get_risk_score(symbol: str):
    score = random.randint(25, 90)

    label = "LOW" if score < 35 else "MEDIUM" if score < 70 else "HIGH"

    return {
        "symbol": symbol.upper(),
        "riskScore": score,
        "riskLabel": label,
        "stopLossSuggestion": round(random.uniform(90, 200), 2),
        "targetSuggestion": round(random.uniform(210, 350), 2),
        "volatility": round(random.uniform(1.5, 6.8), 2)
    }