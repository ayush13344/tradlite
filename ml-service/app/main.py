import logging
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.getLogger("yfinance").setLevel(logging.CRITICAL)
logging.getLogger("peewee").setLevel(logging.CRITICAL)
logging.getLogger("urllib3").setLevel(logging.CRITICAL)

try:
    from app.predictors.signal_model import get_signal_prediction
    MODEL_LOADED = True
    MODEL_ERROR = None
except Exception as e:
    get_signal_prediction = None
    MODEL_LOADED = False
    MODEL_ERROR = str(e)
    logging.critical(f"[startup] Failed to load signal model: {e}")


app = FastAPI(
    title="Trading ML Service",
    description="ML-powered BUY/SELL signal API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_model():
    if not MODEL_LOADED:
        raise HTTPException(
            status_code=503,
            detail=f"ML model is not available: {MODEL_ERROR}"
        )


def clean_symbol(raw: str) -> str:
    s = str(raw or "").strip().upper()
    s = s.split(":")[0]           # DLF:1 → DLF
    s = s.replace(".NS", "")
    s = s.replace(".BO", "")
    s = s.replace("-INR", "")
    s = s.replace("-USD", "")
    s = re.sub(r"[^A-Z0-9]", "", s)
    return s.strip()


def run_prediction(symbol: str) -> dict:
    cleaned = clean_symbol(symbol)
    logging.info(f"[predict] raw='{symbol}' → cleaned='{cleaned}'")

    if not cleaned:
        return {"success": False, "error": "Symbol is required"}

    try:
        result = get_signal_prediction(cleaned)
        if not isinstance(result, dict):
            return {
                "success": False,
                "symbol": cleaned,
                "error": "Unexpected response from prediction engine"
            }
        return result
    except Exception as e:
        logging.exception(f"[predict] Unhandled error for symbol '{cleaned}'")
        return {
            "success": False,
            "symbol": cleaned,
            "error": "Prediction failed due to an unexpected error.",
            "details": str(e)
        }


@app.get("/")
def root():
    return {
        "message": "Trading ML service is running",
        "status": "ok",
        "model_loaded": MODEL_LOADED,
        **({"model_error": MODEL_ERROR} if not MODEL_LOADED else {})
    }


@app.get("/health")
def health():
    if not MODEL_LOADED:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "reason": MODEL_ERROR}
        )
    return {"status": "healthy"}


# =========================================================
# SIGNAL PREDICTION
# {symbol:path} is the KEY fix — captures DLF:1 without 404
# =========================================================

@app.get("/predict/signal/{symbol:path}")
def predict_signal(symbol: str):
    require_model()
    result = run_prediction(symbol)
    logging.critical(f"[predict_signal] raw='{symbol}' cleaned='{clean_symbol(symbol)}' result={result}")
    if not result.get("success"):
        return JSONResponse(status_code=400, content=result)
    return result


@app.post("/predict/signal/batch")
def predict_batch(symbols: list[str]):
    require_model()
    if not symbols:
        raise HTTPException(status_code=400, detail="symbols list is empty")
    results = [run_prediction(s) for s in symbols]
    return {
        "count": len(results),
        "success_count": sum(1 for r in results if r.get("success")),
        "error_count": sum(1 for r in results if not r.get("success")),
        "results": results
    }


@app.get("/debug/symbol/{symbol:path}")
def debug_symbol(symbol: str):
    require_model()
    result = run_prediction(symbol)
    if not result.get("success"):
        return JSONResponse(status_code=400, content={
            "symbol": symbol,
            "cleaned_symbol": clean_symbol(symbol),
            "status": "failed",
            "error": result.get("error"),
            "details": result.get("details"),
            "hint": result.get("hint"),
        })
    return {
        "symbol": result.get("symbol"),
        "yahoo_symbol": result.get("yahoo_symbol"),
        "cleaned_input": clean_symbol(symbol),
        "status": "success",
        "signal": result.get("signal"),
        "confidence": result.get("confidence"),
        "threshold_used": result.get("threshold_used"),
        "price": result.get("price"),
        "date": result.get("date"),
        "seen_in_training": result.get("seen_in_training"),
        "note": result.get("note"),
    }


@app.get("/model/info")
def model_info():
    require_model()
    try:
        import joblib, os
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