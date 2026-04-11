import os
import joblib
import numpy as np
import pandas as pd
import yfinance as yf

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split


SYMBOLS = ["TCS.NS", "INFY.NS", "RELIANCE.NS", "HDFCBANK.NS", "ICICIBANK.NS"]


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

    # basic price features
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

    # target = next day close
    df["target"] = df["Close"].shift(-1)

    return df


all_data = []

for symbol in SYMBOLS:
    print(f"Downloading {symbol}...")
    df = yf.download(symbol, period="5y", interval="1d", auto_adjust=False)

    if df.empty or len(df) < 100:
        print(f"Skipping {symbol}, not enough data")
        continue

    df = df.reset_index()

    # flatten columns if needed
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]

    required_cols = ["Date", "Open", "High", "Low", "Close", "Volume"]
    df = df[required_cols].copy()

    # convert numeric cols safely
    numeric_cols = ["Open", "High", "Low", "Close", "Volume"]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["symbol"] = symbol.replace(".NS", "")
    df = build_features(df)
    all_data.append(df)

if not all_data:
    raise ValueError("No training data available")

data = pd.concat(all_data, ignore_index=True)

feature_cols = [
    "Open",
    "High",
    "Low",
    "Close",
    "Volume",
    "return_1d",
    "return_3d",
    "return_5d",
    "sma_5",
    "sma_10",
    "ema_10",
    "ema_20",
    "volatility_5",
    "volume_change",
    "high_low_range",
    "rsi_14",
]

# keep only needed columns
data = data[feature_cols + ["target"]].copy()

# replace inf values
data.replace([np.inf, -np.inf], np.nan, inplace=True)

# drop bad rows
before_rows = len(data)
data.dropna(inplace=True)
after_rows = len(data)

print(f"Rows before cleaning: {before_rows}")
print(f"Rows after cleaning : {after_rows}")
print(f"Rows dropped        : {before_rows - after_rows}")

if data.empty:
    raise ValueError("No valid rows left after cleaning NaN/inf values")

# ensure numeric dtype
for col in feature_cols + ["target"]:
    data[col] = pd.to_numeric(data[col], errors="coerce")

data.replace([np.inf, -np.inf], np.nan, inplace=True)
data.dropna(inplace=True)

if data.empty:
    raise ValueError("Dataset became empty after numeric conversion")

X = data[feature_cols].astype("float64")
y = data["target"].astype("float64")

print("\nFeature summary:")
print(X.describe())

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, shuffle=False
)

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=10,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

preds = model.predict(X_test)

mae = mean_absolute_error(y_test, preds)
rmse = np.sqrt(mean_squared_error(y_test, preds))
r2 = r2_score(y_test, preds)

print("\nPrice Model Metrics")
print("MAE :", round(mae, 4))
print("RMSE:", round(rmse, 4))
print("R2  :", round(r2, 4))

os.makedirs("models", exist_ok=True)

joblib.dump(
    {
        "model": model,
        "features": feature_cols,
        "symbols": [s.replace(".NS", "") for s in SYMBOLS],
        "target": "next_day_close",
        "metrics": {
            "mae": float(mae),
            "rmse": float(rmse),
            "r2": float(r2),
        },
    },
    os.path.join("models", "price_model.pkl"),
)

print("\nSaved to models/price_model.pkl")