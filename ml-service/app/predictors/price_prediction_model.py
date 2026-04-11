import os
import joblib
import numpy as np
import pandas as pd
import yfinance as yf

print("=== REAL PRICE MODEL FILE LOADED ===")

MODEL_PATH = os.path.join("models", "price_model.pkl")


def compute_rsi(series, period=14):
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    loss = loss.replace(0, np.nan)
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def build_features(df):
    df = df.copy()

    df["return_1d"] = df["Close"].pct_change(1)
    df["return_3d"] = df["Close"].pct_change(3)
    df["return_5d"] = df["Close"].pct_change(5)

    df["sma_5"] = df["Close"].rolling(5).mean()
    df["sma_10"] = df["Close"].rolling(10).mean()
    df["ema_10"] = df["Close"].ewm(span=10, adjust=False).mean()
    df["ema_20"] = df["Close"].ewm(span=20, adjust=False).mean()

    df["volatility_5"] = df["Close"].pct_change().rolling(5).std()
    df["volume_change"] = df["Volume"].pct_change()
    df["high_low_range"] = (df["High"] - df["Low"]) / df["Close"].replace(0, np.nan)
    df["rsi_14"] = compute_rsi(df["Close"], 14)

    return df


def normalize_columns(df):
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]
    return df


def get_price_prediction(symbol: str):
    print("=== REAL get_price_prediction CALLED ===", symbol)

    symbol = str(symbol or "").strip().upper()
    if not symbol:
        return {
            "success": False,
            "symbol": symbol,
            "error": "Symbol is required",
            "source": "REAL_MODEL_FILE"
        }

    if not os.path.exists(MODEL_PATH):
        return {
            "success": False,
            "symbol": symbol,
            "error": f"Model file not found at {MODEL_PATH}",
            "source": "REAL_MODEL_FILE"
        }

    try:
        bundle = joblib.load(MODEL_PATH)
        model = bundle["model"]
        feature_cols = bundle["features"]

        yahoo_symbol = f"{symbol}.NS"
        df = yf.download(yahoo_symbol, period="6mo", interval="1d", auto_adjust=False)

        if df.empty or len(df) < 30:
            return {
                "success": False,
                "symbol": symbol,
                "yahoo_symbol": yahoo_symbol,
                "error": "Not enough historical data for prediction",
                "source": "REAL_MODEL_FILE"
            }

        df = df.reset_index()
        df = normalize_columns(df)

        required_cols = ["Date", "Open", "High", "Low", "Close", "Volume"]
        for col in required_cols:
            if col not in df.columns:
                return {
                    "success": False,
                    "symbol": symbol,
                    "error": f"Missing required column: {col}",
                    "source": "REAL_MODEL_FILE"
                }

        df = df[required_cols].copy()

        for col in ["Open", "High", "Low", "Close", "Volume"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        df = build_features(df)
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        df.dropna(inplace=True)

        if df.empty:
            return {
                "success": False,
                "symbol": symbol,
                "error": "Failed to build features for prediction",
                "source": "REAL_MODEL_FILE"
            }

        latest = df.iloc[-1]
        X_latest = pd.DataFrame([latest[feature_cols].to_dict()]).astype("float64")

        predicted_price = float(model.predict(X_latest)[0])
        current_price = float(latest["Close"])
        change_percent = ((predicted_price - current_price) / current_price) * 100

        return {
            "success": True,
            "symbol": symbol,
            "yahoo_symbol": yahoo_symbol,
            "current_price": round(current_price, 2),
            "predicted_price": round(predicted_price, 2),
            "change_percent": round(change_percent, 2),
            "trend": "UP" if predicted_price > current_price else "DOWN",
            "confidence": None,
            "date": str(latest["Date"]).split(" ")[0],
            "target": bundle.get("target"),
            "model_metrics": bundle.get("metrics", {}),
            "source": "REAL_MODEL_FILE"
        }

    except Exception as e:
        return {
            "success": False,
            "symbol": symbol,
            "error": "Price prediction failed",
            "details": str(e),
            "source": "REAL_MODEL_FILE"
        }