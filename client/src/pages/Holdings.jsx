import React, { useCallback, useEffect, useMemo, useState } from "react";

/* ========================= CONFIG ========================= */

const API_BASE_URL = "http://localhost:3000/api";

/* ========================= HELPERS ========================= */

function parseNumeric(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function round2(value) {
  const n = parseNumeric(value);
  if (n === null) return 0;
  return Number(n.toFixed(2));
}

function formatNum(v) {
  const n = parseNumeric(v);
  if (n === null) return "--";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatMoney(v) {
  const n = parseNumeric(v);
  if (n === null) return "--";
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPct(v) {
  const n = parseNumeric(v);
  if (n === null) return "--";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatDateTime(v) {
  if (!v) return "--";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeSymbol(symbol = "") {
  return String(symbol)
    .toUpperCase()
    .replace(/\.NS$/i, "")
    .replace(/\.BO$/i, "")
    .replace(/[^A-Z0-9]/g, "");
}

function getSectorFromSymbol(symbol = "", companyName = "") {
  const s = normalizeSymbol(symbol);
  const name = String(companyName).toUpperCase();

  const exactMap = {
    RELIANCE: "Energy",
    ONGC: "Energy",
    BPCL: "Energy",
    IOC: "Energy",
    OIL: "Energy",
    GAIL: "Energy",
    TCS: "IT",
    INFY: "IT",
    WIPRO: "IT",
    HCLTECH: "IT",
    TECHM: "IT",
    LTIM: "IT",
    MPHASIS: "IT",
    PERSISTENT: "IT",
    COFORGE: "IT",
    REDINGTON: "IT",
    HDFCBANK: "Banking",
    ICICIBANK: "Banking",
    SBIN: "Banking",
    AXISBANK: "Banking",
    KOTAKBANK: "Banking",
    INDUSINDBK: "Banking",
    BANKBARODA: "Banking",
    PNB: "Banking",
    FEDERALBNK: "Banking",
    IDFCFIRSTB: "Banking",
    CANBK: "Banking",
    SUNPHARMA: "Pharma",
    CIPLA: "Pharma",
    DRREDDY: "Pharma",
    DIVISLAB: "Pharma",
    LUPIN: "Pharma",
    AUROPHARMA: "Pharma",
    ALKEM: "Pharma",
    TORNTPHARM: "Pharma",
    BIOCON: "Pharma",
    TATAMOTORS: "Auto",
    MARUTI: "Auto",
    EICHERMOT: "Auto",
    BAJAJAUTO: "Auto",
    MOTHERSON: "Auto",
    HEROMOTOCO: "Auto",
    TVSMOTOR: "Auto",
    ASHOKLEY: "Auto",
    BOSCHLTD: "Auto",
    HINDUNILVR: "FMCG",
    ITC: "FMCG",
    NESTLEIND: "FMCG",
    BRITANNIA: "FMCG",
    DABUR: "FMCG",
    GODREJCP: "FMCG",
    COLPAL: "FMCG",
    TATACONSUM: "FMCG",
    MARICO: "FMCG",
    LT: "Infrastructure",
    ULTRACEMCO: "Cement",
    SHREECEM: "Cement",
    AMBUJACEM: "Cement",
    ACC: "Cement",
    ADANIPORTS: "Logistics",
    CONCOR: "Logistics",
    DELHIVERY: "Logistics",
    BLUEDART: "Logistics",
    VRLLOG: "Logistics",
    TATASTEEL: "Metals",
    JSWSTEEL: "Metals",
    HINDALCO: "Metals",
    VEDL: "Metals",
    NMDC: "Metals",
    JINDALSTEL: "Metals",
    BHARTIARTL: "Telecom",
    INDUSTOWER: "Telecom",
    TATACOMM: "Telecom",
    POWERGRID: "Power",
    NTPC: "Power",
    TATAPOWER: "Power",
    ADANIGREEN: "Power",
    NHPC: "Power",
    BAJFINANCE: "Financial Services",
    BAJAJFINSV: "Financial Services",
    CHOLAFIN: "Financial Services",
    SBICARD: "Financial Services",
    MUTHOOTFIN: "Financial Services",
    DLF: "Real Estate",
    GODREJPROP: "Real Estate",
    OBEROIRLTY: "Real Estate",
    PRESTIGE: "Real Estate",
    ASIANPAINT: "Chemicals",
    PIDILITIND: "Chemicals",
    BERGEPAINT: "Chemicals",
    SRF: "Chemicals",
    DEEPAKNTR: "Chemicals",
    DMART: "Retail",
    TRENT: "Retail",
    VMM: "Retail",
    ABFRL: "Retail",
    ZOMATO: "Consumer Tech",
    SWIGGY: "Consumer Tech",
    NAUKRI: "Internet",
    PAYTM: "Fintech",
    POLICYBZR: "Fintech",
  };

  if (exactMap[s]) return exactMap[s];

  const keywordRules = [
    { keys: ["BANK", "FINANCE", "FINSERV", "HOUSING"], sector: "Financial Services" },
    { keys: ["PHARMA", "LAB", "BIO", "MEDI"], sector: "Pharma" },
    { keys: ["TECH", "SOFT", "INFO", "SYSTEMS", "DIGITAL"], sector: "IT" },
    { keys: ["MOTOR", "AUTO", "TYRE"], sector: "Auto" },
    { keys: ["POWER", "ENERGY", "GREEN"], sector: "Power" },
    { keys: ["CEMENT"], sector: "Cement" },
    { keys: ["STEEL", "METAL", "ALUMINIUM", "COPPER"], sector: "Metals" },
    { keys: ["PORT", "LOGISTICS", "SHIPPING"], sector: "Logistics" },
    { keys: ["REALTY", "PROP", "ESTATE"], sector: "Real Estate" },
    { keys: ["PAINT", "CHEM", "CHEMICAL"], sector: "Chemicals" },
    { keys: ["TELE", "COMM"], sector: "Telecom" },
    { keys: ["RETAIL", "MART", "FASHION"], sector: "Retail" },
    { keys: ["CONSUM", "FOOD", "FMCG"], sector: "FMCG" },
  ];

  const combined = `${s} ${name}`;
  for (const rule of keywordRules) {
    if (rule.keys.some((k) => combined.includes(k))) return rule.sector;
  }

  return "Others";
}

function getColorByIndex(i) {
  const colors = [
    "#2563eb", "#7c3aed", "#16a34a", "#ea580c", "#dc2626",
    "#0891b2", "#ca8a04", "#4f46e5", "#0f766e", "#9333ea",
  ];
  return colors[i % colors.length];
}

function getUserIdFromStorage() {
  try {
    const directUserId = localStorage.getItem("userId") || sessionStorage.getItem("userId");
    if (directUserId) return directUserId;
    const userRaw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      return parsed?._id || parsed?.id || parsed?.userId || parsed?.user?._id || parsed?.user?.id || null;
    }
    const authUserRaw = localStorage.getItem("authUser") || sessionStorage.getItem("authUser");
    if (authUserRaw) {
      const parsed = JSON.parse(authUserRaw);
      return parsed?._id || parsed?.id || parsed?.userId || null;
    }
    return null;
  } catch {
    return null;
  }
}

function safeNumber(...values) {
  for (const value of values) {
    const n = parseNumeric(value);
    if (n !== null && Number.isFinite(n)) return n;
  }
  return 0;
}

function getHoldingQuantity(raw) {
  return safeNumber(raw?.quantity, raw?.qty, raw?.totalQuantity, raw?.shares, raw?.units);
}

function getHoldingAvgPrice(raw) {
  return safeNumber(raw?.avgPrice, raw?.averagePrice, raw?.buyPrice, raw?.entryPrice, raw?.costPrice, raw?.price);
}

function getHoldingCurrentPrice(raw, avgPrice = 0) {
  const direct = safeNumber(raw?.currentPrice, raw?.livePrice, raw?.ltp, raw?.lastPrice, raw?.marketPrice, raw?.cmp, raw?.priceNow, raw?.currentMarketPrice);
  return direct > 0 ? direct : avgPrice;
}

function getHoldingInvestedValue(raw, quantity = 0, avgPrice = 0) {
  const direct = safeNumber(raw?.investedValue, raw?.investmentValue, raw?.initialAmount, raw?.buyValue, raw?.totalInvested, raw?.investedAmount, raw?.costValue);
  if (direct > 0) return direct;
  return quantity * avgPrice;
}

function getHoldingMarketValue(raw, quantity = 0, currentPrice = 0) {
  const direct = safeNumber(raw?.marketValue, raw?.currentValue, raw?.currentAmount, raw?.totalCurrentValue, raw?.presentValue, raw?.holdingValue);
  if (direct > 0) return direct;
  return quantity * currentPrice;
}

function getHoldingUpdatedAt(raw) {
  return raw?.priceUpdatedAt || raw?.lastUpdated || raw?.updatedAt || raw?.createdAt || new Date().toISOString();
}

function generateTinyTrend(baseValue = 0, currentValue = 0, positive = true) {
  const start = Number(baseValue) || 0;
  const end = Number(currentValue) || 0;
  if (start <= 0 && end <= 0) return [40, 42, 41, 43, 44, 45, 46, 47, 48, 49];
  const points = [];
  const steps = 10;
  const diff = end - start;
  for (let i = 0; i < steps; i++) {
    const progress = i / (steps - 1);
    const wave = Math.sin(i * 1.15) * Math.max(Math.abs(diff) * 0.08, 0.8);
    let value = start + diff * progress + wave;
    if (!Number.isFinite(value)) value = end || start || 0;
    if (value < 0) value = 0;
    points.push(value);
  }
  if (!positive && points[points.length - 1] > points[0]) points.reverse();
  return points;
}

function normalizeHolding(raw, index) {
  const quantity = round2(getHoldingQuantity(raw));
  const avgPrice = round2(getHoldingAvgPrice(raw));
  const currentPrice = round2(getHoldingCurrentPrice(raw, avgPrice));
  const symbol = normalizeSymbol(raw?.symbol || raw?.ticker || `STOCK-${index + 1}`);
  const name = raw?.name || raw?.companyName || raw?.stockName || symbol;
  const sector = raw?.sector || getSectorFromSymbol(symbol, name);
  const investedValue = round2(getHoldingInvestedValue(raw, quantity, avgPrice));
  const marketValue = round2(getHoldingMarketValue(raw, quantity, currentPrice));
  const pnlDirect = parseNumeric(raw?.pnl ?? raw?.profitLoss ?? raw?.gainLoss ?? raw?.netPnL ?? raw?.overallPnL);
  const pnl = round2(pnlDirect !== null ? pnlDirect : marketValue - investedValue);
  const pnlPctDirect = parseNumeric(raw?.pnlPct ?? raw?.pnlPercent ?? raw?.profitPercent ?? raw?.returnPercent ?? raw?.returnsPct);
  const pnlPct = round2(pnlPctDirect !== null ? pnlPctDirect : investedValue > 0 ? (pnl / investedValue) * 100 : 0);
  const mode = raw?.mode || "DELIVERY";
  return {
    id: raw?._id || raw?.id || `${symbol}-${index}`,
    symbol, name, quantity, avgPrice, currentPrice, sector, mode,
    updatedAt: getHoldingUpdatedAt(raw),
    investedValue, marketValue, pnl, pnlPct,
    spark: generateTinyTrend(investedValue || avgPrice, marketValue || currentPrice, pnl >= 0),
  };
}

/* ========================= SELL MODAL ========================= */

function SellModal({ holding, onClose, onSuccess }) {
  const [sellQty, setSellQty] = useState(holding?.quantity ?? 1);
  const [orderMode, setOrderMode] = useState("DELIVERY");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const maxQty = holding?.quantity ?? 1;
  const sellPrice = holding?.currentPrice ?? holding?.avgPrice ?? 0;
  const sellValue = round2(Number(sellQty) * sellPrice);
  const costBasis = round2(Number(sellQty) * (holding?.avgPrice ?? 0));
  const pnlPreview = round2(sellValue - costBasis);
  const isProfit = pnlPreview >= 0;

  // Lock background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleConfirm = async () => {
    try {
      setError("");
      setSuccess("");
      const userId = getUserIdFromStorage();
      if (!userId) { setError("User not found. Please login again."); return; }
      const qty = Number(sellQty);
      if (!qty || qty <= 0) { setError("Quantity must be greater than 0."); return; }
      if (qty > maxQty) { setError(`You can sell at most ${maxQty} shares.`); return; }
      if (!sellPrice || sellPrice <= 0) { setError("Live price is not available. Please try again."); return; }
      setPlacing(true);
      const payload = {
        userId,
        symbol: holding.symbol,
        type: "SELL",
        quantity: qty,
        price: sellPrice,
        mode: orderMode,
        currentPrice: sellPrice,
        sector: holding.sector || "Others",
      };
      const res = await fetch(`${API_BASE_URL}/orders/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to place sell order.");
      setSuccess(data.message || `Sell order placed — SELL ${qty} ${holding.symbol} @ ${formatMoney(sellPrice)}`);
      window.dispatchEvent(new Event("orders-updated"));
      window.dispatchEvent(new Event("holding-updated"));
      window.dispatchEvent(new Event("portfolio-updated"));
      setTimeout(() => { onSuccess && onSuccess(); onClose(); }, 900);
    } catch (err) {
      setError(err?.message || "Failed to place sell order.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Sell {holding.symbol}</h2>
            <p className="text-xs text-rose-100 mt-0.5">{holding.name} · {holding.sector}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={placing}
            className="rounded-xl border border-rose-400/50 bg-rose-400/20 p-2 text-white hover:bg-rose-400/40 transition disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Holding summary */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-gray-400 font-medium">Avg Buy Price</div>
              <div className="mt-1 font-bold text-gray-900">{formatMoney(holding.avgPrice)}</div>
            </div>
            <div>
              <div className="text-gray-400 font-medium">Live Price</div>
              <div className="mt-1 font-bold text-gray-900">{formatMoney(sellPrice)}</div>
            </div>
            <div>
              <div className="text-gray-400 font-medium">You Hold</div>
              <div className="mt-1 font-bold text-gray-900">{formatNum(maxQty)} shares</div>
            </div>
          </div>

          {/* Order Mode */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Order Mode</label>
            <div className="flex gap-2">
              {["DELIVERY", "INTRADAY"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setOrderMode(m)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
                    orderMode === m
                      ? "border-rose-500 bg-rose-500 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {m.charAt(0) + m.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Sell Quantity</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSellQty((q) => Math.max(1, Number(q) - 1))}
                className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
              >−</button>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={sellQty}
                onChange={(e) => setSellQty(Math.min(Math.max(1, Number(e.target.value)), maxQty))}
                className="flex-1 rounded-xl border border-gray-200 p-2.5 text-center text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
              <button
                type="button"
                onClick={() => setSellQty((q) => Math.min(Number(q) + 1, maxQty))}
                className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
              >+</button>
              <button
                type="button"
                onClick={() => setSellQty(maxQty)}
                className="rounded-xl bg-gray-100 px-3.5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-200 transition"
              >MAX</button>
            </div>
          </div>

          {/* P&L Preview */}
          <div className={`rounded-2xl p-4 ${isProfit ? "bg-emerald-50 ring-1 ring-emerald-100" : "bg-rose-50 ring-1 ring-rose-100"}`}>
            <div className="text-xs font-semibold text-gray-500 mb-3">Sell Preview</div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-gray-400">Sell Price</div>
                <div className="mt-1 font-bold text-gray-900">{formatMoney(sellPrice)}</div>
              </div>
              <div>
                <div className="text-gray-400">Sell Value</div>
                <div className="mt-1 font-bold text-gray-900">{formatMoney(sellValue)}</div>
              </div>
              <div>
                <div className="text-gray-400">Realised P&amp;L</div>
                <div className={`mt-1 font-bold text-base ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                  {isProfit ? "+" : ""}{formatMoney(pnlPreview)}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600 font-medium">{error}</div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600 font-medium">{success}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={placing}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >Cancel</button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={placing || !!success}
              className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white hover:bg-rose-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {placing ? "Placing..." : "Confirm Sell"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================= UI PARTS ========================= */

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-20 top-10 h-72 w-72 animate-pulse rounded-full bg-blue-200/30 blur-3xl" />
      <div className="absolute right-0 top-40 h-80 w-80 animate-pulse rounded-full bg-violet-200/30 blur-3xl [animation-delay:700ms]" />
      <div className="absolute bottom-0 left-1/3 h-80 w-80 animate-pulse rounded-full bg-emerald-200/20 blur-3xl [animation-delay:1200ms]" />
    </div>
  );
}

function CardShell({ children, className = "" }) {
  return (
    <div className={`rounded-3xl border border-white/60 bg-white/85 shadow-[0_10px_35px_rgba(15,23,42,0.08)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)] ${className}`}>
      {children}
    </div>
  );
}

function MiniSparkline({ points = [], positive = true }) {
  if (!points.length) return null;
  const width = 120, height = 42, pad = 4;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const line = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-28 overflow-visible">
      <polyline points={line} fill="none" stroke={positive ? "#10b981" : "#f43f5e"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
    </svg>
  );
}

function LiveDot({ positive = true }) {
  return (
    <span className="relative inline-flex h-3 w-3">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${positive ? "bg-emerald-400" : "bg-rose-400"} opacity-60`} />
      <span className={`relative inline-flex h-3 w-3 rounded-full ${positive ? "bg-emerald-500" : "bg-rose-500"}`} />
    </span>
  );
}

function StatCard({ title, value, subValue, positive, icon }) {
  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-gray-500">{title}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
          {subValue ? (
            <div className={`mt-2 text-sm font-semibold ${positive === true ? "text-emerald-600" : positive === false ? "text-rose-600" : "text-gray-500"}`}>
              {subValue}
            </div>
          ) : null}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 text-lg shadow-inner">
          {icon}
        </div>
      </div>
    </CardShell>
  );
}

function SectionCard({ title, subtitle, children, right }) {
  return (
    <CardShell className="p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </CardShell>
  );
}

function MetricBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-gray-50 to-white p-3 ring-1 ring-gray-100">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

/* ========================= HOLDING CARD ========================= */

function HoldingCard({ holding, index, onSell }) {
  const positive = holding.pnl >= 0;

  return (
    <div
      className="group rounded-3xl border border-gray-200/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-bold text-gray-900">{holding.symbol}</div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
              {holding.sector}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
              {holding.mode}
            </span>
            <div className="flex items-center gap-2 rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-700">
              <LiveDot positive={positive} />
              Live
            </div>
          </div>
          <div className="mt-1 text-xs text-gray-500">{holding.name}</div>
          <div className="mt-1 text-xs text-gray-500">Updated: {formatDateTime(holding.updatedAt)}</div>
        </div>

        <div className="flex items-center gap-4">
          <MiniSparkline points={holding.spark} positive={positive} />

          <div className={`rounded-2xl px-3 py-2 text-right ${positive ? "bg-emerald-50" : "bg-rose-50"}`}>
            <div className={`text-sm font-bold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
              {holding.pnl >= 0 ? "+" : ""}{formatMoney(holding.pnl)}
            </div>
            <div className={`text-xs font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
              {formatPct(holding.pnlPct)}
            </div>
          </div>

          {/* ── SELL BUTTON ── */}
          <button
            type="button"
            onClick={() => onSell(holding)}
            className="flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:shadow-md active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-10 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sell
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricBox label="Quantity" value={formatNum(holding.quantity)} />
        <MetricBox label="Avg Price" value={formatMoney(holding.avgPrice)} />
        <MetricBox label="Current Price" value={formatMoney(holding.currentPrice)} />
        <MetricBox label="Invested" value={formatMoney(holding.investedValue)} />
        <MetricBox label="Market Value" value={formatMoney(holding.marketValue)} />
      </div>
    </div>
  );
}

function AllocationBar({ data, total }) {
  if (!data.length || total <= 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
        No allocation data available.
      </div>
    );
  }
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-gray-100 shadow-inner">
        {data.map((item, i) => (
          <div
            key={item.label}
            style={{ width: `${(item.value / total) * 100}%`, backgroundColor: getColorByIndex(i), animationDelay: `${i * 120}ms` }}
            className="transition-all duration-700"
            title={`${item.label}: ${formatNum(item.value)}`}
          />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {data.map((item, i) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: getColorByIndex(i) }} />
                <span className="truncate text-sm font-medium text-gray-700">{item.label}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{formatMoney(item.value)}</div>
                <div className="text-xs text-gray-500">{pct.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutChart({ data, total }) {
  if (!data.length || total <= 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-3xl bg-gray-50 text-sm text-gray-500">
        No sector data
      </div>
    );
  }
  let current = 0;
  const gradient = data.map((item, i) => {
    const start = current;
    const end = current + (item.value / total) * 100;
    current = end;
    return `${getColorByIndex(i)} ${start}% ${end}%`;
  }).join(", ");
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="relative h-56 w-56 rounded-full shadow-[inset_0_10px_20px_rgba(255,255,255,0.4)] transition duration-500 hover:scale-[1.03]"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="absolute inset-0 animate-[spin_20s_linear_infinite] rounded-full opacity-[0.06] bg-[conic-gradient(from_90deg,transparent,white,transparent)]" />
        <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <div className="text-xs font-medium text-gray-500">Total Value</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{formatMoney(total)}</div>
        </div>
      </div>
    </div>
  );
}

function SectorAnimatedList({ data, total }) {
  if (!data.length || total <= 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="mt-6 space-y-3">
      {data.map((item, i) => {
        const pct = (item.value / total) * 100;
        const bar = (item.value / max) * 100;
        const positive = i % 2 === 0;
        return (
          <div key={item.label} className="rounded-2xl bg-gray-50/80 p-3 ring-1 ring-gray-100">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: getColorByIndex(i) }} />
                <span className="text-sm font-semibold text-gray-800">{item.label}</span>
              </div>
              <div className="text-xs font-semibold text-gray-500">{pct.toFixed(1)}%</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white shadow-inner">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${bar}%`, background: `linear-gradient(90deg, ${getColorByIndex(i)}, ${getColorByIndex(i + 1)})` }}
                />
                <div className="absolute inset-0 animate-pulse bg-white/10" />
              </div>
              <MiniSparkline points={generateTinyTrend(item.value * 0.92, item.value, positive)} positive={positive} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PerformanceBars({ data }) {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
        No performance data available.
      </div>
    );
  }
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.pnlPct)), 1);
  return (
    <div className="space-y-4">
      {data.map((item, idx) => {
        const isPositive = item.pnlPct >= 0;
        const width = `${(Math.abs(item.pnlPct) / maxAbs) * 100}%`;
        return (
          <div key={item.id}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">{item.symbol}</div>
                <div className="text-xs text-gray-500">{item.sector}</div>
              </div>
              <div className={`text-sm font-bold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                {formatPct(item.pnlPct)}
              </div>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${isPositive ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-rose-400 to-rose-600"}`}
                style={{ width, animationDelay: `${idx * 100}ms` }}
              />
              <div className="absolute inset-0 animate-pulse bg-white/10" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PortfolioTrend({ data }) {
  if (!data.length) {
    return (
      <div className="flex h-60 items-center justify-center rounded-3xl bg-gray-50 text-sm text-gray-500">
        No trend data
      </div>
    );
  }
  const width = 900, height = 240, padding = 20;
  const values = data.map((d) => d.value);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;
  const last = data[data.length - 1], first = data[0];
  const change = last.value - first.value;
  const changePct = first.value > 0 ? (change / first.value) * 100 : 0;
  const positive = change >= 0;
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Portfolio Trend</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{formatMoney(last.value)}</div>
        </div>
        <div className={`rounded-full px-3 py-1 text-sm font-semibold ${positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
          {change >= 0 ? "+" : ""}{formatMoney(change)} ({formatPct(changePct)})
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-60 w-full">
        <defs>
          <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={positive ? "#10b981" : "#f43f5e"} stopOpacity="0.24" />
            <stop offset="100%" stopColor={positive ? "#10b981" : "#f43f5e"} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="2" />
        <polygon points={areaPoints} fill="url(#portfolioFill)" />
        <polyline points={points} fill="none" stroke={positive ? "#10b981" : "#f43f5e"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
          const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
          return (
            <g key={d.label}>
              <circle cx={x} cy={y} r="4.5" fill={positive ? "#10b981" : "#f43f5e"} />
              <text x={x} y={height - 4} textAnchor="middle" fontSize="12" fill="#6b7280">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ========================= MAIN PAGE ========================= */

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState([]);
  const [apiSummary, setApiSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Sell modal state
  const [sellTarget, setSellTarget] = useState(null);

  const fetchHoldings = useCallback(async (showRefreshState = false) => {
    const userId = getUserIdFromStorage();
    if (!userId) {
      setHoldings([]); setApiSummary(null);
      setError("User not found. Please login again.");
      setLoading(false); setRefreshing(false); return;
    }
    try {
      setError("");
      if (showRefreshState) setRefreshing(true); else setLoading(true);
      const response = await fetch(`${API_BASE_URL}/holdings/user/${userId}?t=${Date.now()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to fetch holdings");
      const rawHoldings = Array.isArray(data.holdings) ? data.holdings : [];
      setHoldings(rawHoldings);
      setApiSummary(data.summary || null);
      console.log("FULL HOLDINGS API RESPONSE:", data);
      console.log("RAW HOLDINGS ARRAY:", rawHoldings);
    } catch (err) {
      console.error("Fetch holdings error:", err);
      setHoldings([]); setApiSummary(null);
      setError(err.message || "Something went wrong while fetching holdings");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
    const handleRefresh = () => fetchHoldings(true);
    window.addEventListener("portfolio-updated", handleRefresh);
    window.addEventListener("orders-updated", handleRefresh);
    window.addEventListener("holding-updated", handleRefresh);
    const interval = setInterval(() => fetchHoldings(true), 15000);
    return () => {
      window.removeEventListener("portfolio-updated", handleRefresh);
      window.removeEventListener("orders-updated", handleRefresh);
      window.removeEventListener("holding-updated", handleRefresh);
      clearInterval(interval);
    };
  }, [fetchHoldings]);

  const normalizedHoldings = useMemo(() => holdings.map((h, i) => normalizeHolding(h, i)), [holdings]);

  useEffect(() => { console.log("NORMALIZED HOLDINGS:", normalizedHoldings); }, [normalizedHoldings]);

  const analytics = useMemo(() => {
    const totalInvested = round2(normalizedHoldings.reduce((sum, h) => sum + h.investedValue, 0));
    const totalMarketValue = round2(normalizedHoldings.reduce((sum, h) => sum + h.marketValue, 0));
    const totalPnL = round2(normalizedHoldings.reduce((sum, h) => sum + h.pnl, 0));
    const totalPnLPct = totalInvested > 0 ? round2((totalPnL / totalInvested) * 100) : 0;
    const totalStocks = normalizedHoldings.length;
    const winners = normalizedHoldings.filter((h) => h.pnl >= 0).length;
    const losers = normalizedHoldings.filter((h) => h.pnl < 0).length;
    const sectorMap = normalizedHoldings.reduce((acc, h) => { acc[h.sector] = (acc[h.sector] || 0) + h.marketValue; return acc; }, {});
    const sectorData = Object.entries(sectorMap).map(([label, value]) => ({ label, value: round2(value) })).sort((a, b) => b.value - a.value);
    const stockPerformance = [...normalizedHoldings].sort((a, b) => b.pnlPct - a.pnlPct);
    const topPerformer = stockPerformance[0] || null;
    const worstPerformer = stockPerformance[stockPerformance.length - 1] || null;
    const base = totalMarketValue || 0;
    const trendData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
      const factor = [0.93, 0.95, 0.98, 0.97, 1.01, 1.03, 1][i];
      return { label: day, value: round2(base * factor) };
    });
    return { totalInvested, totalMarketValue, totalPnL, totalPnLPct, totalStocks, winners, losers, sectorData, stockPerformance, topPerformer, worstPerformer, trendData };
  }, [normalizedHoldings]);

  const totalInvestedToShow = parseNumeric(apiSummary?.totalInvested) !== null ? round2(apiSummary.totalInvested) : analytics.totalInvested;
  const totalMarketValueToShow = parseNumeric(apiSummary?.totalMarketValue) !== null ? round2(apiSummary.totalMarketValue) : analytics.totalMarketValue;
  const totalPnLToShow = parseNumeric(apiSummary?.totalPnL) !== null ? round2(apiSummary.totalPnL) : analytics.totalPnL;
  const totalPnLPctToShow = totalInvestedToShow > 0 ? round2((totalPnLToShow / totalInvestedToShow) * 100) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#f8fbff,_#f8fafc_35%,_#ffffff_70%)] px-4 pb-10 pt-24 sm:px-6">
      <AnimatedBackground />

      {/* Sell Modal */}
      {sellTarget && (
        <SellModal
          holding={sellTarget}
          onClose={() => setSellTarget(null)}
          onSuccess={() => fetchHoldings(true)}
        />
      )}

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              <LiveDot positive />
              Portfolio Dashboard
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Holdings Overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Track invested capital, sector allocation, winners, losers, and portfolio performance with corrected holdings calculations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CardShell className="px-5 py-4">
              <div className="text-xs font-medium text-gray-500">Last synced</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{new Date().toLocaleString("en-IN")}</div>
            </CardShell>
            <button
              onClick={() => fetchHoldings(true)}
              disabled={refreshing}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:scale-[1.02] hover:from-blue-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">{error}</div>
        ) : null}

        {loading ? (
          <CardShell className="p-10 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <div className="text-lg font-semibold text-gray-900">Loading holdings...</div>
            <div className="mt-2 text-sm text-gray-500">Please wait while we fetch your portfolio data.</div>
          </CardShell>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Total Invested" value={formatMoney(totalInvestedToShow)} subValue={`${analytics.totalStocks} stock${analytics.totalStocks === 1 ? "" : "s"}`} icon="💰" />
              <StatCard title="Current Value" value={formatMoney(totalMarketValueToShow)} subValue="Live portfolio valuation" icon="📈" />
              <StatCard title="Overall P&L" value={`${totalPnLToShow >= 0 ? "+" : ""}${formatMoney(totalPnLToShow)}`} subValue={formatPct(totalPnLPctToShow)} positive={totalPnLToShow >= 0} icon={totalPnLToShow >= 0 ? "🟢" : "🔴"} />
              <StatCard title="Winners / Losers" value={`${analytics.winners} / ${analytics.losers}`} subValue="Based on current returns" icon="⚖️" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <SectionCard title="Portfolio Performance" subtitle="Weekly movement view based on current holdings valuation">
                  <PortfolioTrend data={analytics.trendData.map((item, idx, arr) => idx === arr.length - 1 ? { ...item, value: totalMarketValueToShow } : item)} />
                </SectionCard>
              </div>
              <div>
                <SectionCard title="Sector Allocation" subtitle="Distribution by sector with improved mapping">
                  <DonutChart data={analytics.sectorData} total={totalMarketValueToShow} />
                  <SectorAnimatedList data={analytics.sectorData} total={totalMarketValueToShow} />
                  <div className="mt-6">
                    <AllocationBar data={analytics.sectorData} total={totalMarketValueToShow} />
                  </div>
                </SectionCard>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <SectionCard title="Stock Performance" subtitle="Animated return contribution of each holding">
                  <PerformanceBars data={analytics.stockPerformance} />
                </SectionCard>
              </div>
              <div className="space-y-6">
                <SectionCard title="Best Performer" subtitle="Highest return in your portfolio">
                  {analytics.topPerformer ? (
                    <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-white p-5 ring-1 ring-emerald-100">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-emerald-700">{analytics.topPerformer.symbol}</div>
                        <LiveDot positive />
                      </div>
                      <div className="mt-1 text-sm text-emerald-600">{analytics.topPerformer.sector}</div>
                      <div className="mt-4 text-2xl font-bold text-emerald-700">{formatPct(analytics.topPerformer.pnlPct)}</div>
                      <div className="mt-1 text-sm font-medium text-emerald-700">{analytics.topPerformer.pnl >= 0 ? "+" : ""}{formatMoney(Math.abs(analytics.topPerformer.pnl))}</div>
                      <div className="mt-3"><MiniSparkline points={analytics.topPerformer.spark} positive /></div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">No data available.</div>
                  )}
                </SectionCard>
                <SectionCard title="Lowest Performer" subtitle="Weakest holding by return">
                  {analytics.worstPerformer ? (
                    <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-white p-5 ring-1 ring-rose-100">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-rose-700">{analytics.worstPerformer.symbol}</div>
                        <LiveDot positive={false} />
                      </div>
                      <div className="mt-1 text-sm text-rose-600">{analytics.worstPerformer.sector}</div>
                      <div className="mt-4 text-2xl font-bold text-rose-700">{formatPct(analytics.worstPerformer.pnlPct)}</div>
                      <div className="mt-1 text-sm font-medium text-rose-700">{formatMoney(analytics.worstPerformer.pnl)}</div>
                      <div className="mt-3"><MiniSparkline points={analytics.worstPerformer.spark} positive={false} /></div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">No data available.</div>
                  )}
                </SectionCard>
              </div>
            </div>

            <div className="mt-6">
              <SectionCard
                title="All Holdings"
                subtitle="Detailed view of each stock in your portfolio"
                right={
                  <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {normalizedHoldings.length} items
                  </div>
                }
              >
                {normalizedHoldings.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                    No holdings available.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {normalizedHoldings.map((holding, index) => (
                      <HoldingCard
                        key={holding.id}
                        holding={holding}
                        index={index}
                        onSell={(h) => setSellTarget(h)}
                      />
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
