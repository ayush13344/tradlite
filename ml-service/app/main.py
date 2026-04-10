import logging
 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
 
# Suppress yfinance / peewee noise that can corrupt responses
logging.getLogger("yfinance").setLevel(logging.CRITICAL)
logging.getLogger("peewee").setLevel(logging.CRITICAL)
logging.getLogger("urllib3").setLevel(logging.CRITICAL)
 
# =========================================================
# IMPORT ML FUNCTION  — wrapped so a broken model file
# doesn't crash the entire server on startup
# =========================================================
 
try:
    from app.predictors.signal_model import get_signal_prediction
    MODEL_LOADED = True
    MODEL_ERROR = None
except Exception as e:
    get_signal_prediction = None
    MODEL_LOADED = False
    MODEL_ERROR = str(e)
    logging.critical(f"[startup] Failed to load signal model: {e}")
 
 
# =========================================================
# APP INIT
# =========================================================
 
app = FastAPI(
    title="Trading ML Service",
    description="ML-powered BUY/SELL signal API",
    version="1.0.0"
)
 
 
# =========================================================
# CORS
# =========================================================
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
 
# =========================================================
# SHARED GUARD — call this at the top of every ML route
# =========================================================
 
def require_model():
    """Raise a clean 503 if the model failed to load at startup."""
    if not MODEL_LOADED:
        raise HTTPException(
            status_code=503,
            detail=f"ML model is not available: {MODEL_ERROR}"
        )
 
 
def run_prediction(symbol: str) -> dict:
    """
    Central prediction runner.
    - Cleans the symbol (strips junk like ':1' from URLs)
    - Calls get_signal_prediction()
    - NEVER raises — always returns a dict with success flag
    """
    # Strip anything after a colon (e.g. 'DLF:1' → 'DLF')
    clean_symbol = symbol.split(":")[0].strip().upper()
 
    if not clean_symbol:
        return {"success": False, "error": "Symbol is required"}
 
    try:
        result = get_signal_prediction(clean_symbol)
 
        # Ensure result is always a dict (defensive — should never happen)
        if not isinstance(result, dict):
            return {
                "success": False,
                "symbol": clean_symbol,
                "error": "Unexpected response from prediction engine"
            }
 
        return result
 
    except Exception as e:
        logging.exception(f"[predict] Unhandled error for symbol '{clean_symbol}'")
        return {
            "success": False,
            "symbol": clean_symbol,
            "error": "Prediction failed due to an unexpected error.",
            "details": str(e)
        }
 
 
# =========================================================
# ROOT
# =========================================================
 
@app.get("/")
def root():
    return {
        "message": "Trading ML service is running",
        "status": "ok",
        "model_loaded": MODEL_LOADED,
        **({"model_error": MODEL_ERROR} if not MODEL_LOADED else {})
    }
 
 
# =========================================================
# HEALTH CHECK
# =========================================================
 
@app.get("/health")
def health():
    if not MODEL_LOADED:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "reason": MODEL_ERROR}
        )
    return {"status": "healthy"}
 
 
# =========================================================
# SIGNAL PREDICTION — single symbol
# =========================================================
 
@app.get("/predict/signal/{symbol}")
def predict_signal(symbol: str):
    """
    Get BUY / SELL signal for a symbol.
    Examples:
      /predict/signal/TCS
      /predict/signal/DLF
      /predict/signal/BTC
      /predict/signal/AAPL
    """
    require_model()
 
    result = run_prediction(symbol)
 
    # Prediction logic errors (bad symbol, no data, etc.) → 400, not 500
    if not result.get("success"):
        return JSONResponse(status_code=400, content=result)
 
    return result
 
 
# =========================================================
# BATCH PREDICTION — multiple symbols
# =========================================================
 
@app.post("/predict/signal/batch")
def predict_batch(symbols: list[str]):
    """
    Get signals for multiple symbols.
    Example body: ["TCS", "INFY", "BTC", "DLF"]
    """
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
 
 
# =========================================================
# DEBUG — lightweight check without full prediction
# =========================================================
 
@app.get("/debug/symbol/{symbol}")
def debug_symbol(symbol: str):
    """
    Lightweight debug route — returns key fields only.
    Useful for testing new symbols quickly.
    Example: /debug/symbol/DLF
    """
    require_model()
 
    result = run_prediction(symbol)
 
    if not result.get("success"):
        return JSONResponse(status_code=400, content={
            "symbol": symbol,
            "status": "failed",
            "error": result.get("error"),
            "details": result.get("details"),
            "hint": result.get("hint"),
        })
 
    return {
        "symbol": result.get("symbol"),
        "yahoo_symbol": result.get("yahoo_symbol"),
        "status": "success",
        "signal": result.get("signal"),
        "confidence": result.get("confidence"),
        "threshold_used": result.get("threshold_used"),
        "price": result.get("price"),
        "date": result.get("date"),
        "seen_in_training": result.get("seen_in_training"),
        "note": result.get("note"),
    }
 
 
# =========================================================
# MODEL INFO
# =========================================================
 
@app.get("/model/info")
def model_info():
    """
    Returns metadata about the loaded model.
    """
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