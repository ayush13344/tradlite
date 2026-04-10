def get_recommendations(user_id: str):
    return {
        "userId": user_id,
        "recommendations": [
            {"symbol": "TCS", "reason": "Matches your preference for IT large-cap stocks"},
            {"symbol": "INFY", "reason": "Similar sector and volatility to your previous profitable trades"},
            {"symbol": "HDFCBANK", "reason": "Balances sector concentration and offers lower drawdown"}
        ]
    }