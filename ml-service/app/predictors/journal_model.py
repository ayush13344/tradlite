def get_journal_insights(user_id: str):
    return {
        "userId": user_id,
        "winRate": 61,
        "bestSector": "IT",
        "worstSector": "Crypto",
        "bestTradingWindow": "10:00 AM - 11:30 AM",
        "insights": [
            "Delivery trades perform better than short holding trades",
            "You lose more often when entering after sharp spikes",
            "Your banking trades have better risk-adjusted returns"
        ]
    }