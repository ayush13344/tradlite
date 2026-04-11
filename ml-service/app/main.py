import logging
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.getLogger("yfinance").setLevel(logging.CRITICAL)
logging.getLogger("peewee").setLevel(logging.CRITICAL)
logging.getLogger("urllib3").setLevel(logging.CRITICAL)

# =========================
# LOAD SIGNAL MODEL
# =========================
try:
    from app.predictors.signal_model import get_signal_prediction
    SIGNAL_MODEL_LOADED = True
    SIGNAL_MODEL_ERROR = None
except Exception as e:
    get_signal_prediction = None
    SIGNAL_MODEL_LOADED = False
    SIGNAL_MODEL_ERROR = str(e)
    logging.critical(f"[startup] Failed to load signal model: {e}")

# =========================
# LOAD PRICE MODEL
# =========================
try:
    from app.predictors.price_prediction_model import get_price_prediction
    PRICE_MODEL_LOADED = True
    PRICE_MODEL_ERROR = None
except Exception as e:
    get_price_prediction = None
    PRICE_MODEL_LOADED = False
    PRICE_MODEL_ERROR = str(e)
    logging.critical(f"[startup] Failed to load price model: {e}")

app = FastAPI(
    title="Trading ML Service",
    description="ML-powered trading API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_signal_model():
    if not SIGNAL_MODEL_LOADED:
        raise HTTPException(
            status_code=503,
            detail=f"Signal model is not available: {SIGNAL_MODEL_ERROR}"
        )


def require_price_model():
    if not PRICE_MODEL_LOADED:
        raise HTTPException(
            status_code=503,
            detail=f"Price model is not available: {PRICE_MODEL_ERROR}"
        )


def clean_symbol(raw: str) -> str:
    s = str(raw or "").strip().upper()
    s = s.split(":")[0]
    s = s.replace(".NS", "")
    s = s.replace(".BO", "")
    s = s.replace("-INR", "")
    s = s.replace("-USD", "")
    s = re.sub(r"[^A-Z0-9]", "", s)
    return s.strip()


def run_signal_prediction(symbol: str) -> dict:
    cleaned = clean_symbol(symbol)
    logging.info(f"[signal] raw='{symbol}' -> cleaned='{cleaned}'")

    if not cleaned:
        return {"success": False, "error": "Symbol is required"}

    try:
        result = get_signal_prediction(cleaned)
        if not isinstance(result, dict):
            return {
                "success": False,
                "symbol": cleaned,
                "error": "Unexpected response from signal prediction engine"
            }
        return result
    except Exception as e:
        logging.exception(f"[signal] Unhandled error for symbol '{cleaned}'")
        return {
            "success": False,
            "symbol": cleaned,
            "error": "Signal prediction failed",
            "details": str(e)
        }


def run_price_prediction(symbol: str) -> dict:
    cleaned = clean_symbol(symbol)
    logging.info(f"[price] raw='{symbol}' -> cleaned='{cleaned}'")

    if not cleaned:
        return {"success": False, "error": "Symbol is required"}

    try:
        result = get_price_prediction(cleaned)
        if not isinstance(result, dict):
            return {
                "success": False,
                "symbol": cleaned,
                "error": "Unexpected response from price prediction engine"
            }
        return result
    except Exception as e:
        logging.exception(f"[price] Unhandled error for symbol '{cleaned}'")
        return {
            "success": False,
            "symbol": cleaned,
            "error": "Price prediction failed",
            "details": str(e)
        }


@app.get("/")
def root():
    return {
        "message": "Trading ML service is running",
        "status": "ok",
        "signal_model_loaded": SIGNAL_MODEL_LOADED,
        "price_model_loaded": PRICE_MODEL_LOADED,
        **({"signal_model_error": SIGNAL_MODEL_ERROR} if not SIGNAL_MODEL_LOADED else {}),
        **({"price_model_error": PRICE_MODEL_ERROR} if not PRICE_MODEL_LOADED else {}),
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "signal_model_loaded": SIGNAL_MODEL_LOADED,
        "price_model_loaded": PRICE_MODEL_LOADED
    }


# =========================
# SIGNAL ROUTES
# =========================

@app.get("/predict/signal/{symbol:path}")
def predict_signal(symbol: str):
    require_signal_model()
    result = run_signal_prediction(symbol)
    if not result.get("success"):
        return JSONResponse(status_code=400, content=result)
    return result


@app.post("/predict/signal/batch")
def predict_signal_batch(symbols: list[str]):
    require_signal_model()
    if not symbols:
        raise HTTPException(status_code=400, detail="symbols list is empty")

    results = [run_signal_prediction(s) for s in symbols]
    return {
        "count": len(results),
        "success_count": sum(1 for r in results if r.get("success")),
        "error_count": sum(1 for r in results if not r.get("success")),
        "results": results
    }


# =========================
# PRICE ROUTES
# =========================

@app.get("/predict/price/{symbol:path}")
def predict_price(symbol: str):
    require_price_model()
    result = run_price_prediction(symbol)
    if not result.get("success"):
        return JSONResponse(status_code=400, content=result)
    return result


@app.get("/debug/price/{symbol:path}")
def debug_price(symbol: str):
    require_price_model()
    cleaned = clean_symbol(symbol)
    result = run_price_prediction(symbol)
    return {
        "raw_symbol": symbol,
        "cleaned_symbol": cleaned,
        "price_model_loaded": PRICE_MODEL_LOADED,
        "result": result
    }


# =========================
# MODEL INFO ROUTES
# =========================

@app.get("/model/info")
def model_info():
    require_signal_model()
    try:
        import joblib
        import os

        bundle = joblib.load(os.path.join("models", "signal_model.pkl"))
        return {
            "status": "loaded",
            "features_count": len(bundle.get("features", [])),
            "trained_symbols_count": len(bundle.get("symbols", [])),
            "confidence_threshold": bundle.get("confidence_threshold", 0.70),
            "trained_symbols": bundle.get("symbols", []),
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "status": "error",
            "detail": str(e)
        })


@app.get("/model/price/info")
def price_model_info():
    require_price_model()
    try:
        import joblib
        import os

        bundle = joblib.load(os.path.join("models", "price_model.pkl"))
        return {
            "status": "loaded",
            "features_count": len(bundle.get("features", [])),
            "trained_symbols_count": len(bundle.get("symbols", [])),
            "trained_symbols": bundle.get("symbols", []),
            "target": bundle.get("target"),
            "metrics": bundle.get("metrics", {}),
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "status": "error",
            "detail": str(e)
        })