import random

def get_sentiment_result(symbol: str):
    sentiment = random.choice(["POSITIVE", "NEGATIVE", "NEUTRAL"])
    score = round(random.uniform(0.40, 0.93), 2)

    return {
        "symbol": symbol.upper(),
        "sentiment": sentiment,
        "score": score,
        "headlineSummary": [
            "Recent coverage suggests stable outlook",
            "Market participants remain cautious",
            "Momentum in sentiment improved slightly"
        ]
    }