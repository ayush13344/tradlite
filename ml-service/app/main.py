import logging
import os
import re
from typing import List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# =========================
# LOGGING CONFIG
# =========================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

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

# =========================
# LOAD PORTFOLIO RECOMMENDATION
# =========================
try:
    from app.predictors.portfolio_recommendation import get_portfolio_recommendations
    PORTFOLIO_RECOMMENDATION_LOADED = True
    PORTFOLIO_RECOMMENDATION_ERROR = None
except Exception as e:
    get_portfolio_recommendations = None
    PORTFOLIO_RECOMMENDATION_LOADED = False
    PORTFOLIO_RECOMMENDATION_ERROR = str(e)
    logging.critical(f"[startup] Failed to load portfolio recommendation module: {e}")

app = FastAPI(
    title="Trading ML Service",
    description="ML-powered trading API for signal, price and portfolio recommendations",
    version="1.0.0"
)

# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# REQUEST MODELS
# =========================
class SymbolBatchRequest(BaseModel):
    symbols: List[str]

class PortfolioRequest(BaseModel):
    user_id: str

# =========================
# STARTUP EVENT
# =========================
@app.on_event("startup")
def startup_event():
    logging.info("Trading ML service started")
    logging.info(f"Signal model loaded: {SIGNAL_MODEL_LOADED}")
    logging.info(f"Price model loaded: {PRICE_MODEL_LOADED}")
    logging.info(f"Portfolio recommendation loaded: {PORTFOLIO_RECOMMENDATION_LOADED}")

# =========================
# GLOBAL EXCEPTION HANDLERS
# =========================
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "path": str(request.url.path),
            "error": exc.detail
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.exception(f"[global-error] {request.url.path} -> {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "path": str(request.url.path),
            "error": "Internal server error",
            "details": str(exc)
        }
    )

# =========================
# REQUIRE HELPERS
# =========================
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

def require_portfolio_recommendation():
    if not PORTFOLIO_RECOMMENDATION_LOADED:
        raise HTTPException(
            status_code=503,
            detail=f"Portfolio recommendation module is not available: {PORTFOLIO_RECOMMENDATION_ERROR}"
        )

# =========================
# UTILS
# =========================
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

# =========================
# BASIC ROUTES
# =========================
@app.get("/", tags=["System"])
def root():
    return {
        "message": "Trading ML service is running",
        "status": "ok",
        "signal_model_loaded": SIGNAL_MODEL_LOADED,
        "price_model_loaded": PRICE_MODEL_LOADED,
        "portfolio_recommendation_loaded": PORTFOLIO_RECOMMENDATION_LOADED,
        **({"signal_model_error": SIGNAL_MODEL_ERROR} if not SIGNAL_MODEL_LOADED else {}),
        **({"price_model_error": PRICE_MODEL_ERROR} if not PRICE_MODEL_LOADED else {}),
        **(
            {"portfolio_recommendation_error": PORTFOLIO_RECOMMENDATION_ERROR}
            if not PORTFOLIO_RECOMMENDATION_LOADED
            else {}
        ),
    }

@app.get("/health", tags=["System"])
def health():
    return {
        "status": "healthy",
        "signal_model_loaded": SIGNAL_MODEL_LOADED,
        "price_model_loaded": PRICE_MODEL_LOADED,
        "portfolio_recommendation_loaded": PORTFOLIO_RECOMMENDATION_LOADED,
    }

# =========================
# SIGNAL ROUTES
# =========================
@app.get("/predict/signal/{symbol:path}", tags=["Signal"])
def predict_signal(symbol: str):
    require_signal_model()
    result = run_signal_prediction(symbol)
    if not result.get("success"):
        return JSONResponse(status_code=400, content=result)
    return result

@app.post("/predict/signal/batch", tags=["Signal"])
def predict_signal_batch(payload: SymbolBatchRequest):
    require_signal_model()

    if not payload.symbols:
        raise HTTPException(status_code=400, detail="symbols list is empty")

    results = [run_signal_prediction(s) for s in payload.symbols]
    return {
        "count": len(results),
        "success_count": sum(1 for r in results if r.get("success")),
        "error_count": sum(1 for r in results if not r.get("success")),
        "results": results
    }

# =========================
# PRICE ROUTES
# =========================
@app.get("/predict/price/{symbol:path}", tags=["Price"])
def predict_price(symbol: str):
    require_price_model()
    result = run_price_prediction(symbol)
    if not result.get("success"):
        return JSONResponse(status_code=400, content=result)
    return result

@app.post("/predict/price/batch", tags=["Price"])
def predict_price_batch(payload: SymbolBatchRequest):
    require_price_model()

    if not payload.symbols:
        raise HTTPException(status_code=400, detail="symbols list is empty")

    results = [run_price_prediction(s) for s in payload.symbols]
    return {
        "count": len(results),
        "success_count": sum(1 for r in results if r.get("success")),
        "error_count": sum(1 for r in results if not r.get("success")),
        "results": results
    }

@app.get("/debug/price/{symbol:path}", tags=["Price"])
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
# COMBINED ML ROUTE
# =========================
@app.get("/predict/full/{symbol:path}", tags=["Combined"])
def predict_full(symbol: str):
    require_signal_model()
    require_price_model()

    signal_result = run_signal_prediction(symbol)
    price_result = run_price_prediction(symbol)

    cleaned = clean_symbol(symbol)

    return {
        "success": signal_result.get("success", False) or price_result.get("success", False),
        "symbol": cleaned,
        "signal": signal_result,
        "price": price_result
    }

# =========================
# PORTFOLIO RECOMMENDATION ROUTES
# =========================
@app.get("/portfolio/recommendations/{user_id}", tags=["Portfolio"])
def portfolio_recommendation(user_id: str):
    require_portfolio_recommendation()
    try:
        return get_portfolio_recommendations(user_id)
    except Exception as e:
        logging.exception(f"[portfolio] Unhandled error for user_id '{user_id}'")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "user_id": user_id,
                "error": "Portfolio recommendation failed",
                "details": str(e)
            }
        )

@app.post("/portfolio/recommendations", tags=["Portfolio"])
def portfolio_recommendation_post(payload: PortfolioRequest):
    require_portfolio_recommendation()
    try:
        return get_portfolio_recommendations(payload.user_id)
    except Exception as e:
        logging.exception(f"[portfolio] Unhandled error for user_id '{payload.user_id}'")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "user_id": payload.user_id,
                "error": "Portfolio recommendation failed",
                "details": str(e)
            }
        )

@app.get("/portfolio/debug/{user_id}", tags=["Portfolio"])
def portfolio_debug(user_id: str):
    require_portfolio_recommendation()
    try:
        result = get_portfolio_recommendations(user_id)
        return {
            "success": True,
            "user_id": user_id,
            "portfolio_module_loaded": PORTFOLIO_RECOMMENDATION_LOADED,
            "result_type": str(type(result)),
            "result": result
        }
    except Exception as e:
        logging.exception(f"[portfolio-debug] Error for user_id '{user_id}'")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "user_id": user_id,
                "portfolio_module_loaded": PORTFOLIO_RECOMMENDATION_LOADED,
                "error": str(e)
            }
        )

# =========================
# MODEL INFO ROUTES
# =========================
@app.get("/model/info", tags=["Model Info"])
def model_info():
    require_signal_model()
    try:
        import joblib

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

@app.get("/model/price/info", tags=["Model Info"])
def price_model_info():
    require_price_model()
    try:
        import joblib

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

@app.get("/model/portfolio/info", tags=["Model Info"])
def portfolio_model_info():
    require_portfolio_recommendation()
    return {
        "status": "loaded",
        "portfolio_recommendation_loaded": PORTFOLIO_RECOMMENDATION_LOADED,
        "module": "app.predictors.portfolio_recommendation"
    }