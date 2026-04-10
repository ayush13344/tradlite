import pandas as pd
from app.utils.indicators import add_all_indicators


FEATURE_COLUMNS = [
    "return_1",
    "return_3",
    "return_5",
    "sma_10",
    "sma_20",
    "ema_12",
    "ema_26",
    "rsi",
    "macd",
    "macd_signal",
    "macd_hist",
    "volatility_10",
    "volume_change_1",
    "volume_ratio",
    "high_low_range",
    "close_open_gap",
]


def create_signal_label(row) -> int:
    # 0 = SELL, 1 = HOLD, 2 = BUY
    if row["rsi"] < 40 and row["macd"] > row["macd_signal"]:
        return 2
    if row["rsi"] > 65 and row["macd"] < row["macd_signal"]:
        return 0
    return 1


def build_training_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = add_all_indicators(df)

    df["target"] = df.apply(create_signal_label, axis=1)

    df = df.dropna().reset_index(drop=True)
    return df


def build_latest_feature_row(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = add_all_indicators(df)
    df = df.dropna().reset_index(drop=True)

    if df.empty:
        raise ValueError("Not enough data after feature generation")

    latest = df.iloc[[-1]].copy()
    return latest[FEATURE_COLUMNS]