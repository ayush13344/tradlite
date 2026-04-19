import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/* ================= ANIMATED NUMBER ================= */

function AnimatedNumber({ value }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!value && value !== 0) return;

    let start = 0;
    const duration = 800;
    const increment = value / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        start = value;
        clearInterval(timer);
      }
      setCount(start);
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {Number(count).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}
    </span>
  );
}

/* ================= HELPERS ================= */

function formatPrice(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactNumber(value, isCurrency = false) {
  const n = Number(value || 0);

  if (isCurrency) {
    if (n >= 1e12) return `₹${(n / 1e12).toFixed(1)} T`;
    if (n >= 1e9) return `₹${(n / 1e9).toFixed(1)} B`;
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
    return `₹${n.toLocaleString("en-IN")}`;
  }

  if (n >= 1e7) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e5) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString("en-IN");
}

function getInitials(symbol = "") {
  return symbol.slice(0, 2).toUpperCase();
}

function getColorFromSymbol(symbol = "") {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
}

function normalizeIndexName(name = "") {
  return String(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function buildSparkline(symbol = "", positive = true) {
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) {
    seed += symbol.charCodeAt(i);
  }

  let currentY = positive ? 62 : 38;
  const points = [];

  for (let i = 0; i < 8; i++) {
    const wave = ((seed + i * 13) % 12) - 6;
    currentY += positive ? -3 + wave * 0.4 : 3 + wave * 0.4;
    currentY = Math.max(12, Math.min(88, currentY));
    points.push({ x: 14 + i * 24, y: currentY });
  }

  if (positive) {
    points[points.length - 1].y = Math.max(10, points[points.length - 1].y - 5);
  } else {
    points[points.length - 1].y = Math.min(90, points[points.length - 1].y + 5);
  }

  return points;
}

/* ================= SIGNAL HELPERS ================= */

function normalizeSignal(rawSignal = "") {
  const value = String(rawSignal || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (["BUY", "STRONG_BUY", "BULLISH", "LONG"].includes(value)) return "BUY";
  if (["SELL", "STRONG_SELL", "BEARISH", "SHORT"].includes(value)) return "SELL";
  if (["HOLD", "NEUTRAL", "WAIT"].includes(value)) return "HOLD";
  if (["NO_SIGNAL", "NONE", "NA"].includes(value)) return "NO_SIGNAL";
  return "ANALYZING";
}

function getSignalMeta(rawSignal = "", confidence = 0) {
  const signal = normalizeSignal(rawSignal);
  const safeConfidence = Math.max(0, Math.min(100, Number(confidence || 0)));

  if (signal === "BUY") {
    return {
      label: "Buy",
      confidence: safeConfidence,
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      dot: "bg-emerald-500",
      bar: "bg-emerald-500",
      glow: "shadow-[0_12px_30px_rgba(16,185,129,0.22)]",
      hero: "from-emerald-500 via-teal-500 to-green-400",
      soft: "from-emerald-50 via-white to-teal-50",
      text: "text-emerald-700",
      sub: "text-emerald-600",
      icon: "▲",
      title: "Bullish Signal Detected",
      desc: "The model is currently seeing strength and upside bias in this stock.",
    };
  }

  if (signal === "SELL") {
    return {
      label: "Sell",
      confidence: safeConfidence,
      badge: "bg-rose-50 text-rose-700 border border-rose-200",
      dot: "bg-rose-500",
      bar: "bg-rose-500",
      glow: "shadow-[0_12px_30px_rgba(244,63,94,0.22)]",
      hero: "from-rose-500 via-pink-500 to-red-400",
      soft: "from-rose-50 via-white to-pink-50",
      text: "text-rose-700",
      sub: "text-rose-600",
      icon: "▼",
      title: "Bearish Signal Detected",
      desc: "The model is currently seeing weakness and downside pressure in this stock.",
    };
  }

  if (signal === "HOLD") {
    return {
      label: "Hold",
      confidence: safeConfidence,
      badge: "bg-amber-50 text-amber-700 border border-amber-200",
      dot: "bg-amber-500",
      bar: "bg-amber-500",
      glow: "shadow-[0_12px_30px_rgba(245,158,11,0.2)]",
      hero: "from-amber-500 via-yellow-500 to-orange-400",
      soft: "from-amber-50 via-white to-yellow-50",
      text: "text-amber-700",
      sub: "text-amber-600",
      icon: "•",
      title: "Hold Signal",
      desc: "The model suggests waiting for a better setup before taking action.",
    };
  }

  if (signal === "NO_SIGNAL") {
    return {
      label: "No Signal",
      confidence: 0,
      badge: "bg-slate-50 text-slate-700 border border-slate-200",
      dot: "bg-slate-400",
      bar: "bg-slate-400",
      glow: "shadow-[0_12px_30px_rgba(100,116,139,0.16)]",
      hero: "from-slate-700 via-slate-600 to-slate-500",
      soft: "from-slate-50 via-white to-slate-100",
      text: "text-slate-700",
      sub: "text-slate-500",
      icon: "—",
      title: "No Strong Signal",
      desc: "The model does not currently have a strong actionable setup for this stock.",
    };
  }

  return {
    label: "Analyzing",
    confidence: 0,
    badge: "bg-sky-50 text-sky-700 border border-sky-200",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
    glow: "shadow-[0_12px_30px_rgba(14,165,233,0.18)]",
    hero: "from-sky-500 via-cyan-500 to-indigo-400",
    soft: "from-sky-50 via-white to-cyan-50",
    text: "text-sky-700",
    sub: "text-sky-600",
    icon: "◌",
    title: "Signal Preparing",
    desc: "The model is still preparing the latest signal for this stock.",
  };
}

function MiniChart({ symbol, positive }) {
  const pts = useMemo(() => buildSparkline(symbol, positive), [symbol, positive]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${path} L ${pts[pts.length - 1].x} 95 L ${pts[0].x} 95 Z`;
  const gradientId = `mini-grad-${symbol.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg viewBox="0 0 210 100" className="w-full h-[78px]">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop
            offset="0%"
            stopColor={positive ? "#34d399" : "#fca5a5"}
            stopOpacity="0.35"
          />
          <stop
            offset="100%"
            stopColor={positive ? "#34d399" : "#fca5a5"}
            stopOpacity="0.03"
          />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={path}
        fill="none"
        stroke={positive ? "#10b981" : "#ef4444"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ================= REDESIGNED SIGNAL MODAL ================= */

function SignalModal({ open, onClose, stock, signalData, onOpenMl }) {
  if (!open || !stock) return null;

  const meta = getSignalMeta(signalData?.signal || "ANALYZING", signalData?.confidence || 0);
  const confidence = Number(signalData?.confidence || 0);
  const normalized = normalizeSignal(signalData?.signal || "ANALYZING");
  const showConfidence = ["BUY", "SELL", "HOLD"].includes(normalized);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-[34px] border border-white/40 bg-white/90 backdrop-blur-xl shadow-[0_35px_90px_rgba(15,23,42,0.32)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`relative overflow-hidden bg-gradient-to-r ${meta.hero} px-7 md:px-8 pt-7 pb-20 text-white`}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -left-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
          </div>

          <button
            onClick={onClose}
            className="absolute right-5 top-5 z-20 h-11 w-11 rounded-full border border-white/20 bg-white/10 text-xl font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            ×
          </button>

          <div className="relative z-10 flex items-start gap-4 pr-14">
            <div className={`h-16 w-16 rounded-[22px] bg-white/15 backdrop-blur-sm flex items-center justify-center text-2xl font-black text-white ${meta.glow}`}>
              {getInitials(stock.symbol)}
            </div>

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/80 font-bold">
                AI Signal Overview
              </p>
              <h3 className="mt-2 text-3xl md:text-4xl font-black leading-none truncate">
                {stock.symbol}
              </h3>
              <p className="mt-2 text-sm text-white/85 truncate">
                {stock.companyName || stock.name || "NSE Listed Company"}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-20 -mt-12 px-5 md:px-8 pb-7 md:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-5">
            <div className={`rounded-[30px] border border-white/70 bg-gradient-to-br ${meta.soft} p-6 md:p-7 shadow-[0_20px_45px_rgba(15,23,42,0.10)]`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-bold">
                    Current Signal
                  </p>
                  <h4 className={`mt-3 text-3xl md:text-4xl font-black ${meta.text}`}>
                    {meta.label}
                  </h4>
                  <p className={`mt-3 text-[1rem] leading-7 ${meta.sub}`}>
                    {meta.desc}
                  </p>
                </div>

                <div className={`h-16 w-16 rounded-[22px] bg-gradient-to-br ${meta.hero} flex items-center justify-center text-2xl font-black text-white ${meta.glow}`}>
                  {meta.icon}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className={`rounded-full px-4 py-2 text-sm font-bold ${meta.badge}`}>
                  {meta.label}
                </div>

                <div className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700">
                  Price: {formatPrice(stock.lastPrice || stock.price || 0)}
                </div>
              </div>

              {showConfidence ? (
                <div className="mt-7">
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600">
                    <span>Confidence Level</span>
                    <span>{confidence.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/80 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full ${meta.bar}`}
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-7 rounded-[18px] border border-slate-200 bg-white/80 px-4 py-4 text-sm font-semibold text-slate-500">
                  Confidence is not available for this signal right now.
                </div>
              )}

              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-[22px] border border-white/70 bg-white/80 p-4 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold">
                    Intraday Move
                  </p>
                  <p
                    className={`mt-2 text-2xl font-black ${
                      Number(stock.pChange || stock.change || 0) >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {Number(stock.pChange || stock.change || 0) >= 0 ? "+" : ""}
                    {Number(stock.pChange || stock.change || 0).toFixed(2)}%
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/70 bg-white/80 p-4 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold">
                    Traded Volume
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {formatCompactNumber(stock.totalTradedVolume || stock.volume || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-100 bg-white/95 p-6 md:p-7 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-bold">
                Quick Summary
              </p>

              <div className="mt-5 space-y-4">
                <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Stock
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-900">
                    {stock.symbol}
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Signal Status
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${meta.dot}`} />
                    <p className={`text-xl font-black ${meta.text}`}>{meta.title}</p>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Market Price
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-900">
                    {formatPrice(stock.lastPrice || stock.price || 0)}
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Day Change
                  </p>
                  <p
                    className={`mt-2 text-xl font-black ${
                      Number(stock.pChange || stock.change || 0) >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {Number(stock.pChange || stock.change || 0) >= 0 ? "+" : ""}
                    {Number(stock.pChange || stock.change || 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={onClose}
                  className="rounded-[18px] border border-slate-200 bg-white py-4 text-[1rem] font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenMl?.(stock.symbol);
                  }}
                  className="rounded-[18px] bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 py-4 text-[1rem] font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5"
                >
                  Open ML Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketStockCard({
  stock,
  rank,
  type = "gainer",
  onClick,
  onOpenSignal,
}) {
  const positive = type !== "loser";
  const hue = getColorFromSymbol(stock.symbol || "ST");
  const volumeValue = stock.totalTradedVolume || stock.volume || 0;
  const marketCapValue = stock.marketCap || stock.totalMarketCap || 0;

  return (
    <div className="group w-full rounded-[24px] bg-white border border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.08)] p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(15,23,42,0.12)]">
      <div
        onClick={onClick}
        className="cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{
                background: `linear-gradient(135deg, hsl(${hue} 85% 62%), hsl(${(hue + 28) % 360} 85% 55%))`,
              }}
            >
              {getInitials(stock.symbol)}
            </div>
            <div className="min-w-0">
              <h3 className="text-[1.55rem] font-extrabold text-slate-900 leading-none truncate">
                {stock.symbol}
              </h3>
              <p className="mt-1 text-sm text-slate-500 truncate">
                {stock.companyName || stock.name || "NSE Listed Company"}
              </p>
            </div>
          </div>
          <div
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
              positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            #{rank}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_118px] gap-3 items-end">
          <div className="min-w-0">
            <div className="text-[2rem] font-black tracking-tight text-slate-900 leading-none">
              {formatPrice(stock.lastPrice || stock.price || 0)}
            </div>
            <div
              className={`mt-3 text-[1rem] font-bold ${
                positive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {positive ? "▲" : "▼"}{" "}
              {Math.abs(Number(stock.pChange || stock.change || 0)).toFixed(2)}% Today
            </div>
          </div>
          <div className="w-full">
            <MiniChart symbol={stock.symbol || "STOCK"} positive={positive} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          <span className="font-semibold">AI Signal Available</span>
        </div>

        <button
          onClick={onOpenSignal}
          className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          View Signal
        </button>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3 flex items-center justify-between gap-3 text-sm text-slate-500">
        <div className="truncate">
          Volume{" "}
          <span className="text-slate-700 font-semibold">
            {formatCompactNumber(volumeValue)}
          </span>
        </div>
        <div className="truncate text-right">
          Market Cap{" "}
          <span className="text-slate-700 font-semibold">
            {marketCapValue ? formatCompactNumber(marketCapValue, true) : "--"}
          </span>
        </div>
      </div>
    </div>
  );
}

function MlSearchSection({
  inputSymbol,
  setInputSymbol,
  onSubmit,
  onQuickPick,
}) {
  const quickSymbols = ["TCS", "INFY", "RELIANCE", "HDFCBANK", "ICICIBANK", "SBIN"];

  return (
    <section className="pt-2">
      <div className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-10 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl animate-pulse" />
          <div className="absolute top-0 right-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-300/15 blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-0">
          <div className="px-8 md:px-10 py-10 md:py-12 border-b xl:border-b-0 xl:border-r border-white/60">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/75 border border-slate-200 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-600 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              AI Prediction Search
            </div>

            <h2 className="mt-6 text-4xl md:text-5xl font-black tracking-tight leading-[1.05] text-slate-900">
              Open the ML page
              <span className="block bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 bg-clip-text text-transparent">
                directly from market
              </span>
            </h2>

            <p className="mt-5 max-w-2xl text-[1.04rem] leading-8 text-slate-500">
              Search any stock symbol and jump straight to your ML prediction workspace.
              This keeps the flow simple while matching the same premium market-page look.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  Fast Access
                </p>
                <p className="mt-3 text-lg font-bold text-slate-900">
                  Direct ML Entry
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Jump to prediction view without opening extra pages first.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  Smart Flow
                </p>
                <p className="mt-3 text-lg font-bold text-slate-900">
                  Symbol Based
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Open the ML page with the exact stock symbol selected.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  Better UI
                </p>
                <p className="mt-3 text-lg font-bold text-slate-900">
                  Theme Matched
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Built to match the same premium card style of this page.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {quickSymbols.map((item) => (
                <button
                  key={item}
                  onClick={() => onQuickPick(item)}
                  className="group rounded-full border border-white/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-300 transition group-hover:bg-emerald-500" />
                    {item}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-8 md:px-10 py-10 md:py-12">
            <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-white to-slate-50 p-6 md:p-7 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Prediction Launcher
                  </p>
                  <h3 className="mt-2 text-3xl font-black text-slate-900">
                    Search stock symbol
                  </h3>
                </div>

                <div className="hidden sm:flex h-14 w-14 rounded-[18px] bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 items-center justify-center text-white text-2xl shadow-[0_12px_24px_rgba(16,185,129,0.25)] animate-bounce [animation-duration:2.4s]">
                  ↗
                </div>
              </div>

              <p className="mt-4 text-[1rem] leading-7 text-slate-500">
                Enter any stock symbol and move directly to your ML prediction page.
              </p>

              <form onSubmit={onSubmit} className="mt-7 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Stock Symbol
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputSymbol}
                      onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                      placeholder="Search like TCS, INFY, RELIANCE"
                      className="w-full rounded-[20px] border border-slate-200 bg-slate-50/80 px-5 py-4 pr-20 text-lg font-semibold text-slate-900 outline-none transition-all duration-300 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[14px] bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm">
                      NSE
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="group w-full rounded-[20px] bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 text-white text-[1.06rem] font-semibold py-4 shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.22)]"
                >
                  <span className="inline-flex items-center justify-center gap-3">
                    Open ML Prediction Page
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </button>
              </form>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition duration-300 hover:bg-white">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    View Includes
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-700 leading-6">
                    Signal, trend, confidence, and ML price prediction details.
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition duration-300 hover:bg-white">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Quick Route
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-700 leading-6">
                    Designed for one-click access from market page to ML page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InvestmentIdeaCard({ icon, title, description, onClick }) {
  return (
    <div className="rounded-[28px] bg-white border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.08)] px-8 py-10 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
      <div className="text-6xl mb-8">{icon}</div>
      <h3 className="text-[2rem] leading-tight font-bold text-slate-900 min-h-[96px] flex items-center justify-center">
        {title}
      </h3>
      <p className="mt-5 text-[1.08rem] leading-9 text-slate-500 max-w-[320px] mx-auto min-h-[120px] flex items-center justify-center">
        {description}
      </p>
      <button
        onClick={onClick}
        className="mt-8 w-full rounded-[18px] bg-gradient-to-r from-[#36c9b4] to-[#49c7a8] text-white text-[1.15rem] font-semibold py-5 shadow-[0_12px_25px_rgba(54,201,180,0.28)] transition hover:scale-[1.02]"
      >
        Explore →
      </button>
    </div>
  );
}

function TradeJournalCard({ icon, title, description, buttonText, onClick }) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] px-8 py-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-5">
          <div className="h-20 w-20 rounded-[24px] bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 flex items-center justify-center text-4xl text-white shadow-[0_14px_34px_rgba(99,102,241,0.28)]">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-[2rem] leading-tight font-bold text-slate-900">
              {title}
            </h3>
            <p className="mt-4 text-[1.05rem] leading-8 text-slate-500">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-[20px] bg-slate-50 border border-slate-100 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Notes</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">Store trade reasoning</p>
          </div>
          <div className="rounded-[20px] bg-slate-50 border border-slate-100 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Review</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">Check stock-wise history</p>
          </div>
          <div className="rounded-[20px] bg-slate-50 border border-slate-100 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Learn</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">Track mistakes and lessons</p>
          </div>
        </div>

        <button
          onClick={onClick}
          className="mt-8 w-full md:w-fit rounded-[18px] bg-gradient-to-r from-indigo-600 to-violet-500 text-white text-[1.08rem] font-semibold px-8 py-4 shadow-[0_12px_25px_rgba(99,102,241,0.28)] transition hover:scale-[1.02]"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}

/* ================= MARKET PAGE ================= */

export default function MarketPage() {
  const navigate = useNavigate();

  const ML_PAGE_ROUTE = "/stock-ml";

  const [indices, setIndices] = useState([]);
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [breadth, setBreadth] = useState(null);
  const [volume, setVolume] = useState([]);
  const [activeTab, setActiveTab] = useState("gainers");
  const [signals, setSignals] = useState({});
  const [mlInput, setMlInput] = useState("TCS");

  const [selectedSignalStock, setSelectedSignalStock] = useState(null);
  const [signalModalOpen, setSignalModalOpen] = useState(false);

  const tabs = [
    { key: "gainers", label: "Top Gainers" },
    { key: "losers", label: "Top Losers" },
    { key: "volume", label: "Most Active" },
  ];

  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/market/dashboard");
        const data = res.data?.data;
        if (!data) return;

        setIndices(data.overview || []);
        setBreadth(data.breadth || null);

        setGainers(
          [...(data.gainers || [])]
            .sort((a, b) => (b.pChange || 0) - (a.pChange || 0))
            .slice(0, 6)
        );
        setLosers(
          [...(data.losers || [])]
            .sort((a, b) => (a.pChange || 0) - (b.pChange || 0))
            .slice(0, 6)
        );
        setVolume(
          [...(data.volume || [])]
            .sort(
              (a, b) =>
                (b.totalTradedVolume || b.volume || 0) -
                (a.totalTradedVolume || a.volume || 0)
            )
            .slice(0, 6)
        );
      } catch (err) {
        console.error("Market API Error:", err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const allStocks = [...gainers, ...losers, ...volume];
    const uniqueSymbols = [
      ...new Set(allStocks.map((item) => item?.symbol).filter(Boolean)),
    ];

    if (!uniqueSymbols.length) return;

    const fetchSignals = async () => {
      try {
        const results = await Promise.allSettled(
          uniqueSymbols.map(async (symbol) => {
            try {
              const cleanSymbol = String(symbol)
                .trim()
                .toUpperCase()
                .split(":")[0]
                .replace(/\.NS$/i, "")
                .replace(/\.BO$/i, "")
                .replace(/-INR$/i, "")
                .replace(/-USD$/i, "")
                .replace(/[^A-Z0-9]/g, "");

              const res = await axios.get(
                `http://127.0.0.1:8000/predict/signal/${encodeURIComponent(cleanSymbol)}`
              );

              const data = res?.data || {};

              return {
                symbol,
                signal:
                  data?.signal ||
                  data?.prediction ||
                  data?.label ||
                  data?.action ||
                  "NO_SIGNAL",
                confidence: Number(
                  data?.confidence ??
                    data?.probability ??
                    data?.score ??
                    data?.strength ??
                    0
                ),
              };
            } catch {
              return { symbol, signal: "NO_SIGNAL", confidence: 0 };
            }
          })
        );

        const nextSignals = {};
        results.forEach((result, index) => {
          const symbol = uniqueSymbols[index];
          if (result.status === "fulfilled") {
            nextSignals[symbol] = {
              signal: result.value?.signal || "NO_SIGNAL",
              confidence: Number(result.value?.confidence || 0),
            };
          } else {
            nextSignals[symbol] = { signal: "NO_SIGNAL", confidence: 0 };
          }
        });

        setSignals(nextSignals);
      } catch (err) {
        console.error("Signal API Error:", err);
      }
    };

    fetchSignals();
  }, [gainers, losers, volume]);

  const tickerIndices = useMemo(() => {
    const desiredTickerNames = [
      "NIFTY 50",
      "NIFTY BANK",
      "NIFTY FIN SERVICE",
      "NIFTY IT",
      "NIFTY METAL",
      "NIFTY 100",
      "SENSEX",
    ];

    const fallbackTickerItems = [
      { name: "NIFTY 50", price: "--", change: 0 },
      { name: "NIFTY BANK", price: "--", change: 0 },
      { name: "NIFTY FIN SERVICE", price: "--", change: 0 },
      { name: "NIFTY IT", price: "--", change: 0 },
      { name: "NIFTY METAL", price: "--", change: 0 },
      { name: "NIFTY 100", price: "--", change: 0 },
      { name: "SENSEX", price: "--", change: 0 },
    ];

    const merged = desiredTickerNames.map((wantedName) => {
      const match = indices.find((item) => {
        const current = normalizeIndexName(item?.name);
        const wanted = normalizeIndexName(wantedName);
        return current === wanted || current.includes(wanted) || wanted.includes(current);
      });

      if (match) return match;

      return (
        fallbackTickerItems.find(
          (item) => normalizeIndexName(item.name) === normalizeIndexName(wantedName)
        ) || { name: wantedName, price: "--", change: 0 }
      );
    });

    return [...merged, ...merged];
  }, [indices]);

  const openMlPage = (symbol) => {
    const cleaned = String(symbol || "").trim().toUpperCase();
    if (!cleaned) return;

    navigate(ML_PAGE_ROUTE, {
      state: { symbol: cleaned },
    });
  };

  const handleMlSearch = (e) => {
    e.preventDefault();
    openMlPage(mlInput);
  };

  const handleOpenSignalModal = (stock) => {
    setSelectedSignalStock(stock);
    setSignalModalOpen(true);
  };

  const handleCloseSignalModal = () => {
    setSignalModalOpen(false);
    setSelectedSignalStock(null);
  };

  if (!indices.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl font-semibold">
        Loading Market...
      </div>
    );
  }

  const niftyDown = indices[0]?.change < 0;
  const activeList =
    activeTab === "gainers" ? gainers : activeTab === "losers" ? losers : volume;

  return (
    <>
      <div
        className={`min-h-screen transition-all duration-700 ${
          niftyDown
            ? "bg-gradient-to-br from-rose-200 via-white to-rose-50"
            : "bg-gradient-to-br from-emerald-200 via-white to-emerald-50"
        }`}
      >
        <div className="max-w-[1450px] mx-auto px-8 py-16 space-y-20">
          <section className="text-center">
            <p className="text-sm text-slate-600 uppercase tracking-widest mb-4">
              {indices[0]?.name}
            </p>
            <h1 className="text-7xl font-bold mb-6">
              <AnimatedNumber value={indices[0]?.price} />
            </h1>
            <p
              className={`text-2xl font-semibold ${
                niftyDown ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {indices[0]?.change > 0 ? "+" : ""}
              {indices[0]?.change?.toFixed(2)}%
            </p>
          </section>

          {breadth && (
            <section className="text-center space-y-6">
              <div className="flex justify-center gap-16 text-lg font-semibold">
                <div className="text-green-600">Advances: {breadth.advances}</div>
                <div className="text-red-600">Declines: {breadth.declines}</div>
                <div>Unchanged: {breadth.unchanged}</div>
              </div>

              <div className="overflow-hidden bg-black text-white py-3 rounded-xl">
                <div className="animate-[ticker_45s_linear_infinite] whitespace-nowrap">
                  {tickerIndices.map((index, i) => (
                    <span key={`${index.name}-${i}`} className="mx-10 font-semibold">
                      {index.name} : {index.price}{" "}
                      <span
                        className={
                          Number(index.change) >= 0 ? "text-green-400" : "text-red-400"
                        }
                      >
                        ({Number(index.change) >= 0 ? "+" : ""}
                        {Number(index.change || 0).toFixed(2)}%)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          <style>
            {`
              @keyframes ticker {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
            `}
          </style>

          <section className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <h2 className="text-4xl font-black tracking-tight text-slate-900">
                  Market Movers
                </h2>
                <p className="mt-1 text-slate-500 text-base">
                  Switch between gainers, losers, and most active stocks
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="h-14 w-14 rounded-2xl bg-white/90 backdrop-blur-md border border-white/70 text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.08)] text-xl transition hover:-translate-y-0.5 hover:text-slate-800">
                  ☰
                </button>
                <button className="h-14 w-14 rounded-2xl bg-white/90 backdrop-blur-md border border-white/70 text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.08)] text-xl transition hover:-translate-y-0.5 hover:text-slate-800">
                  ⋮
                </button>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.08)] p-4 md:p-5">
              <div className="w-full overflow-x-auto">
                <div className="relative grid grid-cols-3 min-w-[680px] rounded-[24px] bg-gradient-to-r from-slate-100 via-white to-slate-100 p-2 border border-slate-200/80 shadow-inner">
                  <div
                    className={`absolute top-2 bottom-2 w-[calc(33.333%-5.33px)] rounded-[18px] shadow-[0_12px_28px_rgba(15,23,42,0.10)] border transition-all duration-300 ${
                      activeTab === "losers"
                        ? "bg-gradient-to-r from-rose-500 to-rose-400 border-rose-300"
                        : activeTab === "volume"
                        ? "bg-gradient-to-r from-indigo-600 to-violet-500 border-indigo-400"
                        : "bg-gradient-to-r from-emerald-500 to-teal-400 border-emerald-300"
                    }`}
                    style={{ left: `calc(${activeIndex * 33.333}% + 8px)` }}
                  />

                  {tabs.map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`relative z-10 rounded-[18px] px-6 py-4 text-[1.02rem] font-bold transition-all duration-300 ${
                          active ? "text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              active
                                ? "bg-white/95"
                                : tab.key === "losers"
                                ? "bg-rose-400"
                                : tab.key === "volume"
                                ? "bg-indigo-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span>{tab.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 px-1">
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900">
                    {activeTab === "gainers"
                      ? "Top Gainers"
                      : activeTab === "losers"
                      ? "Top Losers"
                      : "Most Active Stocks"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {activeTab === "gainers"
                      ? "Stocks leading the market with the strongest upside moves."
                      : activeTab === "losers"
                      ? "Stocks under pressure with the biggest declines today."
                      : "Stocks with the highest trading activity and market participation."}
                  </p>
                </div>
                <div
                  className={`hidden md:flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                    activeTab === "losers"
                      ? "bg-rose-50 text-rose-600"
                      : activeTab === "volume"
                      ? "bg-indigo-50 text-indigo-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  Live Section
                </div>
              </div>

              <div className="mt-6 border-b border-slate-200/80" />

              <div className="mt-7 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {activeList.map((stock, i) => (
                  <MarketStockCard
                    key={`${activeTab}-${stock.symbol}-${i}`}
                    stock={stock}
                    rank={i + 1}
                    type={activeTab === "losers" ? "loser" : "gainer"}
                    onOpenSignal={() => handleOpenSignalModal(stock)}
                    onClick={() =>
                      navigate("/charts", { state: { symbol: stock.symbol } })
                    }
                  />
                ))}
              </div>
            </div>
          </section>

          <MlSearchSection
            inputSymbol={mlInput}
            setInputSymbol={setMlInput}
            onSubmit={handleMlSearch}
            onQuickPick={openMlPage}
          />

          <section className="pt-2">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
              <div>
                <h2 className="text-5xl font-black tracking-tight text-slate-900">
                  Trade Journal
                </h2>
                <p className="mt-3 text-[1.05rem] text-slate-500 max-w-3xl leading-8">
                  Review your stock-wise journal history, revisit your trading notes,
                  understand past mistakes, and build a stronger process with every trade.
                </p>
              </div>
              <button
                onClick={() => navigate("/journal")}
                className="w-full lg:w-auto rounded-[18px] bg-white border border-slate-200 px-7 py-4 text-slate-800 text-[1rem] font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5"
              >
                Open Journal History →
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <TradeJournalCard
                icon="📓"
                title="View Full Journal History"
                description="Open your dedicated trade journal history page and view all journal entries written for a particular stock. This helps you track repeated setups, emotional patterns, and your decision-making quality over time."
                buttonText="View Trade Journal History"
                onClick={() => navigate("/journal")}
              />
              <TradeJournalCard
                icon="🧠"
                title="Review Stock-wise Notes"
                description="Jump to the journal history page and search any stock symbol like RELIANCE, TCS, INFY, or HDFCBANK to see all saved journal entries for that stock in one place with notes, lessons, rating, and P&L summary."
                buttonText="Search Stock Journal"
                onClick={() => navigate("/journal", { state: { fromMarket: true } })}
              />
            </div>
          </section>

          <section className="pt-4">
            <h2 className="text-center text-6xl font-black tracking-tight text-slate-900 mb-14">
              Investment Ideas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
              <InvestmentIdeaCard
                icon="📈"
                title="Long Term Picks"
                description="Strong businesses with growth potential for patient investors building wealth over 3–5 years."
                onClick={() => navigate("/charts")}
              />
              <InvestmentIdeaCard
                icon="⚡"
                title="Short Term Momentum"
                description="Stocks showing price strength, breakout structure, and near-term bullish momentum."
                onClick={() => navigate("/charts")}
              />
              <InvestmentIdeaCard
                icon="💰"
                title="Dividend Stocks"
                description="Reliable companies that may offer stable cash flows and regular dividend income."
                onClick={() => navigate("/charts")}
              />
              <InvestmentIdeaCard
                icon="💎"
                title="Value Picks"
                description="Undervalued stocks trading at attractive prices compared to their earnings, assets, or future potential."
                onClick={() => navigate("/charts")}
              />
            </div>
          </section>
        </div>
      </div>

      <SignalModal
        open={signalModalOpen}
        onClose={handleCloseSignalModal}
        stock={selectedSignalStock}
        signalData={selectedSignalStock ? signals[selectedSignalStock.symbol] : null}
        onOpenMl={openMlPage}
      />
    </>
  );
}