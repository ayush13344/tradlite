import os
import joblib
import numpy as np
import pandas as pd
import yfinance as yf


# =========================================================
# PATHS
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "signal_model.pkl")


# =========================================================
# SYMBOL MAP
# =========================================================

SYMBOL_MAP = {
    "TCS": "TCS.NS",
    "INFY": "INFY.NS",
    "RELIANCE": "RELIANCE.NS",
    "HDFCBANK": "HDFCBANK.NS",
    "ICICIBANK": "ICICIBANK.NS",
    "BTC": "BTC-USD",
    "ETH": "ETH-USD",
    "XRP": "XRP-USD",
}


# =========================================================
# LOAD MODEL
# =========================================================

_bundle = None


def load_model_bundle():
    global _bundle
    if _bundle is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model not found at: {MODEL_PATH}")
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


# =========================================================
# HELPERS
# =========================================================

def flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    if isinstance(df.columns, pd.MultiIndex):
        flat_cols = []
        for col in df.columns:
            parts = [str(x).strip() for x in col if str(x).strip() and str(x) != "None"]
            flat_cols.append("_".join(parts).lower())
        df.columns = flat_cols
    else:
        df.columns = [str(col).strip().lower() for col in df.columns]

    return df


def standardize_ohlcv_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = flatten_columns(df)

    rename_map = {}

    for col in df.columns:
        c = col.lower().strip()

        if c in ["date", "datetime", "timestamp", "time", "index"]:
            rename_map[col] = "date"
        elif c.startswith("open"):
            rename_map[col] = "open"
        elif c.startswith("high"):
            rename_map[col] = "high"
        elif c.startswith("low"):
            rename_map[col] = "low"
        elif c.startswith("close") or c in ["adj close", "adj_close", "price"]:
            rename_map[col] = "close"
        elif c.startswith("volume"):
            rename_map[col] = "volume"

    df = df.rename(columns=rename_map)
    df = df.loc[:, ~df.columns.duplicated()].copy()

    return df


def fetch_symbol_data(symbol: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
    yahoo_symbol = SYMBOL_MAP.get(symbol.upper(), symbol)

    df = yf.download(
        yahoo_symbol,
        period=period,
        interval=interval,
        auto_adjust=False,
        progress=False,
        group_by="column",
        threads=False,
    )

    if df is None or df.empty:
        raise ValueError(f"No data found for symbol: {symbol}")

    df = df.reset_index()
    df = standardize_ohlcv_columns(df)

    required = ["date", "open", "high", "low", "close", "volume"]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Downloaded data missing columns: {missing}")

    df = df[required].copy()

    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df.dropna(subset=["date", "open", "high", "low", "close", "volume"], inplace=True)
    df.sort_values("date", inplace=True)
    df.reset_index(drop=True, inplace=True)

    if len(df) < 60:
        raise ValueError("Not enough candles to build features")

    return df


def build_features(df: pd.DataFrame, symbol: str = "UNKNOWN") -> pd.DataFrame:
    df = df.copy()

    required_cols = ["date", "open", "high", "low", "close", "volume"]
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df.dropna(subset=["date", "open", "high", "low", "close", "volume"], inplace=True)
    df.sort_values("date", inplace=True)
    df.reset_index(drop=True, inplace=True)

    if len(df) < 60:
        raise ValueError("Not enough rows after cleaning")

    df["return_1"] = df["close"].pct_change(1)
    df["return_3"] = df["close"].pct_change(3)
    df["return_5"] = df["close"].pct_change(5)
    df["return_10"] = df["close"].pct_change(10)
    df["return_20"] = df["close"].pct_change(20)

    df["sma_5"] = df["close"].rolling(5, min_periods=5).mean()
    df["sma_10"] = df["close"].rolling(10, min_periods=10).mean()
    df["sma_20"] = df["close"].rolling(20, min_periods=20).mean()

    df["ema_10"] = df["close"].ewm(span=10, adjust=False).mean()
    df["ema_20"] = df["close"].ewm(span=20, adjust=False).mean()

    df["price_vs_sma5"] = df["close"] / df["sma_5"].replace(0, np.nan)
    df["price_vs_sma10"] = df["close"] / df["sma_10"].replace(0, np.nan)
    df["price_vs_sma20"] = df["close"] / df["sma_20"].replace(0, np.nan)

    df["ema_ratio"] = df["ema_10"] / df["ema_20"].replace(0, np.nan)
    df["sma_ratio_5_20"] = df["sma_5"] / df["sma_20"].replace(0, np.nan)

    df["momentum_5"] = df["close"] - df["close"].shift(5)
    df["momentum_10"] = df["close"] - df["close"].shift(10)

    df["volatility_5"] = df["return_1"].rolling(5, min_periods=5).std()
    df["volatility_10"] = df["return_1"].rolling(10, min_periods=10).std()
    df["volatility_20"] = df["return_1"].rolling(20, min_periods=20).std()

    df["volatility_ratio"] = df["volatility_5"] / df["volatility_20"].replace(0, np.nan)

    candle_range = (df["high"] - df["low"]).replace(0, np.nan)
    df["range_pct"] = (df["high"] - df["low"]) / df["close"].replace(0, np.nan)
    df["body_pct"] = (df["close"] - df["open"]) / df["open"].replace(0, np.nan)
    df["close_to_high"] = (df["close"] - df["low"]) / candle_range
    df["close_to_low"] = (df["high"] - df["close"]) / candle_range

    df["volume_sma_20"] = df["volume"].rolling(20, min_periods=20).mean()
    df["volume_ratio"] = df["volume"] / df["volume_sma_20"].replace(0, np.nan)
    df["volume_change"] = df["volume"].pct_change(1)

    delta = df["close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(14, min_periods=14).mean()
    avg_loss = loss.rolling(14, min_periods=14).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    df["rsi_14"] = 100 - (100 / (1 + rs))

    df["trend_strength"] = df["ema_10"] - df["ema_20"]
    df["volume_spike"] = (df["volume"] > (1.5 * df["volume_sma_20"])).astype(int)

    df["high_20"] = df["high"].rolling(20, min_periods=20).max()
    df["low_20"] = df["low"].rolling(20, min_periods=20).min()

    df["breakout_up"] = (df["close"] > df["high_20"].shift(1)).astype(int)
    df["breakout_down"] = (df["close"] < df["low_20"].shift(1)).astype(int)

    df["rsi_overbought"] = (df["rsi_14"] > 70).astype(int)
    df["rsi_oversold"] = (df["rsi_14"] < 30).astype(int)

    df["volume_return_interaction"] = df["return_1"] * df["volume_ratio"]

    df["symbol"] = symbol

    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.dropna(inplace=True)
    df.reset_index(drop=True, inplace=True)

    if len(df) == 0:
        raise ValueError("No usable rows after feature engineering")

    return df


def build_reason(latest_row: pd.Series, signal: str) -> list[str]:
    reasons = []

    if latest_row.get("trend_strength", 0) > 0:
        reasons.append("short-term trend is above medium-term trend")
    if latest_row.get("volume_spike", 0) == 1:
        reasons.append("volume spike detected")
    if latest_row.get("breakout_up", 0) == 1:
        reasons.append("upside breakout detected")
    if latest_row.get("breakout_down", 0) == 1:
        reasons.append("downside breakout detected")
    if latest_row.get("rsi_oversold", 0) == 1:
        reasons.append("RSI is in oversold zone")
    if latest_row.get("rsi_overbought", 0) == 1:
        reasons.append("RSI is in overbought zone")
    if latest_row.get("price_vs_sma20", 1) > 1:
        reasons.append("price is above 20-day moving average")
    if latest_row.get("price_vs_sma20", 1) < 1:
        reasons.append("price is below 20-day moving average")

    if not reasons:
        if signal == "BUY":
            reasons.append("model probability is above threshold")
        elif signal == "SELL":
            reasons.append("model probability is below threshold")
        else:
            reasons.append("signal is not strong enough")

    return reasons[:3]


# =========================================================
# MAIN PREDICT FUNCTION
# =========================================================

def get_signal_prediction(symbol: str):
    bundle = load_model_bundle()
    model = bundle["model"]
    feature_cols = bundle["features"]
    confidence_threshold = float(bundle.get("confidence_threshold", 0.70))

    raw_df = fetch_symbol_data(symbol)
    feat_df = build_features(raw_df, symbol.upper())

    latest = feat_df.iloc[-1:].copy()
    latest_row = latest.iloc[0]

    X_latest = latest[feature_cols].copy()
    X_latest.replace([np.inf, -np.inf], np.nan, inplace=True)

    if X_latest.isna().any().any():
        raise ValueError("Latest feature row contains NaN values")

    prob_up = float(model.predict_proba(X_latest)[0][1])

    if prob_up >= confidence_threshold:
        signal = "BUY"
    elif prob_up <= (1.0 - confidence_threshold):
        signal = "SELL"
    else:
        signal = "HOLD"

    confidence = prob_up if signal == "BUY" else (1.0 - prob_up if signal == "SELL" else abs(prob_up - 0.5) * 2)

    return {
        "symbol": symbol.upper(),
        "signal": signal,
        "confidence": round(confidence * 100, 2),
        "probability_up": round(prob_up * 100, 2),
        "threshold": round(confidence_threshold * 100, 2),
        "price": round(float(raw_df.iloc[-1]["close"]), 4),
        "date": str(pd.to_datetime(raw_df.iloc[-1]["date"]).date()),
        "reasons": build_reason(latest_row, signal),
        "indicators": {
            "rsi_14": round(float(latest_row["rsi_14"]), 2),
            "ema_10": round(float(latest_row["ema_10"]), 4),
            "ema_20": round(float(latest_row["ema_20"]), 4),
            "volume_ratio": round(float(latest_row["volume_ratio"]), 4),
            "trend_strength": round(float(latest_row["trend_strength"]), 4),
            "price_vs_sma20": round(float(latest_row["price_vs_sma20"]), 4),
        },
    }