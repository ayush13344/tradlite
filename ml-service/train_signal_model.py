import os
import joblib
import numpy as np
import pandas as pd
import yfinance as yf
 
 
# =========================================================
# CONFIG
# =========================================================
 
MODEL_PATH = os.path.join("models", "signal_model.pkl")
PERIOD = "6mo"
INTERVAL = "1d"
 
CRYPTO_SUFFIX_MAP = {
    "BTC": "BTC-USD",
    "ETH": "ETH-USD",
    "XRP": "XRP-USD",
    "SOL": "SOL-USD",
    "BNB": "BNB-USD",
    "DOGE": "DOGE-USD",
    "ADA": "ADA-USD",
    "MATIC": "MATIC-USD",
    "AVAX": "AVAX-USD",
    "DOT": "DOT-USD",
    "LINK": "LINK-USD",
    "TRX": "TRX-USD",
}
 
# Confidence threshold for unseen symbols (relaxed vs trained symbols)
UNSEEN_CONFIDENCE_THRESHOLD = 0.55
# Minimum data quality: max allowed null fraction across OHLCV columns
MAX_NULL_FRACTION = 0.10
# Maximum allowed fraction of zero-close rows
MAX_ZERO_CLOSE_FRACTION = 0.05
 
 
# =========================================================
# LOAD MODEL
# =========================================================
 
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"Trained model not found at: {os.path.abspath(MODEL_PATH)}"
    )
 
bundle = joblib.load(MODEL_PATH)
model = bundle["model"]
feature_cols = bundle["features"]
allowed_symbols = bundle.get("symbols", [])
confidence_threshold = bundle.get("confidence_threshold", 0.70)
 
 
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
 
 
def get_symbol_candidates(symbol: str) -> list[str]:
    """
    Generate possible Yahoo Finance ticker candidates automatically.
    For Indian stocks, always try .NS first, then .BO, then raw.
    """
    symbol = (symbol or "").upper().strip()
 
    if not symbol:
        return []
 
    # Crypto direct mapping
    if symbol in CRYPTO_SUFFIX_MAP:
        return [CRYPTO_SUFFIX_MAP[symbol]]
 
    candidates = []
 
    # If already a fully-qualified Yahoo symbol, use as-is first
    if (
        symbol.endswith(".NS")
        or symbol.endswith(".BO")
        or symbol.endswith("-USD")
        or "." in symbol
    ):
        candidates.append(symbol)
        base = symbol.split(".")[0].split("-")[0]
        if base and base not in candidates:
            candidates.append(base)
    else:
        # Unknown suffix: try NSE first, then BSE, then raw (handles US stocks)
        candidates.append(f"{symbol}.NS")
        candidates.append(f"{symbol}.BO")
        candidates.append(symbol)
 
    # Remove duplicates while preserving order
    seen = set()
    final_candidates = []
    for item in candidates:
        if item not in seen:
            seen.add(item)
            final_candidates.append(item)
 
    return final_candidates
 
 
def validate_data_quality(df: pd.DataFrame, yahoo_symbol: str) -> tuple[bool, str]:
    """
    Run data quality checks on raw OHLCV dataframe.
    Returns (is_valid, reason_if_invalid).
    """
    ohlcv_cols = ["open", "high", "low", "close", "volume"]
 
    null_pct = df[ohlcv_cols].isnull().mean().mean()
    if null_pct > MAX_NULL_FRACTION:
        return False, (
            f"Data quality too low for '{yahoo_symbol}': "
            f"{null_pct:.0%} of OHLCV values are null. "
            f"Symbol may be illiquid, newly listed, or delisted."
        )
 
    zero_close_pct = (df["close"] == 0).mean()
    if zero_close_pct > MAX_ZERO_CLOSE_FRACTION:
        return False, (
            f"Data quality too low for '{yahoo_symbol}': "
            f"{zero_close_pct:.0%} of close prices are zero. "
            f"Symbol may have stale or corrupt data."
        )
 
    for col in ["open", "high", "low", "close"]:
        if (df[col] < 0).any():
            return False, (
                f"Data quality issue: negative values found in '{col}' column "
                f"for '{yahoo_symbol}'. Skipping."
            )
 
    return True, ""
 
 
def _clean_and_validate_df(df: pd.DataFrame, yahoo_symbol: str) -> pd.DataFrame | None:
    """
    Shared post-download cleaning + validation logic.
    Returns cleaned DataFrame or None if unusable.
    """
    if df is None or df.empty:
        return None
 
    df = df.reset_index()
    df = standardize_ohlcv_columns(df)
 
    required = ["date", "open", "high", "low", "close", "volume"]
    if any(col not in df.columns for col in required):
        return None
 
    df = df[required].copy()
 
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
 
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df.dropna(subset=["date", "open", "high", "low", "close", "volume"], inplace=True)
    df.sort_values("date", inplace=True)
    df.reset_index(drop=True, inplace=True)
 
    if len(df) < 60:
        return None
 
    is_valid, _ = validate_data_quality(df, yahoo_symbol)
    if not is_valid:
        return None
 
    return df
 
 
def try_download_via_download(yahoo_symbol: str) -> pd.DataFrame | None:
    """
    Primary fetch strategy: yf.download().
    Works well for most US and crypto symbols.
    """
    try:
        df = yf.download(
            yahoo_symbol,
            period=PERIOD,
            interval=INTERVAL,
            auto_adjust=False,
            progress=False,
            group_by="column",
            threads=False,
        )
        return _clean_and_validate_df(df, yahoo_symbol)
    except Exception:
        return None
 
 
def try_download_via_ticker(yahoo_symbol: str) -> pd.DataFrame | None:
    """
    Fallback fetch strategy: yf.Ticker().history().
    More reliable for Indian (.NS / .BO) and some international symbols
    where yf.download() silently returns empty data.
    """
    try:
        ticker = yf.Ticker(yahoo_symbol)
        df = ticker.history(period=PERIOD, interval=INTERVAL, auto_adjust=False)
 
        if df is None or df.empty:
            return None
 
        # Ticker.history() returns index as Date — move it to a column
        df = df.reset_index()
 
        # Rename 'Date' or 'Datetime' index column to lowercase
        for col in df.columns:
            if col.lower() in ("date", "datetime"):
                df.rename(columns={col: "date"}, inplace=True)
                break
 
        return _clean_and_validate_df(df, yahoo_symbol)
    except Exception:
        return None
 
 
def try_download_symbol(yahoo_symbol: str) -> pd.DataFrame | None:
    """
    Try primary strategy (yf.download) first, fall back to Ticker-based fetch.
    This handles the silent-empty-DataFrame issue that affects
    Indian stocks (DLF.NS, RELIANCE.NS, etc.) with yf.download().
    """
    df = try_download_via_download(yahoo_symbol)
    if df is not None:
        return df
 
    # Fallback: yf.Ticker is often more reliable for non-US symbols
    df = try_download_via_ticker(yahoo_symbol)
    return df
 
 
def resolve_and_download_symbol(input_symbol: str):
    candidates = get_symbol_candidates(input_symbol)
 
    for yahoo_symbol in candidates:
        df = try_download_symbol(yahoo_symbol)
        if df is not None and not df.empty:
            return yahoo_symbol, df
 
    raise ValueError(
        f"No data found for symbol: '{input_symbol}'. "
        f"Tried Yahoo Finance tickers: {candidates}.\n"
        f"Possible reasons:\n"
        f"  - Symbol is not listed on NSE (.NS) or BSE (.BO)\n"
        f"  - Fewer than 60 trading days of history available\n"
        f"  - Symbol is delisted or suspended\n"
        f"  - Yahoo Finance temporarily unavailable — retry in a moment\n"
        f"Tip: Verify the correct ticker at https://finance.yahoo.com"
    )
 
 
def build_features(df: pd.DataFrame, symbol: str) -> pd.DataFrame:
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
        raise ValueError("Not enough rows after cleaning (need at least 60 trading days)")
 
    # RETURNS
    df["return_1"] = df["close"].pct_change(1)
    df["return_3"] = df["close"].pct_change(3)
    df["return_5"] = df["close"].pct_change(5)
    df["return_10"] = df["close"].pct_change(10)
    df["return_20"] = df["close"].pct_change(20)
 
    # MOVING AVERAGES
    df["sma_5"] = df["close"].rolling(5, min_periods=5).mean()
    df["sma_10"] = df["close"].rolling(10, min_periods=10).mean()
    df["sma_20"] = df["close"].rolling(20, min_periods=20).mean()
 
    df["ema_10"] = df["close"].ewm(span=10, adjust=False).mean()
    df["ema_20"] = df["close"].ewm(span=20, adjust=False).mean()
 
    # RATIOS
    df["price_vs_sma5"] = df["close"] / df["sma_5"].replace(0, np.nan)
    df["price_vs_sma10"] = df["close"] / df["sma_10"].replace(0, np.nan)
    df["price_vs_sma20"] = df["close"] / df["sma_20"].replace(0, np.nan)
    df["ema_ratio"] = df["ema_10"] / df["ema_20"].replace(0, np.nan)
    df["sma_ratio_5_20"] = df["sma_5"] / df["sma_20"].replace(0, np.nan)
 
    # MOMENTUM
    df["momentum_5"] = df["close"] - df["close"].shift(5)
    df["momentum_10"] = df["close"] - df["close"].shift(10)
 
    # VOLATILITY
    df["volatility_5"] = df["return_1"].rolling(5, min_periods=5).std()
    df["volatility_10"] = df["return_1"].rolling(10, min_periods=10).std()
    df["volatility_20"] = df["return_1"].rolling(20, min_periods=20).std()
    df["volatility_ratio"] = df["volatility_5"] / df["volatility_20"].replace(0, np.nan)
 
    # CANDLE FEATURES
    candle_range = (df["high"] - df["low"]).replace(0, np.nan)
    df["range_pct"] = (df["high"] - df["low"]) / df["close"].replace(0, np.nan)
    df["body_pct"] = (df["close"] - df["open"]) / df["open"].replace(0, np.nan)
    df["close_to_high"] = (df["close"] - df["low"]) / candle_range
    df["close_to_low"] = (df["high"] - df["close"]) / candle_range
 
    # VOLUME
    df["volume_sma_20"] = df["volume"].rolling(20, min_periods=20).mean()
    df["volume_ratio"] = df["volume"] / df["volume_sma_20"].replace(0, np.nan)
    df["volume_change"] = df["volume"].pct_change(1)
 
    # RSI
    delta = df["close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
 
    avg_gain = gain.rolling(14, min_periods=14).mean()
    avg_loss = loss.rolling(14, min_periods=14).mean()
 
    rs = avg_gain / avg_loss.replace(0, np.nan)
    df["rsi_14"] = 100 - (100 / (1 + rs))
 
    # STRONGER FEATURES
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
 
    if len(df) < 1:
        raise ValueError("No usable rows after feature engineering")
 
    return df
 
 
def generate_reasons(latest_row: pd.Series) -> list:
    reasons = []
 
    try:
        if latest_row["price_vs_sma20"] > 1:
            reasons.append("price is above 20-day moving average")
        else:
            reasons.append("price is below 20-day moving average")
 
        if latest_row["ema_10"] > latest_row["ema_20"]:
            reasons.append("short-term EMA is above long-term EMA")
        else:
            reasons.append("short-term EMA is below long-term EMA")
 
        if latest_row["rsi_14"] < 30:
            reasons.append("RSI indicates oversold condition")
        elif latest_row["rsi_14"] > 70:
            reasons.append("RSI indicates overbought condition")
        else:
            reasons.append("RSI is in neutral range")
 
        if latest_row["volume_ratio"] > 1.5:
            reasons.append("volume is significantly above average")
        elif latest_row["volume_ratio"] > 1.0:
            reasons.append("volume is above average")
        else:
            reasons.append("volume is not showing a strong spike")
 
        if int(latest_row["breakout_up"]) == 1:
            reasons.append("price is attempting an upside breakout")
 
        if int(latest_row["breakout_down"]) == 1:
            reasons.append("price is showing downside breakdown risk")
    except Exception:
        reasons.append("technical indicators generated")
 
    return reasons[:5]
 
 
# =========================================================
# MAIN FUNCTION
# =========================================================
 
def get_signal_prediction(symbol: str):
    symbol = (symbol or "").upper().strip()
 
    if not symbol:
        return {
            "success": False,
            "error": "Symbol is required"
        }
 
    try:
        # ── Step 1: Resolve & download ──────────────────────────────────────
        resolved_symbol, raw_df = resolve_and_download_symbol(symbol)
 
        # ── Step 2: Data quality gate before feature engineering ────────────
        is_valid, quality_reason = validate_data_quality(raw_df, resolved_symbol)
        if not is_valid:
            return {
                "success": False,
                "symbol": symbol,
                "yahoo_symbol": resolved_symbol,
                "error": quality_reason,
            }
 
        # ── Step 3: Feature engineering ─────────────────────────────────────
        feat_df = build_features(raw_df, symbol)
        latest = feat_df.iloc[-1].copy()
 
        # ── Step 4: Feature column check ────────────────────────────────────
        missing_features = [col for col in feature_cols if col not in feat_df.columns]
        if missing_features:
            return {
                "success": False,
                "symbol": symbol,
                "yahoo_symbol": resolved_symbol,
                "error": f"Missing required model features: {missing_features}. "
                         f"Re-train the model or check feature engineering pipeline."
            }
 
        # ── Step 5: Build input row ──────────────────────────────────────────
        X_input = pd.DataFrame([latest[feature_cols]], columns=feature_cols)
        X_input.replace([np.inf, -np.inf], np.nan, inplace=True)
 
        if X_input.isna().any().any():
            nan_cols = X_input.columns[X_input.isna().any()].tolist()
            return {
                "success": False,
                "symbol": symbol,
                "yahoo_symbol": resolved_symbol,
                "error": "Latest feature row contains NaN values — cannot predict.",
                "nan_features": nan_cols,
                "hint": (
                    "This usually means the symbol has too little history for rolling "
                    "windows (e.g. SMA-20, volatility-20). Try a symbol with more data."
                ),
            }
 
        # ── Step 6: Predict with adaptive threshold ──────────────────────────
        seen_in_training = symbol in allowed_symbols
        effective_threshold = confidence_threshold if seen_in_training else UNSEEN_CONFIDENCE_THRESHOLD
 
        prob = float(model.predict_proba(X_input)[0][1])
        signal = "BUY" if prob >= effective_threshold else "SELL"
 
        # ── Step 7: Return rich response ────────────────────────────────────
        return {
            "success": True,
            "symbol": symbol,
            "yahoo_symbol": resolved_symbol,
            "signal": signal,
            "confidence": round(prob * 100, 2),
            "probability_up": round(prob * 100, 2),
            "threshold_used": round(effective_threshold * 100, 2),
            "price": round(float(latest["close"]), 4),
            "date": str(pd.to_datetime(latest["date"]).date()),
            "seen_in_training": seen_in_training,
            "note": (
                "Trained symbol — prediction is well-calibrated."
                if seen_in_training
                else (
                    f"Unseen symbol — model is generalizing. "
                    f"Relaxed threshold ({UNSEEN_CONFIDENCE_THRESHOLD:.0%}) applied. "
                    f"Treat signal with additional caution."
                )
            ),
            "reasons": generate_reasons(latest),
            "indicators": {
                "return_1": round(float(latest["return_1"]), 6),
                "return_5": round(float(latest["return_5"]), 6),
                "return_20": round(float(latest["return_20"]), 6),
                "rsi_14": round(float(latest["rsi_14"]), 2),
                "ema_10": round(float(latest["ema_10"]), 4),
                "ema_20": round(float(latest["ema_20"]), 4),
                "volume_ratio": round(float(latest["volume_ratio"]), 4),
                "trend_strength": round(float(latest["trend_strength"]), 4),
                "price_vs_sma20": round(float(latest["price_vs_sma20"]), 4),
                "volatility_20": round(float(latest["volatility_20"]), 6),
                "breakout_up": int(latest["breakout_up"]),
                "breakout_down": int(latest["breakout_down"]),
                "volume_spike": int(latest["volume_spike"]),
            },
        }
 
    except ValueError as ve:
        return {
            "success": False,
            "symbol": symbol,
            "error": str(ve),
        }
 
    except Exception as e:
        return {
            "success": False,
            "symbol": symbol,
            "error": "Prediction failed due to an unexpected error.",
            "details": str(e),
        }