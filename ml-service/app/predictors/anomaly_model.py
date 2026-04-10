import random

def get_anomaly_result(symbol: str):
    is_anomaly = random.choice([True, False])

    return {
        "symbol": symbol.upper(),
        "anomalyDetected": is_anomaly,
        "reason": "Unusual volume spike compared to last 20 sessions" if is_anomaly else "No major anomaly detected"
    }