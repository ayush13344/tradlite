import numpy as np
import pandas as pd


def add_returns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["return_1"] = df["close"].pct_change(1)
    df["return_3"] = df["close"].pct_change(3)
    df["return_5"] = df["close"].pct_change(5)
    return df


def add_sma(df: pd.DataFrame, period: int) -> pd.DataFrame:
    df = df.copy()
    df[f"sma_{period}"] = df["close"].rolling(period).mean()
    return df


def add_ema(df: pd.DataFrame, period: int) -> pd.DataFrame:
    df = df.copy()
    df[f"ema_{period}"] = df["close"].ewm(span=period, adjust=False).mean()
    return df


def add_rsi(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
    df = df.copy()
    delta = df["close"].diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    df["rsi"] = 100 - (100 / (1 + rs))
    df["rsi"] = df["rsi"].fillna(50)

    return df


def add_macd(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    ema_12 = df["close"].ewm(span=12, adjust=False).mean()
    ema_26 = df["close"].ewm(span=26, adjust=False).mean()

    df["macd"] = ema_12 - ema_26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"] = df["macd"] - df["macd_signal"]

    return df


def add_volatility(df: pd.DataFrame, period: int = 10) -> pd.DataFrame:
    df = df.copy()
    df["volatility_10"] = df["return_1"].rolling(period).std()
    return df


def add_volume_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["volume_change_1"] = df["volume"].pct_change(1)
    df["volume_sma_10"] = df["volume"].rolling(10).mean()
    df["volume_ratio"] = df["volume"] / df["volume_sma_10"]
    return df


def add_price_position_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["high_low_range"] = (df["high"] - df["low"]) / df["close"].replace(0, np.nan)
    df["close_open_gap"] = (df["close"] - df["open"]) / df["open"].replace(0, np.nan)
    return df


def add_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df = add_returns(df)
    df = add_sma(df, 10)
    df = add_sma(df, 20)
    df = add_ema(df, 12)
    df = add_ema(df, 26)
    df = add_rsi(df, 14)
    df = add_macd(df)
    df = add_volatility(df, 10)
    df = add_volume_features(df)
    df = add_price_position_features(df)

    return df