import random

def get_price_prediction(symbol: str):
    current_price = round(random.uniform(100, 3000), 2)
    predicted_price = round(current_price * random.uniform(0.97, 1.06), 2)

    direction = "UP" if predicted_price > current_price else "DOWN"

    return {
        "symbol": symbol.upper(),
        "currentPrice": current_price,
        "predictedPrice": predicted_price,
        "direction": direction,
        "confidence": round(random.uniform(0.55, 0.88), 2),
        "timeframe": "Next 1 day"
    }