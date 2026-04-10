import yfinance as yf
import pandas as pd


STOCK_SYMBOL_MAP = {
    "TCS": "TCS.NS",
    "INFY": "INFY.NS",
    "RELIANCE": "RELIANCE.NS",
    "HDFCBANK": "HDFCBANK.NS",
    "ICICIBANK": "ICICIBANK.NS",
    "SBIN": "SBIN.NS",
    "ITC": "ITC.NS",
    "LT": "LT.NS",
}

CRYPTO_SYMBOL_MAP = {
    "BTC": "BTC-USD",
    "ETH": "ETH-USD",
    "XRP": "XRP-USD",
    "SOL": "SOL-USD",
}


def normalize_symbol(symbol: str) -> str:
    return str(symbol or "").strip().upper()


def get_yfinance_symbol(symbol: str) -> str:
    clean = normalize_symbol(symbol)

    if clean in STOCK_SYMBOL_MAP:
        return STOCK_SYMBOL_MAP[clean]

    if clean in CRYPTO_SYMBOL_MAP:
        return CRYPTO_SYMBOL_MAP[clean]

    # fallback
    return clean


def fetch_historical_data(symbol: str, period: str = "2y", interval: str = "1d") -> pd.DataFrame:
    yf_symbol = get_yfinance_symbol(symbol)

    df = yf.download(
        yf_symbol,
        period=period,
        interval=interval,
        auto_adjust=False,
        progress=False,
    )

    if df is None or df.empty:
        raise ValueError(f"No historical data found for symbol: {symbol}")

    df = df.reset_index()

    # Standardize columns
    rename_map = {
        "Date": "date",
        "Datetime": "date",
        "Open": "open",
        "High": "high",
        "Low": "low",
        "Close": "close",
        "Adj Close": "adj_close",
        "Volume": "volume",
    }
    df = df.rename(columns=rename_map)

    required_cols = ["date", "open", "high", "low", "close", "volume"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column '{col}' for symbol: {symbol}")

    df = df[["date", "open", "high", "low", "close", "volume"]].copy()
    df["symbol"] = normalize_symbol(symbol)

    return df