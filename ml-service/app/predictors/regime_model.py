import random

def get_market_regime(symbol: str):
    regime = random.choice(["BULLISH", "BEARISH", "SIDEWAYS", "HIGH_VOLATILITY"])

    return {
        "symbol": symbol.upper(),
        "regime": regime,
        "confidence": round(random.uniform(0.60, 0.92), 2)
    }