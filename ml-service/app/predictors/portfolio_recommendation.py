from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Dict, List

import requests


NODE_API_BASE = os.getenv("NODE_API_BASE", "http://localhost:3000/api")


def parse_numeric(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        try:
            return float(value)
        except Exception:
            return None

    try:
        cleaned = "".join(ch for ch in str(value) if ch.isdigit() or ch in ".-")
        if not cleaned:
            return None
        return float(cleaned)
    except Exception:
        return None


def round2(value):
    n = parse_numeric(value)
    if n is None:
        return 0.0
    return round(float(n), 2)


def normalize_symbol(symbol: str = "") -> str:
    return (
        str(symbol)
        .upper()
        .replace(".NS", "")
        .replace(".BO", "")
        .replace("-", "")
        .replace("_", "")
        .strip()
    )


def get_sector_from_symbol(symbol: str = "", company_name: str = "") -> str:
    s = normalize_symbol(symbol)
    name = str(company_name).upper()

    exact_map = {
        "RELIANCE": "Energy",
        "ONGC": "Energy",
        "BPCL": "Energy",
        "IOC": "Energy",
        "OIL": "Energy",
        "GAIL": "Energy",
        "TCS": "IT",
        "INFY": "IT",
        "WIPRO": "IT",
        "HCLTECH": "IT",
        "TECHM": "IT",
        "LTIM": "IT",
        "MPHASIS": "IT",
        "PERSISTENT": "IT",
        "COFORGE": "IT",
        "REDINGTON": "IT",
        "HDFCBANK": "Banking",
        "ICICIBANK": "Banking",
        "SBIN": "Banking",
        "AXISBANK": "Banking",
        "KOTAKBANK": "Banking",
        "INDUSINDBK": "Banking",
        "BANKBARODA": "Banking",
        "PNB": "Banking",
        "FEDERALBNK": "Banking",
        "IDFCFIRSTB": "Banking",
        "CANBK": "Banking",
        "SUNPHARMA": "Pharma",
        "CIPLA": "Pharma",
        "DRREDDY": "Pharma",
        "DIVISLAB": "Pharma",
        "LUPIN": "Pharma",
        "AUROPHARMA": "Pharma",
        "ALKEM": "Pharma",
        "TORNTPHARM": "Pharma",
        "BIOCON": "Pharma",
        "TATAMOTORS": "Auto",
        "MARUTI": "Auto",
        "EICHERMOT": "Auto",
        "BAJAJAUTO": "Auto",
        "MOTHERSON": "Auto",
        "HEROMOTOCO": "Auto",
        "TVSMOTOR": "Auto",
        "ASHOKLEY": "Auto",
        "BOSCHLTD": "Auto",
        "HINDUNILVR": "FMCG",
        "ITC": "FMCG",
        "NESTLEIND": "FMCG",
        "BRITANNIA": "FMCG",
        "DABUR": "FMCG",
        "GODREJCP": "FMCG",
        "COLPAL": "FMCG",
        "TATACONSUM": "FMCG",
        "MARICO": "FMCG",
        "LT": "Infrastructure",
        "ULTRACEMCO": "Cement",
        "SHREECEM": "Cement",
        "AMBUJACEM": "Cement",
        "ACC": "Cement",
        "ADANIPORTS": "Logistics",
        "CONCOR": "Logistics",
        "DELHIVERY": "Logistics",
        "BLUEDART": "Logistics",
        "VRLLOG": "Logistics",
        "TATASTEEL": "Metals",
        "JSWSTEEL": "Metals",
        "HINDALCO": "Metals",
        "VEDL": "Metals",
        "NMDC": "Metals",
        "JINDALSTEL": "Metals",
        "BHARTIARTL": "Telecom",
        "INDUSTOWER": "Telecom",
        "TATACOMM": "Telecom",
        "POWERGRID": "Power",
        "NTPC": "Power",
        "TATAPOWER": "Power",
        "ADANIGREEN": "Power",
        "NHPC": "Power",
        "BAJFINANCE": "Financial Services",
        "BAJAJFINSV": "Financial Services",
        "CHOLAFIN": "Financial Services",
        "SBICARD": "Financial Services",
        "MUTHOOTFIN": "Financial Services",
        "DLF": "Real Estate",
        "GODREJPROP": "Real Estate",
        "OBEROIRLTY": "Real Estate",
        "PRESTIGE": "Real Estate",
        "ASIANPAINT": "Chemicals",
        "PIDILITIND": "Chemicals",
        "BERGEPAINT": "Chemicals",
        "SRF": "Chemicals",
        "DEEPAKNTR": "Chemicals",
        "DMART": "Retail",
        "TRENT": "Retail",
        "VMM": "Retail",
        "ABFRL": "Retail",
        "ZOMATO": "Consumer Tech",
        "SWIGGY": "Consumer Tech",
        "NAUKRI": "Internet",
        "PAYTM": "Fintech",
        "POLICYBZR": "Fintech",
    }

    if s in exact_map:
        return exact_map[s]

    keyword_rules = [
        (["BANK", "FINANCE", "FINSERV", "HOUSING"], "Financial Services"),
        (["PHARMA", "LAB", "BIO", "MEDI"], "Pharma"),
        (["TECH", "SOFT", "INFO", "SYSTEMS", "DIGITAL"], "IT"),
        (["MOTOR", "AUTO", "TYRE"], "Auto"),
        (["POWER", "ENERGY", "GREEN"], "Power"),
        (["CEMENT"], "Cement"),
        (["STEEL", "METAL", "ALUMINIUM", "COPPER"], "Metals"),
        (["PORT", "LOGISTICS", "SHIPPING"], "Logistics"),
        (["REALTY", "PROP", "ESTATE"], "Real Estate"),
        (["PAINT", "CHEM", "CHEMICAL"], "Chemicals"),
        (["TELE", "COMM"], "Telecom"),
        (["RETAIL", "MART", "FASHION"], "Retail"),
        (["CONSUM", "FOOD", "FMCG"], "FMCG"),
    ]

    combined = f"{s} {name}"
    for keys, sector in keyword_rules:
        if any(k in combined for k in keys):
            return sector

    return "Others"


def safe_number(*values):
    for value in values:
        n = parse_numeric(value)
        if n is not None:
            return float(n)
    return 0.0


def normalize_holding(raw: Dict[str, Any], index: int) -> Dict[str, Any]:
    quantity = round2(
        safe_number(
            raw.get("quantity"),
            raw.get("qty"),
            raw.get("totalQuantity"),
            raw.get("shares"),
            raw.get("units"),
        )
    )
    avg_price = round2(
        safe_number(
            raw.get("avgPrice"),
            raw.get("averagePrice"),
            raw.get("buyPrice"),
            raw.get("entryPrice"),
            raw.get("costPrice"),
            raw.get("price"),
        )
    )

    current_price = round2(
        safe_number(
            raw.get("currentPrice"),
            raw.get("livePrice"),
            raw.get("ltp"),
            raw.get("lastPrice"),
            raw.get("marketPrice"),
            raw.get("cmp"),
            raw.get("priceNow"),
            raw.get("currentMarketPrice"),
            avg_price,
        )
    )

    symbol = normalize_symbol(raw.get("symbol") or raw.get("ticker") or f"STOCK{index + 1}")
    name = raw.get("name") or raw.get("companyName") or raw.get("stockName") or symbol
    sector = raw.get("sector") or get_sector_from_symbol(symbol, name)

    invested_value = round2(
        safe_number(
            raw.get("investedValue"),
            raw.get("investmentValue"),
            raw.get("initialAmount"),
            raw.get("buyValue"),
            raw.get("totalInvested"),
            raw.get("investedAmount"),
            raw.get("costValue"),
            quantity * avg_price,
        )
    )

    market_value = round2(
        safe_number(
            raw.get("marketValue"),
            raw.get("currentValue"),
            raw.get("currentAmount"),
            raw.get("totalCurrentValue"),
            raw.get("presentValue"),
            raw.get("holdingValue"),
            quantity * current_price,
        )
    )

    pnl_raw = parse_numeric(
        raw.get("pnl")
        if raw.get("pnl") is not None
        else raw.get("profitLoss")
        if raw.get("profitLoss") is not None
        else raw.get("gainLoss")
        if raw.get("gainLoss") is not None
        else raw.get("netPnL")
        if raw.get("netPnL") is not None
        else raw.get("overallPnL")
    )
    pnl = round2(pnl_raw if pnl_raw is not None else market_value - invested_value)

    pnl_pct_raw = parse_numeric(
        raw.get("pnlPct")
        if raw.get("pnlPct") is not None
        else raw.get("pnlPercent")
        if raw.get("pnlPercent") is not None
        else raw.get("profitPercent")
        if raw.get("profitPercent") is not None
        else raw.get("returnPercent")
        if raw.get("returnPercent") is not None
        else raw.get("returnsPct")
    )
    pnl_pct = round2(pnl_pct_raw if pnl_pct_raw is not None else ((pnl / invested_value) * 100 if invested_value > 0 else 0))

    return {
        "id": raw.get("_id") or raw.get("id") or f"{symbol}-{index}",
        "symbol": symbol,
        "name": name,
        "sector": sector,
        "quantity": quantity,
        "avg_price": avg_price,
        "current_price": current_price,
        "invested_value": invested_value,
        "market_value": market_value,
        "pnl": pnl,
        "pnl_pct": pnl_pct,
        "updated_at": raw.get("priceUpdatedAt") or raw.get("lastUpdated") or raw.get("updatedAt") or datetime.now().isoformat(),
    }


def fetch_real_holdings(user_id: str) -> Dict[str, Any]:
    url = f"{NODE_API_BASE}/holdings/user/{user_id}"
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    data = response.json()

    if not data.get("success"):
        raise ValueError(data.get("message", "Failed to fetch holdings from Node backend"))

    raw_holdings = data.get("holdings", []) or []
    normalized = [normalize_holding(item, i) for i, item in enumerate(raw_holdings)]

    return {
        "holdings": normalized,
        "summary": data.get("summary", {}) or {},
    }


def get_risk_level(score: float) -> str:
    if score >= 7:
        return "High"
    if score >= 4.5:
        return "Medium"
    return "Low"


def action_from_metrics(pnl_pct: float, concentration_pct: float) -> str:
    if pnl_pct <= -10:
        return "Review / Exit"
    if pnl_pct <= -4:
        return "Reduce / Review"
    if pnl_pct >= 12 and concentration_pct >= 20:
        return "Book Partial Profit"
    if pnl_pct >= 8:
        return "Strong Hold"
    if pnl_pct >= 2:
        return "Hold"
    return "Add on Dips"


def get_portfolio_recommendations(user_id: str):
    try:
        real_data = fetch_real_holdings(user_id)
        holdings = real_data["holdings"]
    except Exception as e:
        return {
            "user_id": user_id,
            "generated_at": datetime.now().isoformat(),
            "success": False,
            "message": f"Failed to generate recommendations from real holdings: {str(e)}",
            "portfolio_health": {},
            "summary": {},
            "sector_distribution": [],
            "top_performer": None,
            "worst_performer": None,
            "rebalancing_suggestions": [],
            "profit_booking_alerts": [],
            "stop_loss_recommendations": [],
            "stock_recommendations": [],
            "missed_sector_opportunities": [],
        }

    total_investment = round2(sum(h["invested_value"] for h in holdings))
    current_value = round2(sum(h["market_value"] for h in holdings))
    total_pnl = round2(sum(h["pnl"] for h in holdings))
    total_pnl_pct = round2((total_pnl / total_investment) * 100) if total_investment > 0 else 0.0

    sector_totals: Dict[str, float] = {}
    for h in holdings:
        sector_totals[h["sector"]] = round2(sector_totals.get(h["sector"], 0) + h["market_value"])

    sector_distribution = []
    for sector, value in sorted(sector_totals.items(), key=lambda x: x[1], reverse=True):
        allocation = round2((value / current_value) * 100) if current_value > 0 else 0.0
        sector_distribution.append(
            {
                "sector": sector,
                "allocation": allocation,
                "value": round2(value),
            }
        )

    sorted_by_perf = sorted(holdings, key=lambda x: (x["pnl_pct"], x["pnl"]), reverse=True)
    top_performer = None
    worst_performer = None

    if sorted_by_perf:
        top = sorted_by_perf[0]
        top_concentration = round2((top["market_value"] / current_value) * 100) if current_value > 0 else 0
        top_performer = {
            "symbol": top["symbol"],
            "name": top["name"],
            "pnl": top["pnl"],
            "pnl_pct": top["pnl_pct"],
            "action": action_from_metrics(top["pnl_pct"], top_concentration),
        }

        worst = sorted_by_perf[-1]
        worst_concentration = round2((worst["market_value"] / current_value) * 100) if current_value > 0 else 0
        worst_performer = {
            "symbol": worst["symbol"],
            "name": worst["name"],
            "pnl": worst["pnl"],
            "pnl_pct": worst["pnl_pct"],
            "action": action_from_metrics(worst["pnl_pct"], worst_concentration),
        }

    top_sector_pct = max((item["allocation"] for item in sector_distribution), default=0.0)
    top_stock_pct = max(((h["market_value"] / current_value) * 100 for h in holdings), default=0.0) if current_value > 0 else 0.0
    losers_ratio = (len([h for h in holdings if h["pnl"] < 0]) / len(holdings)) if holdings else 0.0
    avg_abs_move = (sum(abs(h["pnl_pct"]) for h in holdings) / len(holdings)) if holdings else 0.0

    diversification_score = round2(
        max(
            1.0,
            min(
                10.0,
                10.0
                - (top_sector_pct / 12.0)
                - (top_stock_pct / 18.0),
            ),
        )
    )

    risk_score = round2(
        max(
            1.0,
            min(
                10.0,
                2.5
                + (top_sector_pct / 12.0)
                + (top_stock_pct / 18.0)
                + (losers_ratio * 2.2)
                + (avg_abs_move / 15.0),
            ),
        )
    )

    trend = "Bullish" if total_pnl >= 0 else "Bearish"
    cash_readiness = "Unknown"

    portfolio_health = {
        "risk_score": risk_score,
        "risk_level": get_risk_level(risk_score),
        "diversification_score": diversification_score,
        "trend": trend,
        "cash_readiness": cash_readiness,
    }

    rebalancing_suggestions: List[Dict[str, Any]] = []
    for sector_item in sector_distribution:
        if sector_item["allocation"] >= 35:
            rebalancing_suggestions.append(
                {
                    "symbol": sector_item["sector"],
                    "action": "Reduce Exposure",
                    "reason": f"High concentration in {sector_item['sector']} sector ({sector_item['allocation']}%)",
                    "suggested_reduction": "5% to 10%",
                }
            )

    defensive_missing = []
    held_sectors = {item["sector"] for item in sector_distribution}
    for defensive_sector in ["Pharma", "FMCG", "Power"]:
        if defensive_sector not in held_sectors:
            defensive_missing.append(defensive_sector)
            rebalancing_suggestions.append(
                {
                    "symbol": defensive_sector,
                    "action": "Add",
                    "reason": f"{defensive_sector} is missing and can improve balance during volatility",
                    "suggested_allocation": "5% to 10%",
                }
            )

    profit_booking_alerts = []
    for h in holdings:
        concentration_pct = round2((h["market_value"] / current_value) * 100) if current_value > 0 else 0.0
        if h["pnl_pct"] >= 15 or (h["pnl_pct"] >= 10 and concentration_pct >= 20):
            profit_booking_alerts.append(
                {
                    "symbol": h["symbol"],
                    "action": "Book Partial Profit",
                    "reason": f"Gain of {h['pnl_pct']}% with portfolio weight {concentration_pct}%",
                }
            )

    stop_loss_recommendations = []
    for h in holdings:
        if h["current_price"] <= 0:
            continue
        stop_loss_pct = 0.95 if h["pnl_pct"] >= 0 else 0.92
        stop_loss_recommendations.append(
            {
                "symbol": h["symbol"],
                "current_price": h["current_price"],
                "suggested_stop_loss": round2(h["current_price"] * stop_loss_pct),
            }
        )

    stop_loss_recommendations = stop_loss_recommendations[:5]

    stock_recommendations = []
    for h in sorted(holdings, key=lambda x: abs(x["pnl_pct"]), reverse=True):
        concentration_pct = round2((h["market_value"] / current_value) * 100) if current_value > 0 else 0.0
        action = action_from_metrics(h["pnl_pct"], concentration_pct)

        confidence = 55
        if h["pnl_pct"] >= 12:
            confidence = 84
        elif h["pnl_pct"] >= 6:
            confidence = 74
        elif h["pnl_pct"] >= 0:
            confidence = 66
        elif h["pnl_pct"] >= -5:
            confidence = 62
        else:
            confidence = 70

        if concentration_pct >= 25 and h["pnl_pct"] >= 8:
            reason = "Strong returns but portfolio concentration is high"
        elif h["pnl_pct"] >= 8:
            reason = "Positive trend and strong momentum in current holdings performance"
        elif h["pnl_pct"] >= 0:
            reason = "Holding is stable with manageable drawdown risk"
        elif h["pnl_pct"] >= -5:
            reason = "Weak performance; monitor support zone closely"
        else:
            reason = "Weak momentum and deeper drawdown than portfolio average"

        stock_recommendations.append(
            {
                "symbol": h["symbol"],
                "action": action,
                "confidence": confidence,
                "reason": reason,
            }
        )

    stock_recommendations = stock_recommendations[:6]

    missed_sector_opportunities = [
        {
            "sector": sector,
            "reason": f"{sector} can improve diversification and reduce concentration risk"
        }
        for sector in defensive_missing
    ]

    return {
        "user_id": user_id,
        "generated_at": datetime.now().isoformat(),
        "success": True,
        "portfolio_health": portfolio_health,
        "summary": {
            "total_investment": total_investment,
            "current_value": current_value,
            "total_pnl": total_pnl,
            "total_pnl_pct": total_pnl_pct,
        },
        "sector_distribution": sector_distribution,
        "top_performer": top_performer,
        "worst_performer": worst_performer,
        "rebalancing_suggestions": rebalancing_suggestions[:6],
        "profit_booking_alerts": profit_booking_alerts[:6],
        "stop_loss_recommendations": stop_loss_recommendations,
        "stock_recommendations": stock_recommendations,
        "missed_sector_opportunities": missed_sector_opportunities[:4],
    }