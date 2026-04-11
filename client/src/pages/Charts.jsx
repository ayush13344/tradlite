import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries, LineSeries } from "lightweight-charts";
import { useLocation } from "react-router-dom";
import api from "../api/axios";

/* ===================== FX ===================== */
let LIVE_INR_PER_USD = 93.65;

async function fetchLiveUsdInr() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=INR");
    if (!res.ok) return;
    const json = await res.json();
    const rate = Number(json?.rates?.INR);
    if (Number.isFinite(rate) && rate > 50) {
      LIVE_INR_PER_USD = rate;
    }
  } catch {
    // ignore
  }
}

fetchLiveUsdInr();

function convertPrice(value, currency) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return currency === "USD" ? n / LIVE_INR_PER_USD : n;
}

function currencySymbol(currency) {
  return currency === "USD" ? "$" : "₹";
}

/* ===================== FORMATTERS ===================== */
function formatNum(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "--";
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatCurrency(value, currency = "INR") {
  const converted = convertPrice(value, currency);
  if (converted === null) return "--";
  return `${currencySymbol(currency)}${converted.toLocaleString(
    currency === "USD" ? "en-US" : "en-IN",
    { maximumFractionDigits: 2 }
  )}`;
}

function formatBigCurrency(v, currency = "INR") {
  const converted = convertPrice(v, currency);
  if (converted === null) return "--";
  const n = Number(converted);

  if (currency === "USD") {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)} T`;
    if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)} B`;
    if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)} M`;
    if (n >= 1e3)  return `$${(n / 1e3).toFixed(2)} K`;
    return `$${n.toLocaleString("en-US")}`;
  }

  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)} T`;
  if (n >= 1e9)  return `₹${(n / 1e9).toFixed(2)} B`;
  if (n >= 1e7)  return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5)  return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatBig(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "--";
  const n = Number(v);
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} T`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(2)} B`;
  if (n >= 1e7)  return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5)  return `${(n / 1e5).toFixed(2)} L`;
  return n.toLocaleString("en-IN");
}

function formatDateTime(epochSec) {
  if (!epochSec) return "--";
  return new Date(epochSec * 1000).toLocaleString("en-IN");
}

function formatDuration(sec) {
  if (!Number.isFinite(sec)) return "--";
  const s = Math.max(0, Math.floor(sec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getLoggedInUserId() {
  try {
    const directId = localStorage.getItem("userId");
    if (directId) return directId;
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      return parsed?._id || parsed?.id || parsed?.userId || null;
    }
    return null;
  } catch {
    return null;
  }
}

function splitJournalTags(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeJournal(journal = {}) {
  return {
    _id: journal._id,
    symbol: journal.symbol || "--",
    assetType: journal.assetType || "STOCK",
    mode: journal.mode || "DELIVERY",
    side: journal.side || "BUY",
    quantity: Number(journal.quantity || 0),
    remainingQty: Number(journal.remainingQty || 0),
    entryPrice: Number(journal.entryPrice || 0),
    exitPrice: journal.exitPrice == null ? null : Number(journal.exitPrice),
    pnl: Number(journal.pnl || 0),
    pnlPct: Number(journal.pnlPct || 0),
    status: journal.status || "OPEN",
    entryTime: journal.entryTime || journal.createdAt || null,
    exitTime: journal.exitTime || null,
    strategy: journal.strategy || "",
    setupType: journal.setupType || "",
    confidence: journal.confidence ?? "",
    reasonForEntry: journal.reasonForEntry || "",
    emotionBefore: journal.emotionBefore || "",
    tags: Array.isArray(journal.tags) ? journal.tags : [],
    reasonForExit: journal.reasonForExit || "",
    emotionAfter: journal.emotionAfter || "",
    mistakes: journal.mistakes || "",
    lessonsLearned: journal.lessonsLearned || "",
    rating: journal.rating ?? "",
  };
}

function normalizePositionFromJournal(journal = {}) {
  const remainingQty = Number(journal.remainingQty ?? journal.quantity ?? 0);
  return {
    id: journal.entryOrderId || journal.orderId || journal._id,
    journalId: journal._id,
    symbol: journal.symbol || "--",
    side: journal.side || "BUY",
    mode: journal.mode || "DELIVERY",
    orderType: "LIMIT",
    quantity: remainingQty,
    limitPrice: Number(journal.entryPrice || 0),
    executedPrice: Number(journal.entryPrice || 0),
    totalValue: remainingQty * Number(journal.entryPrice || 0),
    status: journal.status || "OPEN",
    createdAt: journal.entryTime ? new Date(journal.entryTime).toLocaleString("en-IN") : "--",
  };
}

async function requestTradeJournals(api, userId) {
  const candidates = [
    `/trade-journal/user/${userId}`,
    `/trade-journal/${userId}`,
    `/tradeJournal/user/${userId}`,
    `/tradeJournal/${userId}`,
  ];

  for (const url of candidates) {
    try {
      const res = await api.get(url);
      if (Array.isArray(res?.data?.journals)) return res.data.journals;
      if (Array.isArray(res?.data?.data)) return res.data.data;
      if (Array.isArray(res?.data)) return res.data;
    } catch (error) {
      const status = error?.response?.status;
      if (status && status !== 404) throw error;
    }
  }

  return [];
}

function JournalEntryCard({ item, displayCurrency }) {
  const isProfit = Number(item.pnl || 0) >= 0;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.side === "BUY" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{item.side}</span>
            <span className="text-sm font-semibold text-gray-900">{item.symbol}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              item.status === "CLOSED" ? "bg-gray-900 text-white" : item.status === "PARTIAL" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
            }`}>{item.status}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">{item.mode}</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Entry {item.entryTime ? new Date(item.entryTime).toLocaleString("en-IN") : "--"}
            {item.exitTime ? ` • Exit ${new Date(item.exitTime).toLocaleString("en-IN")}` : ""}
          </div>
        </div>
        <div className={`text-right text-xs font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
          {isProfit ? "+" : ""}{formatCurrency(item.pnl, displayCurrency)}
          <div className="mt-1 text-[11px]">{isProfit ? "+" : ""}{formatNum(item.pnlPct)}%</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-gray-50 p-2"><div className="text-gray-500">Qty</div><div className="mt-1 font-semibold text-gray-900">{item.quantity}</div></div>
        <div className="rounded-xl bg-gray-50 p-2"><div className="text-gray-500">Remaining</div><div className="mt-1 font-semibold text-gray-900">{item.remainingQty}</div></div>
        <div className="rounded-xl bg-gray-50 p-2"><div className="text-gray-500">Entry Price</div><div className="mt-1 font-semibold text-gray-900">{formatCurrency(item.entryPrice, displayCurrency)}</div></div>
        <div className="rounded-xl bg-gray-50 p-2"><div className="text-gray-500">Exit Price</div><div className="mt-1 font-semibold text-gray-900">{item.exitPrice == null ? "--" : formatCurrency(item.exitPrice, displayCurrency)}</div></div>
      </div>

      {(item.strategy || item.setupType || item.confidence || item.reasonForEntry || item.emotionBefore || item.reasonForExit || item.emotionAfter || item.mistakes || item.lessonsLearned || (item.tags && item.tags.length) || item.rating) && (
        <div className="mt-3 space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs">
          {(item.strategy || item.setupType || item.confidence) && (
            <div className="grid grid-cols-3 gap-2">
              <div><div className="text-gray-500">Strategy</div><div className="mt-1 font-medium text-gray-900">{item.strategy || "--"}</div></div>
              <div><div className="text-gray-500">Setup</div><div className="mt-1 font-medium text-gray-900">{item.setupType || "--"}</div></div>
              <div><div className="text-gray-500">Confidence</div><div className="mt-1 font-medium text-gray-900">{item.confidence || "--"}</div></div>
            </div>
          )}
          {item.reasonForEntry && <div><div className="text-gray-500">Reason for Entry</div><div className="mt-1 text-gray-800">{item.reasonForEntry}</div></div>}
          {item.emotionBefore && <div><div className="text-gray-500">Emotion Before</div><div className="mt-1 text-gray-800">{item.emotionBefore}</div></div>}
          {item.tags?.length > 0 && (
            <div>
              <div className="text-gray-500">Tags</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {item.tags.map((tag, idx) => <span key={`${tag}_${idx}`} className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-semibold text-indigo-700">{tag}</span>)}
              </div>
            </div>
          )}
          {item.reasonForExit && <div><div className="text-gray-500">Reason for Exit</div><div className="mt-1 text-gray-800">{item.reasonForExit}</div></div>}
          {item.emotionAfter && <div><div className="text-gray-500">Emotion After</div><div className="mt-1 text-gray-800">{item.emotionAfter}</div></div>}
          {item.mistakes && <div><div className="text-gray-500">Mistakes</div><div className="mt-1 text-gray-800">{item.mistakes}</div></div>}
          {item.lessonsLearned && <div><div className="text-gray-500">Lessons Learned</div><div className="mt-1 text-gray-800">{item.lessonsLearned}</div></div>}
          {item.rating && <div><div className="text-gray-500">Rating</div><div className="mt-1 font-medium text-gray-900">{item.rating}/5</div></div>}
        </div>
      )}
    </div>
  );
}


function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="text-[11px] font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

/* ===================== FUNDAMENTAL CHARTS ===================== */

const ML_API_BASE = "http://127.0.0.1:8000";

function mlSignalClasses(signal) {
  if (signal === "BUY") {
    return {
      badge: "bg-green-100 text-green-700 border-green-200",
      bar: "bg-green-500",
      subtle: "bg-green-50 border-green-100",
    };
  }
  if (signal === "SELL") {
    return {
      badge: "bg-red-100 text-red-700 border-red-200",
      bar: "bg-red-500",
      subtle: "bg-red-50 border-red-100",
    };
  }
  return {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    bar: "bg-amber-500",
    subtle: "bg-amber-50 border-amber-100",
  };
}

function MlSignalCard({ symbol, isCrypto, displayCurrency }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [signalData, setSignalData] = React.useState(null);

  const loadSignal = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const cleanSymbol = String(symbol || "")
  .trim()
  .toUpperCase()
  .replace(/\.NS$/i, "")
  .replace(/-INR$/i, "")
  .replace(/:.*$/, "")        // removes :1 or anything after colon
  .replace(/[^A-Z0-9]/g, ""); // removes any remaining non-alphanumeric chars

      const res = await fetch(
        `${ML_API_BASE}/predict/signal/${encodeURIComponent(cleanSymbol)}`
      );
      const text = await res.text();

      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Invalid ML API response");
      }

      // Backend returns 400 with { success: false, error: "..." } for bad symbols
      if (!res.ok || json?.success === false) {
        const errMsg = json?.error || json?.detail || `ML API error (${res.status})`;
        const hint   = json?.hint   || "";
        const note   = json?.note   || "";
        throw new Error([errMsg, hint, note].filter(Boolean).join(" — "));
      }

      setSignalData(json);
    } catch (err) {
      setError(err?.message || "Failed to load ML signal");
      setSignalData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  React.useEffect(() => {
    loadSignal();
  }, [loadSignal]);

  const tone = mlSignalClasses(signalData?.signal);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">ML Signal</div>
          <div className="mt-1 text-xs text-gray-500">
            {isCrypto ? "Crypto model output" : "Stock model output"} for{" "}
            <span className="font-semibold text-gray-700">{symbol}</span>
          </div>
          {signalData && (
            <div className="mt-1 text-[10px] text-gray-400">
              {signalData.seen_in_training
                ? "✅ Trained symbol — well calibrated"
                : "⚠️ Unseen symbol — generalized prediction"}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={loadSignal}
          className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          Fetching data from Yahoo Finance and running prediction...
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
          {/* Helpful tips for common failures */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700 space-y-1">
            <div className="font-semibold">Troubleshooting tips:</div>
            <div>• Verify the symbol exists on NSE/BSE (e.g. RELIANCE, TCS, INFY)</div>
            <div>• For crypto use BTC, ETH, SOL (not BTC-USD)</div>
            <div>• Symbol needs at least 60 days of trading history</div>
            <div>• Try again in a moment if Yahoo Finance is temporarily slow</div>
          </div>
          <button
            type="button"
            onClick={loadSignal}
            className="w-full rounded-xl bg-gray-900 py-2 text-xs font-semibold text-white hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && signalData && (
        <div className="mt-4 space-y-4">
          <div className={`rounded-2xl border p-4 ${tone.subtle}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500">Current Signal</div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${tone.badge}`}
                  >
                    {signalData.signal}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {signalData.confidence}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Probability Up</div>
                <div className="mt-1 text-lg font-bold text-gray-900">
                  {signalData.probability_up}%
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                <span>Confidence</span>
                <span>{signalData.confidence}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full ${tone.bar}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, Number(signalData.confidence || 0)))}%`,
                  }}
                />
              </div>
            </div>

            {/* Threshold used */}
            <div className="mt-2 text-[10px] text-gray-400">
              Threshold used:{" "}
              <span className="font-semibold text-gray-600">
                {signalData.threshold_used ?? signalData.threshold}%
              </span>
              {" "}·{" "}
              <span className="italic">{signalData.note}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Price"
              value={formatCurrency(signalData.price, displayCurrency)}
            />
            <Stat
              label="Threshold"
              value={`${signalData.threshold_used ?? signalData.threshold}%`}
            />
            <Stat
              label="Probability Up"
              value={`${signalData.probability_up}%`}
            />
            <Stat label="Signal Date" value={signalData.date || "--"} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-semibold text-gray-700">Reasons</div>
            <div className="mt-3 space-y-2">
              {Array.isArray(signalData.reasons) && signalData.reasons.length > 0 ? (
                signalData.reasons.map((reason, index) => (
                  <div
                    key={`${reason}_${index}`}
                    className="rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
                  >
                    {reason}
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-white px-3 py-2 text-sm text-gray-500 shadow-sm">
                  No model reasons available.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold text-gray-700">Indicators</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">RSI 14</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {formatNum(signalData?.indicators?.rsi_14)}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">Volume Ratio</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {formatNum(signalData?.indicators?.volume_ratio)}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">EMA 10</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {formatCurrency(signalData?.indicators?.ema_10, displayCurrency)}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">EMA 20</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {formatCurrency(signalData?.indicators?.ema_20, displayCurrency)}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">Trend Strength</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {formatNum(signalData?.indicators?.trend_strength)}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">Price vs SMA20</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {formatNum(signalData?.indicators?.price_vs_sma20)}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">Breakout Up</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {signalData?.indicators?.breakout_up === 1 ? "✅ Yes" : "No"}
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">Breakout Down</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {signalData?.indicators?.breakout_down === 1 ? "⚠️ Yes" : "No"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function FundamentalBarChart({ title, data, valueKey, formatter = formatBig, barClass = "bg-indigo-500" }) {
  const maxValue = useMemo(() => {
    const vals = data.map((x) => Number(x?.[valueKey] ?? 0)).filter((x) => Number.isFinite(x));
    return vals.length ? Math.max(...vals, 1) : 1;
  }, [data, valueKey]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 text-sm font-semibold text-gray-900">{title}</div>
      <div className="space-y-3">
        {data.map((item, idx) => {
          const raw = Number(item?.[valueKey] ?? 0);
          const width = `${Math.max(6, (raw / maxValue) * 100)}%`;
          return (
            <div key={`${item.period}_${idx}`}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-gray-500">{item.period}</span>
                <span className="text-xs font-semibold text-gray-900">{formatter(raw)}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${barClass}`} style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FundamentalSummaryCards({ data, currency }) {
  if (!data.length) return null;
  const latest = data[data.length - 1];
  const prev   = data[data.length - 2];

  const changePct = (a, b) => {
    if (!Number.isFinite(Number(a)) || !Number.isFinite(Number(b)) || Number(b) === 0) return null;
    return ((Number(a) - Number(b)) / Number(b)) * 100;
  };

  const cards = [
    { label: "Revenue",    value: latest.revenue,   delta: changePct(latest.revenue,   prev?.revenue),   formatter: (v) => formatBigCurrency(v, currency) },
    { label: "Net Income", value: latest.netIncome,  delta: changePct(latest.netIncome,  prev?.netIncome),  formatter: (v) => formatBigCurrency(v, currency) },
    { label: "EPS",        value: latest.eps,        delta: changePct(latest.eps,        prev?.eps),        formatter: formatNum },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <div className="text-[11px] text-gray-500">{c.label}</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{c.formatter(c.value)}</div>
          <div className={`mt-1 text-xs font-semibold ${c.delta == null ? "text-gray-500" : c.delta >= 0 ? "text-green-600" : "text-red-600"}`}>
            {c.delta == null ? "--" : `${c.delta >= 0 ? "+" : ""}${formatNum(c.delta)}%`}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===================== INTRADAY POSITION CARD ===================== */
function IntradayCard({ order, livePrice, currency, onExit }) {
  const entry   = Number(order.executedPrice || 0);
  const qty     = Number(order.quantity || 0);
  const current = Number(livePrice || entry || 0);
  const pnl     = order.side === "BUY" ? (current - entry) * qty : (entry - current) * qty;
  const pnlPct  = entry > 0 ? (pnl / (entry * qty)) * 100 : 0;
  const isProfit = pnl >= 0;
  const movePct  = entry > 0 ? ((current - entry) / entry) * 100 : 0;
  const barWidth = Math.min(Math.abs(movePct) * 20, 100);

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${isProfit ? "border-green-100" : "border-red-100"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${order.side === "BUY" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{order.side}</span>
          <span className="text-sm font-bold text-gray-900">{order.symbol}</span>
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">INTRADAY</span>
        </div>
        <span className={`text-xs font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
          {isProfit ? "▲" : "▼"} {formatCurrency(Math.abs(pnl), currency)}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-gray-400">{order.createdAt}</div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
          <span>Entry {formatCurrency(entry, currency)}</span>
          <span>LTP {formatCurrency(current, currency)}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${isProfit ? "bg-green-400" : "bg-red-400"}`}
            style={{ width: `${barWidth}%`, marginLeft: movePct < 0 ? `${100 - barWidth}%` : "0" }} />
        </div>
        <div className={`mt-1 text-right text-[10px] font-semibold ${isProfit ? "text-green-600" : "text-red-600"}`}>
          {movePct >= 0 ? "+" : ""}{formatNum(movePct)}%
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-gray-50 p-2 text-center">
          <div className="text-[10px] text-gray-400">Qty</div>
          <div className="mt-0.5 font-bold text-gray-900">{qty}</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-2 text-center">
          <div className="text-[10px] text-gray-400">Value</div>
          <div className="mt-0.5 font-bold text-gray-900">{formatBigCurrency(current * qty, currency)}</div>
        </div>
        <div className={`rounded-xl p-2 text-center ${isProfit ? "bg-green-50" : "bg-red-50"}`}>
          <div className="text-[10px] text-gray-400">PnL %</div>
          <div className={`mt-0.5 font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
            {isProfit ? "+" : ""}{formatNum(pnlPct)}%
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-2">
          <span className="text-orange-500 text-xs">⚠</span>
          <span className="text-[11px] text-orange-600 font-medium">Auto square-off before close</span>
        </div>
        <button type="button" onClick={() => onExit && onExit(order)}
          className="rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600 transition whitespace-nowrap">
          Exit Now
        </button>
      </div>
    </div>
  );
}

/* ===================== DELIVERY POSITION CARD ===================== */
function PositionCard({ order, livePrice, currency, onExit }) {
  const executedPrice = Number(order.executedPrice || 0);
  const qty     = Number(order.quantity || 0);
  const current = Number(livePrice || executedPrice || 0);
  const pnl     = order.side === "BUY" ? (current - executedPrice) * qty : (executedPrice - current) * qty;
  const pnlPct  = executedPrice > 0 ? (pnl / (executedPrice * qty)) * 100 : 0;
  const isProfit = pnl >= 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${order.side === "BUY" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{order.side}</span>
            <span className="text-sm font-semibold text-gray-900">{order.symbol}</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">DELIVERY</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">{order.createdAt}</div>
        </div>
        <span className={`text-xs font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
          {isProfit ? "+" : ""}{formatCurrency(pnl, currency)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-gray-50 p-2"><div className="text-gray-500">Quantity</div><div className="mt-1 font-semibold text-gray-900">{qty}</div></div>
        <div className="rounded-xl bg-gray-50 p-2"><div className="text-gray-500">Entry Price</div><div className="mt-1 font-semibold text-gray-900">{formatCurrency(executedPrice, currency)}</div></div>
        <div className="rounded-xl bg-gray-50 p-2"><div className="text-gray-500">Current Price</div><div className="mt-1 font-semibold text-gray-900">{formatCurrency(current, currency)}</div></div>
        <div className="rounded-xl bg-gray-50 p-2"><div className="text-gray-500">Position Value</div><div className="mt-1 font-semibold text-gray-900">{formatCurrency(current * qty, currency)}</div></div>
        <div className={`rounded-xl p-2 col-span-2 ${isProfit ? "bg-green-50" : "bg-red-50"}`}>
          <div className="text-gray-500">PnL</div>
          <div className={`mt-1 font-semibold ${isProfit ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(pnl, currency)} ({isProfit ? "+" : ""}{formatNum(pnlPct)}%)
          </div>
        </div>
      </div>
      <button type="button" onClick={() => onExit && onExit(order)}
        className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition">
        Exit Position
      </button>
    </div>
  );
}

/* ===================== INDICATORS ===================== */
function ema(values, period) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const k = 2 / (period + 1);
  let prev = values[0];
  const out = [prev];
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(values, period = 14) {
  if (!Array.isArray(values) || values.length < period + 1) return Array(values?.length || 0).fill(null);
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff; else loss -= diff;
  }
  gain /= period; loss /= period;
  const out = Array(period).fill(null);
  let rs = loss === 0 ? 100 : gain / loss;
  out.push(100 - 100 / (1 + rs));
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    rs = loss === 0 ? 100 : gain / loss;
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}

function macd(values, fast = 12, slow = 26, signal = 9) {
  if (!Array.isArray(values) || values.length === 0) return { macd: [], signal: [] };
  const emaFast   = ema(values, fast);
  const emaSlow   = ema(values, slow);
  const macdLine  = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = ema(macdLine, signal);
  return { macd: macdLine, signal: signalLine };
}

/* ===================== HELPERS ===================== */
function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function distPointToSegment(px, py, x1, y1, x2, y2) {
  const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
}

// IST = UTC + 5:30 = 19800 seconds.
const IST_OFFSET_SEC = 19800;

function bucketTime(epochSec, bucketSeconds) {
  const istSec  = epochSec + IST_OFFSET_SEC;
  const floored = Math.floor(istSec / bucketSeconds) * bucketSeconds;
  return floored - IST_OFFSET_SEC;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

/* ===================== NORMALIZE HELPERS ===================== */

// Stock historical normalizer — handles every known API shape
function normalizeHistory(data) {
  let raw = null;
  if (Array.isArray(data))                           raw = data;
  else if (Array.isArray(data?.data))                raw = data.data;
  else if (Array.isArray(data?.candles))             raw = data.candles;
  else if (Array.isArray(data?.history))             raw = data.history;
  else if (Array.isArray(data?.results))             raw = data.results;
  else if (Array.isArray(data?.ohlcv))               raw = data.ohlcv;
  else if (Array.isArray(data?.prices))              raw = data.prices;
  else if (Array.isArray(data?.data?.candles))       raw = data.data.candles;
  else if (Array.isArray(data?.data?.data))          raw = data.data.data;
  else if (Array.isArray(data?.chart?.result?.[0]?.timestamp)) {
    const r = data.chart.result[0];
    const q = r?.indicators?.quote?.[0] || {};
    raw = (r.timestamp || []).map((t, i) => ({
      time: t,
      open: q.open?.[i],
      high: q.high?.[i],
      low: q.low?.[i],
      close: q.close?.[i],
    }));
  }

  if (!raw || !raw.length) {
    console.warn("[normalizeHistory] Could not find array. Top-level keys:", data ? Object.keys(data) : "null/undefined");
    return [];
  }

  const arr = raw
    .map((x) => {
      if (Array.isArray(x)) {
        let timeSec = Number(x[0]);
        if (!Number.isFinite(timeSec) || timeSec <= 0) return null;
        if (timeSec > 1e12) timeSec = Math.floor(timeSec / 1000);
        const open = Number(x[1]);
        const high = Number(x[2]);
        const low = Number(x[3]);
        const close = Number(x[4] ?? x[1]);
        if (!Number.isFinite(open) || open <= 0) return null;
        if (!Number.isFinite(high) || high <= 0) return null;
        if (!Number.isFinite(low) || low <= 0) return null;
        if (!Number.isFinite(close) || close <= 0) return null;
        if (high < low) return null;
        return { time: timeSec, open, high, low, close };
      }

      if (!x || typeof x !== "object") return null;
      let rawTime = x.time ?? x.date ?? x.timestamp ?? x.t ?? x.datetime ?? x[0] ?? null;
      let timeSec;
      if (typeof rawTime === "string") {
        const ms = new Date(rawTime).getTime();
        if (!Number.isFinite(ms) || ms <= 0) return null;
        timeSec = Math.floor(ms / 1000);
      } else {
        timeSec = Number(rawTime);
        if (!Number.isFinite(timeSec) || timeSec <= 0) return null;
        if (timeSec > 1e12) timeSec = Math.floor(timeSec / 1000);
      }
      if (timeSec < 946684800 || timeSec > 4102444800) return null;
      const open  = Number(x.open  ?? x.o ?? x.Open  ?? x[1] ?? 0);
      const high  = Number(x.high  ?? x.h ?? x.High  ?? x[2] ?? 0);
      const low   = Number(x.low   ?? x.l ?? x.Low   ?? x[3] ?? 0);
      const close = Number(x.close ?? x.c ?? x.Close ?? x.adjclose ?? x.adj_close ?? x[4] ?? 0);
      if (!Number.isFinite(open)  || open  <= 0) return null;
      if (!Number.isFinite(high)  || high  <= 0) return null;
      if (!Number.isFinite(low)   || low   <= 0) return null;
      if (!Number.isFinite(close) || close <= 0) return null;
      if (high < low) return null;
      return { time: timeSec, open, high, low, close };
    })
    .filter(Boolean);

  if (!arr.length) return [];
  arr.sort((a, b) => a.time - b.time);
  const seen = new Map();
  for (const c of arr) seen.set(c.time, c);
  return Array.from(seen.values());
}

function normalizeOverview(data, symbol) {
  if (!data || typeof data !== "object") return null;
  const quote   = data.quote   || data.data || data.stock || {};
  const metrics = data.metrics || data.fundamentals || {};
  return {
    name: data.name || data.longName || data.companyName || symbol,
    quote: {
      price:         quote.price         ?? quote.currentPrice    ?? quote.regularMarketPrice ?? quote.ltp ?? null,
      change:        quote.change        ?? quote.regularMarketChange ?? quote.netChange ?? null,
      changePercent: quote.changePercent ?? quote.regularMarketChangePercent ?? quote.pChange ?? null,
      previousClose: quote.previousClose ?? quote.regularMarketPreviousClose ?? null,
      open:          quote.open          ?? quote.regularMarketOpen ?? null,
      dayHigh:       quote.dayHigh       ?? quote.high ?? quote.regularMarketDayHigh ?? null,
      dayLow:        quote.dayLow        ?? quote.low  ?? quote.regularMarketDayLow  ?? null,
      volume:        quote.volume        ?? quote.regularMarketVolume ?? null,
      avgVolume:     quote.avgVolume     ?? quote.averageVolume ?? quote.averageDailyVolume3Month ?? null,
    },
    metrics: { marketCap: metrics.marketCap ?? quote.marketCap ?? null },
  };
}

// Crypto-specific normalizers — use UTC buckets (NOT IST) since crypto trades 24/7
function normalizeCryptoOverview(data, fallbackSymbol) {
  const coin = Array.isArray(data?.data) ? data.data[0] : null;
  if (!coin) return null;
  return {
    name: coin.name || fallbackSymbol,
    quote: {
      price:         coin.currentPrice ?? null,
      change:        coin.priceChange24h ?? null,
      changePercent: coin.priceChangePercentage24h ?? null,
      previousClose: Number.isFinite(Number(coin.currentPrice)) && Number.isFinite(Number(coin.priceChange24h))
        ? Number(coin.currentPrice) - Number(coin.priceChange24h) : null,
      open: Number.isFinite(Number(coin.currentPrice)) && Number.isFinite(Number(coin.priceChange24h))
        ? Number(coin.currentPrice) - Number(coin.priceChange24h) : null,
      dayHigh:   coin.high24h    ?? null,
      dayLow:    coin.low24h     ?? null,
      volume:    coin.totalVolume ?? null,
      avgVolume: coin.totalVolume ?? null,
    },
    metrics:    { marketCap: coin.marketCap ?? null },
    cryptoMeta: {
      id:                coin.id,
      symbol:            coin.symbol,
      image:             coin.image,
      marketCapRank:     coin.marketCapRank,
      circulatingSupply: coin.circulatingSupply,
      totalSupply:       coin.totalSupply,
      ath:               coin.ath,
      atl:               coin.atl,
      lastUpdated:       coin.lastUpdated,
    },
  };
}

// Crypto history: uses pure UTC bucket alignment (no IST offset) — crypto is 24/7 global
function normalizeCryptoHistory(chartData, bucketSeconds = 300) {
  let prices = [];
  if (Array.isArray(chartData?.data?.prices))  prices = chartData.data.prices;
  else if (Array.isArray(chartData?.prices))   prices = chartData.prices;
  else if (Array.isArray(chartData?.data))     prices = chartData.data;
  else if (Array.isArray(chartData))           prices = chartData;

  if (!prices.length) return [];

  const raw = prices
    .map((item) => {
      let timeSec, value;
      if (Array.isArray(item)) {
        timeSec = Number(item[0]); value = Number(item[1]);
      } else if (item && typeof item === "object") {
        timeSec = Number(item.time ?? item.timestamp ?? 0);
        value   = Number(item.value ?? item.price ?? item.close ?? 0);
      } else return null;
      if (timeSec > 1e12) timeSec = Math.floor(timeSec / 1000);
      timeSec = Math.floor(timeSec);
      if (!Number.isFinite(timeSec) || timeSec <= 0) return null;
      if (!Number.isFinite(value)   || value   <= 0) return null;
      return { timeSec, value };
    })
    .filter(Boolean)
    .sort((a, b) => a.timeSec - b.timeSec);

  if (!raw.length) return [];

  // Pure UTC bucket — no IST shift for 24/7 crypto
  const bucketMap = new Map();
  for (const { timeSec, value } of raw) {
    const bucket = Math.floor(timeSec / bucketSeconds) * bucketSeconds;
    if (!bucketMap.has(bucket)) {
      bucketMap.set(bucket, { time: bucket, open: value, high: value, low: value, close: value });
    } else {
      const c = bucketMap.get(bucket);
      c.high  = Math.max(c.high, value);
      c.low   = Math.min(c.low,  value);
      c.close = value;
    }
  }

  const sorted = Array.from(bucketMap.values()).sort((a, b) => a.time - b.time);
  const result = [];
  let lastTime = -1;
  for (const c of sorted) {
    if (c.time > lastTime) { result.push(c); lastTime = c.time; }
  }
  return result;
}

function normalizeFundamentals(data) {
  if (!data || typeof data !== "object") return [];
  const candidates = [
    data.series?.fundamentals, data.fundamentals, data.quarterly,
    data.financials, data.results, data.data, data.items,
  ];
  const arr = candidates.find(Array.isArray) || [];
  return arr
    .map((x) => ({
      period:    x.period || x.date || x.quarter || x.label || "--",
      revenue:   Number(x.revenue   ?? x.totalRevenue ?? x.sales ?? x.turnover ?? 0),
      netIncome: Number(x.netIncome ?? x.profitAfterTax ?? x.pat ?? x.netProfit ?? x.profit ?? 0),
      eps:       Number(x.eps ?? x.dilutedEPS ?? x.basicEPS ?? 0),
    }))
    .filter((x) => x.period !== "--")
    .slice(-8);
}

function normalizeAbout(data) {
  if (!data || typeof data !== "object") return null;
  return {
    sector:   data.sector   || data.company?.sector   || null,
    industry: data.industry || data.company?.industry || null,
    summary:  data.summary  || data.longBusinessSummary || data.description || data.company?.summary || null,
  };
}

function normalizeNews(data) {
  const arr = Array.isArray(data) ? data
    : Array.isArray(data?.news)  ? data.news
    : Array.isArray(data?.items) ? data.items
    : [];
  return arr.map((n) => ({
    title:       n.title     || n.headline || "Untitled",
    link:        n.link      || n.url      || "#",
    publisher:   n.publisher || n.source   || n.site || "—",
    publishedAt: n.publishedAt || n.pubDate || n.date || n.providerPublishTime || null,
  }));
}

function layoutKey(symbol) {
  return `chart_layout_${symbol}`;
}

function buildCryptoFundamentalsFromOverview(overview) {
  if (!overview?.cryptoMeta && !overview?.quote && !overview?.metrics) return [];
  return [
    { period: "Market Cap", revenue: Number(overview?.metrics?.marketCap ?? 0), netIncome: Number(overview?.quote?.volume ?? 0), eps: Number(overview?.cryptoMeta?.marketCapRank ?? 0) },
    { period: "Supply",     revenue: Number(overview?.cryptoMeta?.circulatingSupply ?? 0), netIncome: Number(overview?.cryptoMeta?.totalSupply ?? 0), eps: Number(overview?.quote?.changePercent ?? 0) },
    { period: "Price Zones", revenue: Number(overview?.cryptoMeta?.ath ?? 0), netIncome: Number(overview?.quote?.price ?? 0), eps: Number(overview?.cryptoMeta?.atl ?? 0) },
  ];
}

function buildCryptoNewsFromOverview(overview, symbol, currency) {
  if (!overview) return [];
  const now = Date.now();
  return [
    { title: `${overview?.name || symbol} trading near ${formatCurrency(overview?.quote?.price, currency)}`, link: "#", publisher: "Live Market Update", publishedAt: now },
    { title: `${overview?.name || symbol} moved ${formatNum(overview?.quote?.changePercent)}% in the last 24 hours`, link: "#", publisher: "24H Change Snapshot", publishedAt: now - 600000 },
    { title: `Market cap for ${overview?.name || symbol} is ${formatBigCurrency(overview?.metrics?.marketCap, currency)}`, link: "#", publisher: "Capitalization Update", publishedAt: now - 1200000 },
    { title: `${overview?.name || symbol} 24H volume stands at ${formatBigCurrency(overview?.quote?.volume, currency)}`, link: "#", publisher: "Volume Update", publishedAt: now - 1800000 },
    { title: `${overview?.name || symbol} all-time high is ${formatCurrency(overview?.cryptoMeta?.ath, currency)} and all-time low is ${formatCurrency(overview?.cryptoMeta?.atl, currency)}`, link: "#", publisher: "Historical Range", publishedAt: now - 2400000 },
  ];
}

/* ===================== SHARED CHART CANVAS HOOK ===================== */
// Contains all drawing-tool logic shared between StockChart and CryptoChart
function useChartDrawing({ displayCurrency }) {
  const overlayRef         = useRef(null);
  const chartRef           = useRef(null);
  const candleSeriesRef    = useRef(null);
  const shapesRef          = useRef([]);
  const drawingRef         = useRef(null);
  const dragRef            = useRef(null);
  const chartAliveRef      = useRef(true);

  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [shapesVersion, setShapesVersion]     = useState(0);
  const [tool, setTool]                       = useState("cursor");
  const [overlayInteractive, setOverlayInteractive] = useState(false);

  const redrawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    const ctx    = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    if (!chartAliveRef.current) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const selected       = selectedShapeId;
    const strokeNormal   = "#111827";
    const strokeSelected = "#2563eb";
    const fillBlue       = "rgba(37, 99, 235, 0.10)";
    const fillGreen      = "rgba(34, 197, 94, 0.14)";
    const fillRed        = "rgba(239, 68, 68, 0.14)";
    const textBg         = "rgba(17, 24, 39, 0.82)";
    const textFg         = "#ffffff";

    const chart  = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return;

    const anchorToCoord = (anchor) => {
      try {
        const x = chart.timeScale().timeToCoordinate(anchor.time);
        const y = series.priceToCoordinate(anchor.price);
        if (x == null || y == null) return null;
        return { x, y };
      } catch {
        return null;
      }
    };

    const drawLabel = (x, y, lines) => {
      const padX = 8, padY = 6, lineH = 14;
      ctx.font = "12px ui-sans-serif, system-ui";
      const widths = lines.map((t) => ctx.measureText(t).width);
      const w  = Math.max(...widths, 60) + padX * 2;
      const h  = lines.length * lineH + padY * 2;
      const bx = clamp(x, 8, canvas.width  - w - 8);
      const by = clamp(y, 8, canvas.height - h - 8);
      ctx.fillStyle = textBg;
      ctx.beginPath(); ctx.roundRect(bx, by, w, h, 10); ctx.fill();
      ctx.fillStyle = textFg;
      lines.forEach((t, i) => ctx.fillText(t, bx + padX, by + padY + (i + 1) * lineH - 4));
    };

    const drawTag = (x, y, text, isSelected = false) => {
      ctx.font = "11px ui-sans-serif, system-ui";
      const padX = 7, w = ctx.measureText(text).width + padX * 2, h = 20;
      const bx = clamp(x - w / 2, 8, canvas.width  - w - 8);
      const by = clamp(y - h - 10, 8, canvas.height - h - 8);
      ctx.fillStyle = isSelected ? "rgba(37,99,235,0.95)" : "rgba(17,24,39,0.85)";
      ctx.beginPath(); ctx.roundRect(bx, by, w, h, 10); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(text, bx + padX, by + 14);
    };

    const drawHandle = (x, y, isSelected) => {
      ctx.fillStyle   = isSelected ? "#2563eb" : "#111827";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth   = 2;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    };

    const tagForAnchor = (a) =>
      `${currencySymbol(displayCurrency)}${formatNum(convertPrice(a.price, displayCurrency))} • ${new Date(a.time * 1000).toLocaleDateString("en-IN")}`;

    const drawRect = (p1, p2, isSelected, fill = fillBlue, showTags = true) => {
      const a = anchorToCoord(p1), b = anchorToCoord(p2);
      if (!a || !b) return null;
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
      const w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y);
      ctx.lineWidth   = isSelected ? 2.5 : 2;
      ctx.strokeStyle = isSelected ? strokeSelected : strokeNormal;
      ctx.fillStyle   = fill;
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
      drawHandle(a.x, a.y, isSelected); drawHandle(b.x, b.y, isSelected);
      if (showTags) { drawTag(a.x, a.y, tagForAnchor(p1), isSelected); drawTag(b.x, b.y, tagForAnchor(p2), isSelected); }
      return { x, y, w, h };
    };

    const drawHLine = (p1, isSelected) => {
      const a = anchorToCoord(p1);
      if (!a) return;
      ctx.lineWidth   = isSelected ? 2.5 : 2;
      ctx.strokeStyle = isSelected ? strokeSelected : strokeNormal;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(canvas.width, a.y); ctx.stroke();
      ctx.setLineDash([]);
      drawHandle(canvas.width - 20, a.y, isSelected);
      drawTag(canvas.width - 80, a.y, `${currencySymbol(displayCurrency)}${formatNum(convertPrice(p1.price, displayCurrency))}`, isSelected);
    };

    const drawTrend = (p1, p2, isSelected) => {
      const a = anchorToCoord(p1), b = anchorToCoord(p2);
      if (!a || !b) return;
      ctx.lineWidth = isSelected ? 2.5 : 2; ctx.strokeStyle = isSelected ? strokeSelected : strokeNormal;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      drawHandle(a.x, a.y, isSelected); drawHandle(b.x, b.y, isSelected);
      drawTag(a.x, a.y, tagForAnchor(p1), isSelected); drawTag(b.x, b.y, tagForAnchor(p2), isSelected);
    };

    const drawRange = (p1, p2, isSelected) => {
      const box = drawRect(p1, p2, isSelected, fillBlue, true);
      if (!box) return;
      const start = Math.min(p1.time, p2.time), end = Math.max(p1.time, p2.time);
      const dur   = end - start, diff = p2.price - p1.price;
      const pct   = p1.price ? (diff / p1.price) * 100 : null;
      drawLabel(box.x + box.w + 10, box.y, [
        `Date: ${formatDateTime(start)} → ${formatDateTime(end)}`,
        `Duration: ${formatDuration(dur)}`,
        `Price: ${formatCurrency(p1.price, displayCurrency)} → ${formatCurrency(p2.price, displayCurrency)} (${formatCurrency(diff, displayCurrency)} | ${pct != null ? formatNum(pct) : "--"}%)`,
      ]);
    };

    const drawPosition = (s, isSelected) => {
      const entry  = anchorToCoord(s.entry);
      const stop   = anchorToCoord(s.stop);
      const target = anchorToCoord(s.target);
      if (!entry || !stop || !target) return;
      const xMin = Math.min(entry.x, stop.x, target.x);
      const xMax = Math.max(entry.x, stop.x, target.x);
      const left  = xMin, width = Math.max(140, xMax - xMin + 120);
      const yEntry = entry.y, yStop = stop.y, yTarget = target.y;
      ctx.lineWidth = isSelected ? 2.5 : 2; ctx.strokeStyle = isSelected ? strokeSelected : strokeNormal;
      const drawH = (y) => { ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + width, y); ctx.stroke(); };
      ctx.fillStyle = fillGreen; ctx.beginPath();
      ctx.rect(left, Math.min(yEntry, yTarget), width, Math.abs(yEntry - yTarget)); ctx.fill();
      ctx.fillStyle = fillRed; ctx.beginPath();
      ctx.rect(left, Math.min(yEntry, yStop), width, Math.abs(yEntry - yStop)); ctx.fill();
      drawH(yStop); drawH(yEntry); drawH(yTarget);
      drawHandle(left, yEntry, isSelected); drawHandle(left, yStop, isSelected); drawHandle(left, yTarget, isSelected);
      drawTag(left + 80, yEntry,  `Entry ${formatCurrency(s.entry.price, displayCurrency)}`, isSelected);
      drawTag(left + 80, yStop,   `Stop ${formatCurrency(s.stop.price, displayCurrency)}`, isSelected);
      drawTag(left + 80, yTarget, `Target ${formatCurrency(s.target.price, displayCurrency)}`, isSelected);
    };

    for (const s of shapesRef.current) {
      const isSel = s.id === selected;
      if (s.type === "rect")     drawRect(s.p1, s.p2, isSel);
      if (s.type === "range")    drawRange(s.p1, s.p2, isSel);
      if (s.type === "hline")    drawHLine(s.p1, isSel);
      if (s.type === "trend")    drawTrend(s.p1, s.p2, isSel);
      if (s.type === "position") drawPosition(s, isSel);
    }

    const d = drawingRef.current;
    if (!d) return;
    if ((d.type === "rect" || d.type === "range" || d.type === "trend") && d.p1 && d.p2) {
      if (d.type === "rect")  drawRect(d.p1, d.p2, true);
      if (d.type === "range") drawRange(d.p1, d.p2, true);
      if (d.type === "trend") drawTrend(d.p1, d.p2, true);
    }
    if (d.type === "position" && d.entry) {
      drawPosition({ id: "preview", type: "position", side: d.side, entry: d.entry, stop: d.stop || d.temp || d.entry, target: d.target || d.temp || d.entry }, true);
    }
  }, [selectedShapeId, displayCurrency]);

  const setShapes = useCallback((next) => {
    const resolved = typeof next === "function" ? next(shapesRef.current || []) : next;
    shapesRef.current = resolved;
    setShapesVersion((v) => v + 1);
    requestAnimationFrame(() => { if (chartAliveRef.current) redrawOverlay(); });
  }, [redrawOverlay]);

  const updateShape = useCallback((id, updater) => {
    setShapes((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      return typeof updater === "function" ? updater(s) : { ...s, ...updater };
    }));
  }, [setShapes]);

  const selectedShape = useMemo(() => {
    return shapesRef.current.find((s) => s.id === selectedShapeId) || null;
  }, [selectedShapeId, shapesVersion]); // eslint-disable-line

  const coordToAnchor = useCallback((x, y) => {
    const chart  = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return null;
    const t = chart.timeScale().coordinateToTime(x);
    let time = null;
    if (typeof t === "number") { time = t; }
    else if (t && typeof t === "object" && t.year && t.month && t.day) {
      time = Math.floor(new Date(t.year, t.month - 1, t.day).getTime() / 1000);
    }
    const priceVal = series.coordinateToPrice(y);
    if (time == null || priceVal == null) return null;
    return { time, price: priceVal };
  }, []);

  const anchorToCoordFn = useCallback((anchor) => {
    const chart  = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return null;
    const x = chart.timeScale().timeToCoordinate(anchor.time);
    const y = series.priceToCoordinate(anchor.price);
    if (x == null || y == null) return null;
    return { x, y };
  }, []);

  const getMouse = (e) => {
    const canvas = overlayRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clamp(e.clientX - rect.left, 0, rect.width), y: clamp(e.clientY - rect.top, 0, rect.height) };
  };

  const hitTest = useCallback((mx, my) => {
    const tol  = 9;
    const near = (ax, ay) => Math.hypot(mx - ax, my - ay) <= tol;
    for (let i = shapesRef.current.length - 1; i >= 0; i--) {
      const s = shapesRef.current[i];
      if (s.type === "hline") {
        const a = anchorToCoordFn(s.p1); if (!a) continue;
        if (Math.abs(my - a.y) <= tol) return { id: s.id, handle: "p1" };
      }
      if (s.type === "trend") {
        const a = anchorToCoordFn(s.p1), b = anchorToCoordFn(s.p2); if (!a || !b) continue;
        if (near(a.x, a.y)) return { id: s.id, handle: "p1" };
        if (near(b.x, b.y)) return { id: s.id, handle: "p2" };
        if (distPointToSegment(mx, my, a.x, a.y, b.x, b.y) <= tol) return { id: s.id, handle: null };
      }
      if (s.type === "rect" || s.type === "range") {
        const a = anchorToCoordFn(s.p1), b = anchorToCoordFn(s.p2); if (!a || !b) continue;
        if (near(a.x, a.y)) return { id: s.id, handle: "p1" };
        if (near(b.x, b.y)) return { id: s.id, handle: "p2" };
        const x1 = Math.min(a.x, b.x), y1 = Math.min(a.y, b.y);
        const x2 = Math.max(a.x, b.x), y2 = Math.max(a.y, b.y);
        const inside   = mx >= x1 && mx <= x2 && my >= y1 && my <= y2;
        const onBorder = Math.abs(mx-x1)<=tol || Math.abs(mx-x2)<=tol || Math.abs(my-y1)<=tol || Math.abs(my-y2)<=tol;
        if (inside || onBorder) return { id: s.id, handle: null };
      }
      if (s.type === "position") {
        const e  = anchorToCoordFn(s.entry);
        const st = anchorToCoordFn(s.stop);
        const tg = anchorToCoordFn(s.target);
        if (!e || !st || !tg) continue;
        const left = Math.min(e.x, st.x, tg.x);
        if (near(left, e.y))  return { id: s.id, handle: "entry" };
        if (near(left, st.y)) return { id: s.id, handle: "stop" };
        if (near(left, tg.y)) return { id: s.id, handle: "target" };
        const x1 = Math.min(e.x, st.x, tg.x), x2 = Math.max(e.x, st.x, tg.x) + 240;
        const y1 = Math.min(e.y, st.y, tg.y), y2 = Math.max(e.y, st.y, tg.y);
        if (mx >= x1 && mx <= x2 && my >= y1 && my <= y2) return { id: s.id, handle: null };
      }
    }
    return null;
  }, [anchorToCoordFn]);

  const onOverlayDown = (e) => {
    const { x, y } = getMouse(e);
    if (tool === "cursor") {
      const hit = hitTest(x, y);
      if (!hit) { setSelectedShapeId(null); dragRef.current = null; redrawOverlay(); return; }
      setSelectedShapeId(hit.id);
      dragRef.current = hit.handle ? { id: hit.id, handle: hit.handle } : null;
      redrawOverlay(); return;
    }
    const a = coordToAnchor(x, y);
    if (!a) return;
    if (tool === "hline") {
      const s = { id: uid(), type: "hline", p1: a };
      setShapes((prev) => [...prev, s]); setSelectedShapeId(s.id); return;
    }
    if (tool === "rect" || tool === "trend" || tool === "range") {
      drawingRef.current = { type: tool, p1: a, p2: a }; setSelectedShapeId(null); redrawOverlay(); return;
    }
    if (tool === "long" || tool === "short") {
      const existing = drawingRef.current;
      if (!existing || existing.type !== "position") {
        drawingRef.current = { type: "position", side: tool === "long" ? "long" : "short", stage: 1, entry: a, stop: null, target: null, temp: a };
      } else if (existing.stage === 1) {
        drawingRef.current = { ...existing, stage: 2, stop: a, temp: a };
      } else if (existing.stage === 2) {
        const s = { id: uid(), type: "position", side: existing.side, entry: existing.entry, stop: existing.stop || existing.entry, target: a };
        setShapes((prev) => [...prev, s]); setSelectedShapeId(s.id); drawingRef.current = null;
      }
      redrawOverlay();
    }
  };

  const onOverlayMove = (e) => {
    if (tool === "cursor" && dragRef.current) {
      const { x, y } = getMouse(e);
      const a = coordToAnchor(x, y); if (!a) return;
      const { id, handle } = dragRef.current;
      updateShape(id, (s) => {
        if (s.type === "hline" && handle === "p1") return { ...s, p1: a };
        if ((s.type === "rect" || s.type === "range" || s.type === "trend") && (handle === "p1" || handle === "p2")) return { ...s, [handle]: a };
        if (s.type === "position") {
          if (handle === "entry")  return { ...s, entry: a };
          if (handle === "stop")   return { ...s, stop: a };
          if (handle === "target") return { ...s, target: a };
        }
        return s;
      });
      return;
    }
    const d = drawingRef.current;
    if (!d) return;
    const { x, y } = getMouse(e);
    const a = coordToAnchor(x, y); if (!a) return;
    if (d.type === "rect" || d.type === "trend" || d.type === "range") { drawingRef.current = { ...d, p2: a }; redrawOverlay(); return; }
    if (d.type === "position") { drawingRef.current = { ...d, temp: a }; redrawOverlay(); }
  };

  const onOverlayUp = () => {
    dragRef.current = null;
    const d = drawingRef.current;
    if (!d) return;
    if ((d.type === "rect" || d.type === "range") && d.p1 && d.p2) {
      const s = { id: uid(), type: d.type, p1: d.p1, p2: d.p2 };
      setShapes((prev) => [...prev, s]); setSelectedShapeId(s.id); drawingRef.current = null; return;
    }
    if (d.type === "trend" && d.p1 && d.p2) {
      const s = { id: uid(), type: "trend", p1: d.p1, p2: d.p2 };
      setShapes((prev) => [...prev, s]); setSelectedShapeId(s.id); drawingRef.current = null;
    }
  };

  return {
    overlayRef, chartRef, candleSeriesRef, shapesRef, drawingRef, dragRef, chartAliveRef,
    selectedShapeId, setSelectedShapeId, shapesVersion, setShapesVersion,
    tool, setTool, overlayInteractive, setOverlayInteractive,
    redrawOverlay, setShapes, updateShape, selectedShape,
    onOverlayDown, onOverlayMove, onOverlayUp,
  };
}

/* ===================== SHARED TRADING PANEL ===================== */
function TradingPanel({
  symbol, isCrypto, displayCurrency, livePrice, overview,
  activeTab, setActiveTab,
  loadingOverview, about, loadingAbout, fundamentals, loadingFundamentals,
  news, loadingNews, orders, ordersLoading,
  journals, journalsLoading,
  onOpenOrder, onOpenExit,
  lastTickTime,
}) {
  const currentSymbol = String(symbol || "").toUpperCase().trim();

  const symbolJournals = useMemo(() => {
    return Array.isArray(journals)
      ? journals.filter((j) => String(j.symbol || "").toUpperCase().trim() === currentSymbol)
      : [];
  }, [journals, currentSymbol]);

  const activePositions = useMemo(() => {
    const activeJournals = symbolJournals.filter((j) => Number(j.remainingQty || 0) > 0 && j.status !== "CLOSED");

    if (activeJournals.length > 0) return activeJournals.map(normalizePositionFromJournal);

    const seen = new Set();
    return (Array.isArray(orders) ? orders : []).filter((order) => {
      if (String(order.symbol || "").toUpperCase().trim() !== currentSymbol) return false;
      const key = `${order.symbol}_${order.side}_${order.mode}_${order.createdAt}_${order.quantity}_${order.executedPrice}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [symbolJournals, orders, currentSymbol]);

  return (
    <div className="flex w-[430px] flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-gray-900">Trading Panel</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {["overview","ml","fundamentals","positions","journal","news","about"].map((tab) => (
            <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabButton>
          ))}
        </div>

        <div className="mt-5">
          {/* ── Overview Tab ── */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {loadingOverview && <div className="text-sm text-gray-500">Loading {isCrypto ? "crypto" : "stock"} details...</div>}
              {!loadingOverview && overview && (
                <>
                  <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
                    <div className="text-sm text-gray-500">{overview.name || symbol}</div>
                    <div className="mt-1 text-3xl font-bold text-gray-900">{formatCurrency(livePrice ?? overview.quote?.price, displayCurrency)}</div>
                    <div className={`mt-1 text-sm font-semibold ${Number(overview.quote?.change ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(overview.quote?.change, displayCurrency)} ({formatNum(overview.quote?.changePercent)}%)
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Market Cap"  value={formatBigCurrency(overview.metrics?.marketCap, displayCurrency)} />
                    <Stat label="Prev Close"  value={formatCurrency(overview.quote?.previousClose, displayCurrency)} />
                    <Stat label="Open"        value={formatCurrency(overview.quote?.open, displayCurrency)} />
                    <Stat label="Day High"    value={formatCurrency(overview.quote?.dayHigh, displayCurrency)} />
                    <Stat label="Day Low"     value={formatCurrency(overview.quote?.dayLow, displayCurrency)} />
                    <Stat label="Volume"      value={formatBigCurrency(overview.quote?.volume, displayCurrency)} />
                    <Stat label="Avg Vol (3M)" value={formatBigCurrency(overview.quote?.avgVolume, displayCurrency)} />
                    <Stat label="Last Tick"   value={lastTickTime ? new Date(lastTickTime * 1000).toLocaleTimeString("en-IN") : "--"} />
                    {isCrypto && (
                      <>
                        <Stat label="Rank"              value={overview?.cryptoMeta?.marketCapRank != null ? `#${overview.cryptoMeta.marketCapRank}` : "--"} />
                        <Stat label="Circulating Supply" value={formatBig(overview?.cryptoMeta?.circulatingSupply)} />
                        <Stat label="Total Supply"      value={formatBig(overview?.cryptoMeta?.totalSupply)} />
                        <Stat label="ATH"               value={formatCurrency(overview?.cryptoMeta?.ath, displayCurrency)} />
                        <Stat label="ATL"               value={formatCurrency(overview?.cryptoMeta?.atl, displayCurrency)} />
                        <Stat label="Updated"           value={overview?.cryptoMeta?.lastUpdated ? new Date(overview.cryptoMeta.lastUpdated).toLocaleString("en-IN") : "--"} />
                      </>
                    )}
                  </div>
                </>
              )}
              {!loadingOverview && !overview && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  {isCrypto ? "Crypto details not available." : "Stock details not available."}
                </div>
              )}
            </div>
          )}

                    {/* ── ML Tab ── */}
          {activeTab === "ml" && (
            <div className="space-y-4">
              <MlSignalCard
                symbol={symbol}
                isCrypto={isCrypto}
                displayCurrency={displayCurrency}
              />
            </div>
          )}

{/* ── Fundamentals Tab ── */}
          {activeTab === "fundamentals" && (
            <div className="space-y-4">
              {loadingFundamentals && <div className="text-sm text-gray-500">Loading fundamentals...</div>}
              {!loadingFundamentals && fundamentals.length > 0 && (
                <>
                  <FundamentalSummaryCards data={fundamentals} currency={displayCurrency} />
                  <FundamentalBarChart title={isCrypto ? "Market Cap / ATH / Supply View" : "Revenue Comparison"}    data={fundamentals} valueKey="revenue"   formatter={(v) => formatBigCurrency(v, displayCurrency)} barClass="bg-indigo-500" />
                  <FundamentalBarChart title={isCrypto ? "Volume / Total Supply / Current Price View" : "Net Income Comparison"} data={fundamentals} valueKey="netIncome" formatter={(v) => formatBigCurrency(v, displayCurrency)} barClass="bg-green-500" />
                  <FundamentalBarChart title={isCrypto ? "Rank / 24H Change / ATL View" : "EPS Comparison"}          data={fundamentals} valueKey="eps"       formatter={formatNum} barClass="bg-amber-500" />
                </>
              )}
              {!loadingFundamentals && fundamentals.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  {isCrypto ? "Crypto metrics not available." : "Fundamentals not available."}
                </div>
              )}
            </div>
          )}

          {/* ── Positions Tab ── */}
          {activeTab === "positions" && (
            <div className="space-y-4">
              {(ordersLoading || journalsLoading) && <div className="text-sm text-gray-500">Loading positions...</div>}
              {!ordersLoading && !journalsLoading && activePositions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                  <div className="text-2xl mb-2">📭</div>
                  <div className="text-sm font-semibold text-gray-700">No positions yet</div>
                  <div className="text-xs text-gray-400 mt-1">Place a Buy or Sell order to see details here</div>
                </div>
              )}
              {!ordersLoading && !journalsLoading && activePositions.length > 0 && (() => {
                const lp       = livePrice ?? overview?.quote?.price;
                const intraday = activePositions.filter((o) => o.mode === "INTRADAY");
                const delivery = activePositions.filter((o) => o.mode !== "INTRADAY");
                const totalPnl = activePositions.reduce((sum, o) => {
                  const entry   = Number(o.executedPrice || 0);
                  const qty     = Number(o.quantity || 0);
                  const current = Number(lp || entry || 0);
                  return sum + (o.side === "BUY" ? (current - entry) * qty : (entry - current) * qty);
                }, 0);
                return (
                  <>
                    <div className={`rounded-2xl p-3 flex items-center justify-between ${totalPnl >= 0 ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
                      <div>
                        <div className="text-[11px] text-gray-500">Total P&amp;L ({activePositions.length} positions)</div>
                        <div className={`text-base font-bold ${totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>{totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl, displayCurrency)}</div>
                      </div>
                      <div className="flex gap-2 text-[11px]">
                        {intraday.length > 0 && <span className="rounded-full bg-orange-100 text-orange-600 px-2 py-1 font-semibold">{intraday.length} Intraday</span>}
                        {delivery.length > 0 && <span className="rounded-full bg-blue-100 text-blue-600 px-2 py-1 font-semibold">{delivery.length} Delivery</span>}
                      </div>
                    </div>
                    {intraday.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2"><div className="h-px flex-1 bg-orange-100"/><span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">Intraday</span><div className="h-px flex-1 bg-orange-100"/></div>
                        {intraday.map((o) => <IntradayCard key={o.id} order={o} livePrice={lp} currency={displayCurrency} onExit={onOpenExit} />)}
                      </div>
                    )}
                    {delivery.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2"><div className="h-px flex-1 bg-blue-100"/><span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Delivery</span><div className="h-px flex-1 bg-blue-100"/></div>
                        {delivery.map((o) => <PositionCard key={o.id} order={o} livePrice={lp} currency={displayCurrency} onExit={onOpenExit} />)}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}


          {/* ── Journal Tab ── */}
          {activeTab === "journal" && (
            <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Showing full trade journal history. Current chart symbol: <span className="font-semibold text-gray-900">{symbol}</span>
              </div>
              {journalsLoading && <div className="text-sm text-gray-500">Loading trade journal...</div>}
              {!journalsLoading && (!journals || journals.length === 0) && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  No trade journal entries yet.
                </div>
              )}
              {!journalsLoading && journals?.length > 0 && journals.map((item) => (
                <JournalEntryCard key={item._id} item={item} displayCurrency={displayCurrency} />
              ))}
            </div>
          )}

          {/* ── News Tab ── */}
          {activeTab === "news" && (
            <div className="space-y-3">
              {loadingNews && <div className="text-sm text-gray-500">Loading news...</div>}
              {!loadingNews && news.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  {isCrypto ? "No crypto updates available." : "No news available."}
                </div>
              )}
              {news.slice(0, 10).map((n, idx) => {
                const isReal = n.link && n.link !== "#";
                const content = (
                  <>
                    <div className="line-clamp-2 text-sm font-semibold text-gray-900">{n.title || "Untitled"}</div>
                    <div className="mt-1 text-xs text-gray-500">{n.publisher || "—"}{n.publishedAt ? ` • ${new Date(n.publishedAt).toLocaleString("en-IN")}` : ""}</div>
                  </>
                );
                return isReal
                  ? <a key={`${n.title}_${idx}`} href={n.link} target="_blank" rel="noreferrer" className="block rounded-2xl border border-gray-100 p-3 transition hover:border-gray-200 hover:bg-gray-50">{content}</a>
                  : <div key={`${n.title}_${idx}`} className="block rounded-2xl border border-gray-100 p-3">{content}</div>;
              })}
            </div>
          )}

          {/* ── About Tab ── */}
          {activeTab === "about" && (
            <div className="space-y-3">
              {loadingAbout && <div className="text-sm text-gray-500">Loading {isCrypto ? "asset" : "company"} info...</div>}
              {!loadingAbout && about && (
                <div className="rounded-3xl border border-gray-200 bg-white p-4">
                  <div className="text-xs text-gray-500">{about.sector ? `${about.sector} • ` : ""}{about.industry || ""}</div>
                  {about.summary && <div className="mt-2 text-sm leading-relaxed text-gray-700">{about.summary}</div>}
                </div>
              )}
              {!loadingAbout && !about && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  {isCrypto ? "Crypto asset info not available." : "Company info not available."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Buy / Sell Buttons */}
      <div className="space-y-3 border-t border-gray-200 p-6">
        <button onClick={() => onOpenOrder("BUY")}  className="w-full rounded-2xl bg-green-500 py-3 font-semibold text-white transition hover:bg-green-600">Buy</button>
        <button onClick={() => onOpenOrder("SELL")} className="w-full rounded-2xl bg-red-500   py-3 font-semibold text-white transition hover:bg-red-600">Sell</button>
      </div>
    </div>
  );
}

/* ===================== SHARED DRAWING TOOLBAR ===================== */
function DrawingToolbar({ tool, setTool, drawingRef, selectedShapeId, deleteSelected, clearAll }) {
  return (
    <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-gray-200 bg-white/90 p-1 shadow-sm backdrop-blur">
      {[
        ["cursor", "Cursor / Select",      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 3l7 17 2-6 6-2L5 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>],
        ["rect",   "Rectangle",            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="5" y="6" width="14" height="12" stroke="currentColor" strokeWidth="2"/></svg>],
        ["trend",  "Trend Line",           <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="5" cy="17" r="2" fill="currentColor"/><circle cx="19" cy="7" r="2" fill="currentColor"/></svg>],
        ["hline",  "Horizontal Line",      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>],
        ["range",  "Date / Price Range",   <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M7 5v4M17 5v4M5 11h14M6 14h6M6 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>],
      ].map(([k, title, icon]) => (
        <button key={k} type="button" title={title} onClick={() => setTool(k)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${tool === k ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
          {icon}
        </button>
      ))}
      <button type="button" title="Long Position" onClick={() => { setTool("long"); drawingRef.current = null; }}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${tool === "long" ? "border-green-600 bg-green-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M7 10l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <button type="button" title="Short Position" onClick={() => { setTool("short"); drawingRef.current = null; }}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${tool === "short" ? "border-red-600 bg-red-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M7 14l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <div className="mx-1 h-7 w-px bg-gray-200" />
      <button type="button" onClick={deleteSelected} disabled={!selectedShapeId} title="Delete Selected"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 disabled:opacity-40">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 7h12M9 7V5h6v2m-8 0l1 14h8l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <button type="button" onClick={clearAll} title="Clear All"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}

/* ===================== SHARED SHAPE EDITOR ===================== */
function ShapeEditor({ selectedShape, setShapes, updateShape, setSelectedShapeId, displayCurrency }) {
  if (!selectedShape) return null;

  const epochToLocalInput = (sec) => {
    if (!sec) return "";
    const d   = new Date(sec * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const localInputToEpoch = (val) => {
    if (!val) return null;
    const ms = new Date(val).getTime();
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
  };

  return (
    <div className="absolute bottom-3 left-3 z-30 w-[350px] rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">
          {selectedShape.type === "position" ? `${selectedShape.side === "long" ? "Long" : "Short"} Position` : selectedShape.type.toUpperCase()}
        </div>
        <button type="button" onClick={() => { setShapes((prev) => prev.filter((s) => s.id !== selectedShape.id)); setSelectedShapeId(null); }}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold hover:bg-gray-50">Delete</button>
      </div>
      <div className="mt-2 text-[11px] text-gray-500">Tip: drawings are saved per symbol.</div>
      <div className="mt-3 space-y-2 text-xs">
        {selectedShape.type === "position" && (
          <>
            <div className="flex items-center gap-2">
              <span className="w-14 text-gray-500">Side</span>
              {["long","short"].map((s) => (
                <button key={s} type="button" onClick={() => updateShape(selectedShape.id, (sh) => ({ ...sh, side: s }))}
                  className={`rounded-lg border px-2 py-1 ${selectedShape.side === s ? (s === "long" ? "border-green-600 bg-green-600 text-white" : "border-red-600 bg-red-600 text-white") : "border-gray-200 hover:bg-gray-50"}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            {["entry","stop","target"].map((k) => (
              <div key={k} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-3 capitalize text-gray-500">{k}</div>
                <input className="col-span-4 rounded-lg border px-2 py-1" type="number"
                  value={Number(convertPrice(selectedShape[k]?.price ?? 0, displayCurrency) ?? 0)}
                  onChange={(e) => updateShape(selectedShape.id, (s) => ({ ...s, [k]: { ...(s[k]||{}), price: displayCurrency === "USD" ? Number(e.target.value) * LIVE_INR_PER_USD : Number(e.target.value) } }))} />
                <input className="col-span-5 rounded-lg border px-2 py-1" type="datetime-local"
                  value={epochToLocalInput(selectedShape[k]?.time)}
                  onChange={(e) => { const t = localInputToEpoch(e.target.value); if (!t) return; updateShape(selectedShape.id, (s) => ({ ...s, [k]: { ...(s[k]||{}), time: t } })); }} />
              </div>
            ))}
          </>
        )}
        {(selectedShape.type === "rect" || selectedShape.type === "range" || selectedShape.type === "trend") && (
          <>
            {["p1","p2"].map((k) => (
              <div key={k} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-2 uppercase text-gray-500">{k}</div>
                <input className="col-span-4 rounded-lg border px-2 py-1" type="number"
                  value={Number(convertPrice(selectedShape[k]?.price ?? 0, displayCurrency) ?? 0)}
                  onChange={(e) => updateShape(selectedShape.id, (s) => ({ ...s, [k]: { ...(s[k]||{}), price: displayCurrency === "USD" ? Number(e.target.value) * LIVE_INR_PER_USD : Number(e.target.value) } }))} />
                <input className="col-span-6 rounded-lg border px-2 py-1" type="datetime-local"
                  value={epochToLocalInput(selectedShape[k]?.time)}
                  onChange={(e) => { const t = localInputToEpoch(e.target.value); if (!t) return; updateShape(selectedShape.id, (s) => ({ ...s, [k]: { ...(s[k]||{}), time: t } })); }} />
              </div>
            ))}
          </>
        )}
        {selectedShape.type === "hline" && (
          <div className="grid grid-cols-12 items-center gap-2">
            <div className="col-span-4 text-gray-500">Price</div>
            <input className="col-span-8 rounded-lg border px-2 py-1" type="number"
              value={Number(convertPrice(selectedShape.p1?.price ?? 0, displayCurrency) ?? 0)}
              onChange={(e) => updateShape(selectedShape.id, (s) => ({ ...s, p1: { ...(s.p1||{}), price: displayCurrency === "USD" ? Number(e.target.value) * LIVE_INR_PER_USD : Number(e.target.value) } }))} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== ORDER MODAL ===================== */
function OrderModal({
  show, onClose, symbol, isCrypto,
  orderSide, orderType, setOrderType,
  orderMode, setOrderMode,
  quantity, setQuantity,
  price, setPrice,
  orderJournal, setOrderJournal,
  placingOrder, orderError, orderSuccess,
  onConfirm, livePrice, overview, displayCurrency, about,
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[430px] rounded-3xl bg-white p-6 shadow-xl">
        <h2 className={`mb-4 text-xl font-bold ${orderSide === "BUY" ? "text-green-600" : "text-red-600"}`}>{orderSide} Order</h2>
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <div className="text-sm font-semibold text-gray-900">{symbol}</div>
            <div className="mt-1 text-xs text-gray-500">Live Price: {formatCurrency(livePrice ?? overview?.quote?.price, displayCurrency)}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Order Mode</label>
            <div className="mt-1 flex gap-2">
              {["DELIVERY","INTRADAY"].map((m) => (
                <button key={m} type="button" onClick={() => setOrderMode(m)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${orderMode === m ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                  {m.charAt(0) + m.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          {isCrypto ? (
            <>
              <div><label className="text-sm text-gray-600">Quantity</label><input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 w-full rounded-xl border p-2" /></div>
              <div>
                <label className="text-sm text-gray-600">Limit Price ({displayCurrency})</label>
                <input type="number" value={Number(convertPrice(price, displayCurrency) ?? 0)}
                  onChange={(e) => setPrice(displayCurrency === "USD" ? Number(e.target.value) * LIVE_INR_PER_USD : Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border p-2" />
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs font-semibold text-gray-700">Position Preview</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white p-2"><div className="text-gray-500">Side</div><div className="mt-1 font-semibold text-gray-900">{orderSide}</div></div>
                  <div className="rounded-xl bg-white p-2"><div className="text-gray-500">Qty</div><div className="mt-1 font-semibold text-gray-900">{quantity}</div></div>
                  <div className="rounded-xl bg-white p-2"><div className="text-gray-500">Mode</div><div className="mt-1 font-semibold text-gray-900">{orderMode}</div></div>
                  <div className="rounded-xl bg-white p-2"><div className="text-gray-500">Execution</div><div className="mt-1 font-semibold text-gray-900">Limit</div></div>
                  <div className="rounded-xl bg-white p-2 col-span-2"><div className="text-gray-500">Limit Price</div><div className="mt-1 font-semibold text-gray-900">{formatCurrency(price, displayCurrency)}</div></div>
                  <div className="rounded-xl bg-white p-2 col-span-2"><div className="text-gray-500">Estimated Value</div><div className="mt-1 font-semibold text-gray-900">{formatCurrency(Number(price) * Number(quantity), displayCurrency)}</div></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm text-gray-600">Order Type</label>
                <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="mt-1 w-full rounded-xl border p-2">
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                </select>
              </div>
              {orderType === "LIMIT" && (
                <div>
                  <label className="text-sm text-gray-600">Limit Price ({displayCurrency})</label>
                  <input type="number" value={Number(convertPrice(price, displayCurrency) ?? 0)}
                    onChange={(e) => setPrice(displayCurrency === "USD" ? Number(e.target.value) * LIVE_INR_PER_USD : Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border p-2" />
                </div>
              )}
              <div><label className="text-sm text-gray-600">Quantity</label><input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 w-full rounded-xl border p-2" /></div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs font-semibold text-gray-700">Order Preview</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white p-2"><div className="text-gray-500">Side</div><div className="mt-1 font-semibold text-gray-900">{orderSide}</div></div>
                  <div className="rounded-xl bg-white p-2"><div className="text-gray-500">Qty</div><div className="mt-1 font-semibold text-gray-900">{quantity}</div></div>
                  <div className="rounded-xl bg-white p-2"><div className="text-gray-500">Type</div><div className="mt-1 font-semibold text-gray-900">{orderType}</div></div>
                  <div className="rounded-xl bg-white p-2"><div className="text-gray-500">Mode</div><div className="mt-1 font-semibold text-gray-900">{orderMode}</div></div>
                  <div className="rounded-xl bg-white p-2 col-span-2">
                    <div className="text-gray-500">Execution Price</div>
                    <div className="mt-1 font-semibold text-gray-900">
                      {formatCurrency(orderType === "MARKET" ? Number(livePrice ?? overview?.quote?.price ?? 0) : Number(price), displayCurrency)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {orderError   && <div className="rounded-xl border border-red-200   bg-red-50   px-3 py-2 text-sm text-red-600">{orderError}</div>}
          {orderSuccess && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-600">{orderSuccess}</div>}
          <div className="flex justify-between pt-2">
            <button onClick={onClose} className="rounded-xl bg-gray-200 px-4 py-2">Cancel</button>
            <button onClick={onConfirm} disabled={placingOrder}
              className={`rounded-xl px-6 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 ${orderSide === "BUY" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}>
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ===================== ENTRY JOURNAL MODAL ===================== */
function EntryJournalModal({
  show, onClose, onBack,
  orderJournal, setOrderJournal,
  placingOrder, orderError, orderSuccess,
  onConfirm, orderSide,
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Trade Journal Entry</h2>
            <p className="mt-1 text-xs text-gray-500">Add your trade notes before placing the order.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={placingOrder}
            className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-gray-600">Strategy</label>
            <input
              type="text"
              value={orderJournal?.strategy || ""}
              onChange={(e) => setOrderJournal((prev) => ({ ...prev, strategy: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 text-sm"
              placeholder="Scalping / Breakout / Swing"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Setup Type</label>
            <input
              type="text"
              value={orderJournal?.setupType || ""}
              onChange={(e) => setOrderJournal((prev) => ({ ...prev, setupType: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 text-sm"
              placeholder="Pullback / Reversal / Range"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Confidence (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={orderJournal?.confidence || ""}
              onChange={(e) => setOrderJournal((prev) => ({ ...prev, confidence: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Reason for Entry</label>
            <textarea
              rows="3"
              value={orderJournal?.reasonForEntry || ""}
              onChange={(e) => setOrderJournal((prev) => ({ ...prev, reasonForEntry: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 text-sm"
              placeholder="Why are you taking this trade?"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Emotion Before</label>
            <input
              type="text"
              value={orderJournal?.emotionBefore || ""}
              onChange={(e) => setOrderJournal((prev) => ({ ...prev, emotionBefore: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 text-sm"
              placeholder="Calm / Confident / Fearful"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Tags</label>
            <input
              type="text"
              value={orderJournal?.tags || ""}
              onChange={(e) => setOrderJournal((prev) => ({ ...prev, tags: e.target.value }))}
              className="mt-1 w-full rounded-xl border p-2 text-sm"
              placeholder="breakout, support, momentum"
            />
          </div>
        </div>

        {orderError   && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{orderError}</div>}
        {orderSuccess && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-600">{orderSuccess}</div>}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={placingOrder}
            className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={placingOrder}
            className={`rounded-xl px-6 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              orderSide === "BUY" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {placingOrder ? "Placing..." : `Place ${orderSide} Order`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== EXIT MODAL ===================== */
function ExitModal({
  show, exitOrder, onClose,
  exitQty, setExitQty,
  exitJournal, setExitJournal,
  exitLoading, exitError, exitSuccess,
  onConfirm, livePrice, overview, displayCurrency,
}) {
  if (!show || !exitOrder) return null;
  const lp         = Number(livePrice ?? overview?.quote?.price ?? exitOrder.executedPrice ?? 0);
  const exitSide   = exitOrder.side === "BUY" ? "SELL" : "BUY";
  const entryPrice = Number(exitOrder.executedPrice || 0);
  const exitValue  = lp * Number(exitQty);
  const pnlPreview = exitOrder.side === "BUY" ? (lp - entryPrice) * Number(exitQty) : (entryPrice - lp) * Number(exitQty);
  const isProfit   = pnlPreview >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[420px] rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Exit Position</h2>
            <p className="text-xs text-gray-400 mt-0.5">{exitOrder.mode === "INTRADAY" ? "🟠 Intraday" : "🔵 Delivery"} · {exitOrder.symbol}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50 text-gray-500">✕</button>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 mb-4">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><div className="text-gray-400">Side</div><div className={`mt-1 font-bold ${exitOrder.side === "BUY" ? "text-green-600" : "text-red-600"}`}>{exitOrder.side}</div></div>
            <div><div className="text-gray-400">Entry Price</div><div className="mt-1 font-bold text-gray-900">{formatCurrency(entryPrice, displayCurrency)}</div></div>
            <div><div className="text-gray-400">Held Qty</div><div className="mt-1 font-bold text-gray-900">{exitOrder.quantity}</div></div>
          </div>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${exitSide === "SELL" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>EXIT → {exitSide}</span>
          <span className="text-xs text-gray-400">at market price (LTP)</span>
        </div>
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700">Exit Quantity</label>
          <div className="mt-1.5 flex items-center gap-2">
            <button type="button" onClick={() => setExitQty((q) => Math.max(1, Number(q) - 1))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold hover:bg-gray-50">−</button>
            <input type="number" min={1} max={exitOrder.quantity} value={exitQty}
              onChange={(e) => setExitQty(Math.min(Number(e.target.value), Number(exitOrder.quantity)))}
              className="flex-1 rounded-xl border border-gray-200 p-2 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-200" />
            <button type="button" onClick={() => setExitQty((q) => Math.min(Number(q) + 1, Number(exitOrder.quantity)))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold hover:bg-gray-50">+</button>
            <button type="button" onClick={() => setExitQty(Number(exitOrder.quantity))} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200">MAX</button>
          </div>
        </div>
        <div className={`rounded-2xl p-4 mb-4 ${isProfit ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
          <div className="text-xs text-gray-500 mb-2 font-medium">Exit Preview</div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><div className="text-gray-400">Exit Price (LTP)</div><div className="mt-1 font-bold text-gray-900">{formatCurrency(lp, displayCurrency)}</div></div>
            <div><div className="text-gray-400">Exit Value</div><div className="mt-1 font-bold text-gray-900">{formatCurrency(exitValue, displayCurrency)}</div></div>
            <div><div className="text-gray-400">Realised P&L</div><div className={`mt-1 font-bold text-base ${isProfit ? "text-green-600" : "text-red-600"}`}>{isProfit ? "+" : ""}{formatCurrency(pnlPreview, displayCurrency)}</div></div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 mb-4">
          <div className="mb-3 text-xs font-semibold text-gray-700">Trade Journal Exit Notes</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-600">Reason for Exit</label>
              <textarea
                rows="2"
                value={exitJournal?.reasonForExit || ""}
                onChange={(e) => setExitJournal((prev) => ({ ...prev, reasonForExit: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-sm"
                placeholder="Target hit / SL hit / manual exit / trailing stop"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Emotion After</label>
              <input
                type="text"
                value={exitJournal?.emotionAfter || ""}
                onChange={(e) => setExitJournal((prev) => ({ ...prev, emotionAfter: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-sm"
                placeholder="Satisfied / Regret / Neutral"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Rating (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={exitJournal?.rating || ""}
                onChange={(e) => setExitJournal((prev) => ({ ...prev, rating: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-600">Mistakes</label>
              <textarea
                rows="2"
                value={exitJournal?.mistakes || ""}
                onChange={(e) => setExitJournal((prev) => ({ ...prev, mistakes: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-sm"
                placeholder="What went wrong?"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-600">Lessons Learned</label>
              <textarea
                rows="2"
                value={exitJournal?.lessonsLearned || ""}
                onChange={(e) => setExitJournal((prev) => ({ ...prev, lessonsLearned: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-sm"
                placeholder="What will you improve next time?"
              />
            </div>
          </div>
        </div>

        {exitError   && <div className="mb-3 rounded-xl border border-red-200   bg-red-50   px-3 py-2 text-sm text-red-600">{exitError}</div>}
        {exitSuccess && <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-600">{exitSuccess}</div>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={exitLoading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={exitLoading}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition disabled:opacity-60 disabled:cursor-not-allowed">
            {exitLoading ? "Exiting..." : `Confirm Exit ${exitSide}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== STOCK CHART ===================== */
// Stock-specific: IST-aware WS candle bucketing, NSE/BSE market hours, stock timeframes
function StockChart({ symbol }) {
  const containerRef      = useRef(null);
  const wsRef             = useRef(null);
  const resizeObserverRef = useRef(null);
  const currentCandleRef  = useRef(null);
  const lastCandleTimeSec = useRef(0);
  const ema20SeriesRef    = useRef(null);
  const ema50SeriesRef    = useRef(null);
  const rsiSeriesRef      = useRef(null);
  const macdSeriesRef     = useRef(null);
  const macdSignalSeriesRef = useRef(null);

  const [displayCurrency, setDisplayCurrency] = useState("INR");

  const drawing = useChartDrawing({ displayCurrency });
  const {
    overlayRef, chartRef, candleSeriesRef, shapesRef, drawingRef, dragRef, chartAliveRef,
    selectedShapeId, setSelectedShapeId, shapesVersion, setShapesVersion,
    tool, setTool, overlayInteractive, setOverlayInteractive,
    redrawOverlay, setShapes, updateShape, selectedShape,
    onOverlayDown, onOverlayMove, onOverlayUp,
  } = drawing;

  const [candles, setCandles]         = useState([]);
  const [overview, setOverview]       = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [about, setAbout]             = useState(null);
  const [loadingAbout, setLoadingAbout] = useState(false);
  const [fundamentals, setFundamentals] = useState([]);
  const [loadingFundamentals, setLoadingFundamentals] = useState(false);
  const [news, setNews]               = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [orders, setOrders]           = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [livePrice, setLivePrice]     = useState(null);
  const [lastTickTime, setLastTickTime] = useState(null);
  const [marketLive, setMarketLive]   = useState(false);
  const [activeTab, setActiveTab]     = useState("overview");
  const [timeframeKey, setTimeframeKey] = useState("5m");
  const [indicatorsOpen, setIndicatorsOpen] = useState(true);
  const [indEMA, setIndEMA]           = useState(true);
  const [indRSI, setIndRSI]           = useState(false);
  const [indMACD, setIndMACD]         = useState(false);

  // Order modal state
  const [showModal, setShowModal]     = useState(false);
  const [orderSide, setOrderSide]     = useState("BUY");
  const [orderType, setOrderType]     = useState("MARKET");
  const [orderMode, setOrderMode]     = useState("INTRADAY");
  const [quantity, setQuantity]       = useState(1);
  const [price, setPrice]             = useState(0);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError]   = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const [orderJournal, setOrderJournal] = useState({
    strategy: "",
    setupType: "",
    confidence: "",
    reasonForEntry: "",
    emotionBefore: "",
    tags: "",
  });
  const [showEntryJournalModal, setShowEntryJournalModal] = useState(false);

  // Exit modal state
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitOrder, setExitOrder]     = useState(null);
  const [exitQty, setExitQty]         = useState(1);
  const [exitLoading, setExitLoading] = useState(false);
  const [exitError, setExitError]     = useState("");
  const [exitSuccess, setExitSuccess] = useState("");
  const [exitJournal, setExitJournal] = useState({
    reasonForExit: "",
    emotionAfter: "",
    mistakes: "",
    lessonsLearned: "",
    rating: "",
  });
  const [journals, setJournals] = useState([]);
  const [journalsLoading, setJournalsLoading] = useState(false);

  // Stock timeframes use IST-aware buckets aligned to NSE market open (09:15 IST)
  const TF_OPTIONS = useMemo(() => [
    { key: "1m",  label: "1m",  interval: "1m",  days: 5,   seconds: 60    },
    { key: "5m",  label: "5m",  interval: "5m",  days: 30,  seconds: 300   },
    { key: "15m", label: "15m", interval: "15m", days: 60,  seconds: 900   },
    { key: "1h",  label: "1H",  interval: "60m", days: 120, seconds: 3600  },
    { key: "1d",  label: "1D",  interval: "1d",  days: 365, seconds: 86400 },
  ], []);

  const tf = useMemo(() => TF_OPTIONS.find((x) => x.key === timeframeKey) || TF_OPTIONS[1], [TF_OPTIONS, timeframeKey]);

  const safeJson = async (res) => {
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
    try { return JSON.parse(text); }
    catch { throw new Error("Invalid JSON response"); }
  };

  const saveLayout = useCallback(() => {
    try {
      localStorage.setItem(layoutKey(symbol), JSON.stringify({
        timeframeKey, indicatorsOpen, indEMA, indRSI, indMACD,
        shapes: shapesRef.current || [], displayCurrency,
      }));
    } catch (e) { console.error("Save layout error", e); }
  }, [symbol, timeframeKey, indicatorsOpen, indEMA, indRSI, indMACD, displayCurrency]);

  const loadLayout = useCallback(() => {
    try {
      const raw = localStorage.getItem(layoutKey(symbol));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [symbol]);

  useEffect(() => {
    const saved = loadLayout();
    if (!saved) { shapesRef.current = []; setShapesVersion((v) => v + 1); return; }
    if (saved.timeframeKey)    setTimeframeKey(saved.timeframeKey);
    if (saved.displayCurrency) setDisplayCurrency(saved.displayCurrency);
    setIndicatorsOpen(saved.indicatorsOpen !== false);
    setIndEMA(saved.indEMA !== false);
    setIndRSI(!!saved.indRSI);
    setIndMACD(!!saved.indMACD);
    shapesRef.current = Array.isArray(saved.shapes) ? saved.shapes : [];
    setShapesVersion((v) => v + 1);
  }, [symbol, loadLayout]);

  useEffect(() => { saveLayout(); }, [saveLayout, shapesVersion, displayCurrency]);

  const fetchOrders = useCallback(async () => {
    try {
      const userId = getLoggedInUserId();
      if (!userId) { setOrders([]); return; }
      setOrdersLoading(true);
      const res = await api.get(`/orders/user/${userId}`);
      const apiOrders = Array.isArray(res?.data?.orders) ? res.data.orders : [];
      const currentSymbol = String(symbol).toUpperCase().trim();
      const mapped = apiOrders
        .filter((order) => String(order.symbol || "").toUpperCase().trim() === currentSymbol)
        .map((order) => ({
          id:            order._id,
          symbol:        order.symbol,
          side:          order.type,
          mode:          order.mode || "DELIVERY",
          orderType:     order.orderType || (order.price ? "LIMIT" : "MARKET"),
          quantity:      Number(order.quantity),
          limitPrice:    Number(order.price),
          executedPrice: Number(order.price),
          totalValue:    Number(order.quantity) * Number(order.price),
          status:        order.status || "FILLED",
          createdAt:     order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "--",
        }));
      setOrders(mapped);
    } catch (error) {
      console.error("fetchOrders error:", error);
      setOrders([]);
    } finally { setOrdersLoading(false); }
  }, [symbol]);

  const fetchJournals = useCallback(async () => {
    try {
      const userId = getLoggedInUserId();
      if (!userId) { setJournals([]); return; }
      setJournalsLoading(true);
      const rows = await requestTradeJournals(api, userId);
      setJournals((Array.isArray(rows) ? rows : []).map(normalizeJournal));
    } catch (error) {
      console.error("fetchJournals error:", error);
      setJournals([]);
    } finally {
      setJournalsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchOrders();
    fetchJournals();
    const refresh = () => { fetchOrders(); fetchJournals(); };
    window.addEventListener("orders-updated",    refresh);
    window.addEventListener("holding-updated",   refresh);
    window.addEventListener("portfolio-updated", refresh);
    return () => {
      window.removeEventListener("orders-updated",    refresh);
      window.removeEventListener("holding-updated",   refresh);
      window.removeEventListener("portfolio-updated", refresh);
    };
  }, [fetchOrders, fetchJournals]);

  const indicatorData = useMemo(() => {
    if (!candles.length) return { ema20: [], ema50: [], rsi14: [], macd: [], macdSignal: [] };
    const closes = candles.map((c) => Number(c.close));
    const e20 = ema(closes, 20);
    const e50 = ema(closes, 50);
    const r   = rsi(closes, 14);
    const m   = macd(closes, 12, 26, 9);
    return { ema20: e20, ema50: e50, rsi14: r, macd: m.macd, macdSignal: m.signal };
  }, [candles]);

  const lastIdx        = candles.length - 1;
  const lastEMA20      = lastIdx >= 0 ? indicatorData.ema20[lastIdx] : null;
  const lastEMA50      = lastIdx >= 0 ? indicatorData.ema50[lastIdx] : null;
  const lastRSI        = lastIdx >= 0 ? indicatorData.rsi14[lastIdx] : null;
  const lastMACD       = lastIdx >= 0 ? indicatorData.macd[lastIdx] : null;
  const lastMACDSignal = lastIdx >= 0 ? indicatorData.macdSignal[lastIdx] : null;
  const trendLabel     = lastEMA20 && lastEMA50 ? (lastEMA20 > lastEMA50 ? "Bullish" : "Bearish") : "--";

  /* ── Chart Init: Stock-only — WS + IST bucket alignment ── */
  useEffect(() => {
    if (!containerRef.current) return;

    setCandles([]);
    currentCandleRef.current  = null;
    lastCandleTimeSec.current = 0;
    setLivePrice(null);
    setLastTickTime(null);
    setMarketLive(false);
    drawingRef.current = null;
    dragRef.current    = null;
    setSelectedShapeId(null);

    chartAliveRef.current = true;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: "#ffffff" }, textColor: "#111827" },
      grid: { vertLines: { color: "#eef2f7" }, horzLines: { color: "#eef2f7" } },
      crosshair: { mode: 0 },
      rightPriceScale: { visible: false },
      leftPriceScale:  { visible: true, borderVisible: false },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
        rightOffset: 8,
        // Stock times displayed in IST
        tickMarkFormatter: (time) => {
          const d = new Date((time + IST_OFFSET_SEC) * 1000);
          return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
        },
      },
      localization: { locale: "en-IN", dateFormat: "dd/MM/yyyy" },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      priceScaleId: "left",
      upColor: "#16a34a", downColor: "#dc2626",
      wickUpColor: "#16a34a", wickDownColor: "#dc2626",
      borderUpColor: "#16a34a", borderDownColor: "#dc2626",
      lastValueVisible: true, priceLineVisible: true,
    });

    chartRef.current        = chart;
    candleSeriesRef.current = candleSeries;
    ema20SeriesRef.current = ema50SeriesRef.current = rsiSeriesRef.current = macdSeriesRef.current = macdSignalSeriesRef.current = null;

    const resizeCanvas = () => {
      const canvas = overlayRef.current, box = containerRef.current;
      if (!canvas || !box) return;
      canvas.width  = Math.floor(box.clientWidth);
      canvas.height = Math.floor(box.clientHeight);
      redrawOverlay();
    };

    // FIX: Use api axios instance instead of hardcoded localhost URL
    const fetchHistorical = async () => {
      try {
        const res  = await api.get(`/stocks/history`, {
          params: { symbol, interval: tf.interval, days: tf.days }
        });
        const data = res.data;
        const normalized = normalizeHistory(data);
        if (!normalized.length) { setCandles([]); return; }
        const chartCandles = normalized.map((c) => ({ time: Math.floor(c.time), open: c.open, high: c.high, low: c.low, close: c.close }));
        try { candleSeries.setData(chartCandles); } catch (e) { console.error("setData error:", e); setCandles([]); return; }
        setCandles(normalized);
        const last = normalized[normalized.length - 1] || null;
        currentCandleRef.current  = last;
        lastCandleTimeSec.current = last ? Math.floor(Number(last.time)) : 0;
        if (last?.close != null) setLivePrice(last.close);
        chart.timeScale().fitContent();
        requestAnimationFrame(() => { if (chartAliveRef.current) redrawOverlay(); });
      } catch (err) { console.error("[StockChart] fetchHistorical error:", err); setCandles([]); }
    };

    // FIX: Use api axios instance instead of hardcoded localhost URL
    const fetchOverview = async () => {
      try {
        setLoadingOverview(true);
        const res  = await api.get(`/stocks/overview`, { params: { symbol } });
        const data = res.data;
        const normalized = normalizeOverview(data, symbol);
        setOverview(normalized);
        if (normalized?.quote?.price != null) setLivePrice(normalized.quote.price);
      } catch (err) { console.error("[StockChart] Overview error:", err); setOverview(null); }
      finally { setLoadingOverview(false); }
    };

    fetchHistorical();
    fetchOverview();

    // Stock WebSocket — IST-aware bucket alignment for NSE/BSE market hours
    const ws = new WebSocket(`ws://localhost:8091?symbol=${encodeURIComponent(symbol)}`);
    wsRef.current = ws;
    ws.onopen  = () => setMarketLive(true);
    ws.onerror = () => setMarketLive(false);
    ws.onclose = () => setMarketLive(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const tickPrice = Number(
          msg?.price ?? msg?.ltp ?? msg?.close ??
          msg?.data?.price ?? msg?.data?.ltp ?? msg?.candles?.["1m"]?.close
        );
        if (!Number.isFinite(tickPrice)) return;

        // IST-aligned bucket — critical for NSE 09:15 open alignment
        const nowSec = Math.floor(Date.now() / 1000);
        const cTime  = bucketTime(nowSec, tf.seconds);

        setMarketLive(true); setLastTickTime(nowSec); setLivePrice(tickPrice);

        setOverview((prev) => {
          if (!prev) return prev;
          const previousClose = Number(prev.quote?.previousClose);
          const change        = Number.isFinite(previousClose) ? tickPrice - previousClose : prev.quote?.change;
          const changePercent = Number.isFinite(previousClose) && previousClose !== 0 ? (change / previousClose) * 100 : prev.quote?.changePercent;
          return {
            ...prev,
            quote: {
              ...prev.quote, price: tickPrice, change, changePercent,
              dayHigh: Math.max(Number(prev.quote?.dayHigh || tickPrice), tickPrice),
              dayLow:  prev.quote?.dayLow == null ? tickPrice : Math.min(Number(prev.quote?.dayLow), tickPrice),
              volume:  msg?.volume ?? prev.quote?.volume,
            },
          };
        });

        if (lastCandleTimeSec.current !== cTime) {
          const newCandle = { time: cTime, open: tickPrice, high: tickPrice, low: tickPrice, close: tickPrice };
          currentCandleRef.current  = newCandle;
          lastCandleTimeSec.current = cTime;
          try { candleSeries.update(newCandle); } catch(e) { console.warn("ws update:", e.message); }
          setCandles((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && Math.floor(Number(last.time)) === cTime) next[next.length - 1] = newCandle;
            else if (!last || cTime > Math.floor(Number(last.time))) next.push(newCandle);
            return next;
          });
        } else {
          const candle = {
            time:  cTime,
            open:  currentCandleRef.current?.open  ?? tickPrice,
            high:  Math.max(currentCandleRef.current?.high  ?? tickPrice, tickPrice),
            low:   Math.min(currentCandleRef.current?.low   ?? tickPrice, tickPrice),
            close: tickPrice,
          };
          currentCandleRef.current = candle;
          try { candleSeries.update(candle); } catch(e) { console.warn("ws update:", e.message); }
          setCandles((prev) => {
            const next = [...prev];
            if (next.length && Math.floor(Number(next[next.length - 1].time)) === cTime) next[next.length - 1] = candle;
            return next;
          });
        }
        redrawOverlay();
      } catch (err) { console.error("WS parse error:", err); }
    };

    const onVisibleRangeChange = () => redrawOverlay();
    chart.timeScale().subscribeVisibleTimeRangeChange(onVisibleRangeChange);

    resizeObserverRef.current = new ResizeObserver(() => resizeCanvas());
    resizeObserverRef.current.observe(containerRef.current);
    resizeCanvas();

    return () => {
      chartAliveRef.current = false;
      try { chart.timeScale().unsubscribeVisibleTimeRangeChange(onVisibleRangeChange); } catch {}
      try { resizeObserverRef.current?.disconnect(); } catch {}
      try { wsRef.current?.close(); } catch {}
      chartRef.current = null;
      candleSeriesRef.current = null;
      try { chart.remove(); } catch {}
    };
  }, [symbol, tf.interval, tf.days, tf.seconds, redrawOverlay]);

  /* ── Indicators ── */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const lineData = (arr) => candles.map((c, i) => {
      const v = arr?.[i];
      if (v == null || Number.isNaN(Number(v))) return null;
      return { time: c.time, value: Number(v) };
    }).filter(Boolean);

    if (indEMA) {
      if (!ema20SeriesRef.current) ema20SeriesRef.current = chart.addSeries(LineSeries, { priceScaleId: "left", lineWidth: 2, color: "#2563eb", lastValueVisible: false, priceLineVisible: false });
      if (!ema50SeriesRef.current) ema50SeriesRef.current = chart.addSeries(LineSeries, { priceScaleId: "left", lineWidth: 2, color: "#7c3aed", lastValueVisible: false, priceLineVisible: false });
      ema20SeriesRef.current.setData(lineData(indicatorData.ema20));
      ema50SeriesRef.current.setData(lineData(indicatorData.ema50));
    } else {
      if (ema20SeriesRef.current) { chart.removeSeries(ema20SeriesRef.current); ema20SeriesRef.current = null; }
      if (ema50SeriesRef.current) { chart.removeSeries(ema50SeriesRef.current); ema50SeriesRef.current = null; }
    }
    if (indRSI) {
      if (!rsiSeriesRef.current) {
        rsiSeriesRef.current = chart.addSeries(LineSeries, { priceScaleId: "rsi", lineWidth: 2, color: "#f59e0b", lastValueVisible: false, priceLineVisible: false });
        chart.priceScale("rsi").applyOptions({ visible: false, scaleMargins: { top: 0.76, bottom: 0.02 } });
      }
      rsiSeriesRef.current.setData(lineData(indicatorData.rsi14));
    } else if (rsiSeriesRef.current) { chart.removeSeries(rsiSeriesRef.current); rsiSeriesRef.current = null; }
    if (indMACD) {
      if (!macdSeriesRef.current) {
        macdSeriesRef.current = chart.addSeries(LineSeries, { priceScaleId: "macd", lineWidth: 2, color: "#10b981", lastValueVisible: false, priceLineVisible: false });
        chart.priceScale("macd").applyOptions({ visible: false, scaleMargins: { top: 0.76, bottom: 0.02 } });
      }
      if (!macdSignalSeriesRef.current) {
        macdSignalSeriesRef.current = chart.addSeries(LineSeries, { priceScaleId: "macd", lineWidth: 2, color: "#ef4444", lastValueVisible: false, priceLineVisible: false });
      }
      macdSeriesRef.current.setData(lineData(indicatorData.macd));
      macdSignalSeriesRef.current.setData(lineData(indicatorData.macdSignal));
    } else {
      if (macdSeriesRef.current)       { chart.removeSeries(macdSeriesRef.current); macdSeriesRef.current = null; }
      if (macdSignalSeriesRef.current) { chart.removeSeries(macdSignalSeriesRef.current); macdSignalSeriesRef.current = null; }
    }
    redrawOverlay();
  }, [candles, indicatorData, indEMA, indRSI, indMACD, redrawOverlay]);

  /* ── Tab Fetches ── */
  useEffect(() => {
    if (activeTab === "overview" || activeTab === "positions" || activeTab === "journal") return;
    if (activeTab === "about" && !about && !loadingAbout) {
      (async () => {
        try {
          setLoadingAbout(true);
          // FIX: Use api axios instance
          const res  = await api.get(`/stocks/about`, { params: { symbol } });
          const data = res.data;
          setAbout(normalizeAbout(data));
        } catch { setAbout(null); } finally { setLoadingAbout(false); }
      })();
    }
    if (activeTab === "fundamentals" && fundamentals.length === 0 && !loadingFundamentals) {
      (async () => {
        try {
          setLoadingFundamentals(true);
          // FIX: Use api axios instance
          const res  = await api.get(`/stocks/fundamentals`, { params: { symbol } });
          const data = res.data;
          setFundamentals(normalizeFundamentals(data));
        } catch { setFundamentals([]); } finally { setLoadingFundamentals(false); }
      })();
    }
    if (activeTab === "news" && news.length === 0 && !loadingNews) {
      (async () => {
        try {
          setLoadingNews(true);
          // FIX: Use api axios instance
          const res  = await api.get(`/stocks/news`, { params: { symbol } });
          const data = res.data;
          setNews(normalizeNews(data));
        } catch { setNews([]); } finally { setLoadingNews(false); }
      })();
    }
  }, [activeTab, symbol, about, fundamentals.length, news.length, loadingAbout, loadingFundamentals, loadingNews]);

  useEffect(() => { setActiveTab("overview"); setAbout(null); setFundamentals([]); setNews([]); setJournals([]); }, [symbol]);
  useEffect(() => { requestAnimationFrame(() => { if (chartAliveRef.current) redrawOverlay(); }); }, [selectedShapeId, shapesVersion, redrawOverlay]);
  useEffect(() => { setOverlayInteractive(tool !== "cursor" || !!selectedShapeId || !!dragRef.current); }, [tool, selectedShapeId]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedShapeId) {
        setShapes((prev) => prev.filter((s) => s.id !== selectedShapeId)); setSelectedShapeId(null);
      }
      if (e.key === "Escape") { drawingRef.current = null; dragRef.current = null; setSelectedShapeId(null); redrawOverlay(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveLayout(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedShapeId, redrawOverlay, saveLayout]);

  /* ── Order actions ── */
  const openOrder = (side) => {
    setOrderSide(side);
    setPrice(Number(livePrice ?? overview?.quote?.price ?? 0));
    setOrderType("MARKET");
    setOrderMode("INTRADAY");
    setQuantity(1); setOrderError(""); setOrderSuccess("");
    setOrderJournal({
      strategy: "",
      setupType: "",
      confidence: "",
      reasonForEntry: "",
      emotionBefore: "",
      tags: "",
    });
    setShowEntryJournalModal(false);
    setShowModal(true);
  };

  const continueToEntryJournal = () => {
    const executedPrice = orderType === "MARKET" ? Number(livePrice ?? overview?.quote?.price ?? price ?? 0) : Number(price);
    if (!symbol || !Number(quantity) || Number(quantity) <= 0 || !Number(executedPrice) || Number(executedPrice) <= 0) {
      setOrderError("Invalid order details.");
      return;
    }
    setOrderError("");
    setOrderSuccess("");
    setShowModal(false);
    setShowEntryJournalModal(true);
  };

  const backToOrderModal = () => {
    if (placingOrder) return;
    setShowEntryJournalModal(false);
    setShowModal(true);
  };

  const placeOrder = async () => {
    try {
      setOrderError(""); setOrderSuccess("");
      const userId = getLoggedInUserId();
      if (!userId) { setOrderError("User not found. Please login again."); return; }
      const executedPrice = orderType === "MARKET" ? Number(livePrice ?? overview?.quote?.price ?? price ?? 0) : Number(price);
      if (!symbol || !Number(quantity) || Number(quantity) <= 0 || !Number(executedPrice) || Number(executedPrice) <= 0) {
        setOrderError("Invalid order details."); return;
      }
      const payload = {
        userId, symbol: String(symbol).toUpperCase().trim(), type: orderSide,
        quantity: Number(quantity), price: Number(executedPrice), mode: orderMode,
        currentPrice: Number(executedPrice), sector: about?.sector || "Others",
      };
      setPlacingOrder(true);
      const res = await api.post("/orders/place", payload);
      if (!res?.data?.success) throw new Error(res?.data?.message || "Failed to place order");
      const placedOrder = res?.data?.order || res?.data?.data || res?.data;
      const orderId = placedOrder?._id || placedOrder?.id || null;

      await api.post("/trade-journal/create", {
        userId,
        symbol: String(symbol).toUpperCase().trim(),
        assetType: "STOCK",
        mode: orderMode,
        side: orderSide,
        orderId,
        entryOrderId: orderId,
        quantity: Number(quantity),
        entryPrice: Number(executedPrice),
        strategy: orderJournal.strategy || "",
        setupType: orderJournal.setupType || "",
        confidence: orderJournal.confidence ? Number(orderJournal.confidence) : null,
        reasonForEntry: orderJournal.reasonForEntry || "",
        emotionBefore: orderJournal.emotionBefore || "",
        tags: splitJournalTags(orderJournal.tags),
      });

      setOrderSuccess(res.data.message || `${orderSide} order placed successfully`);
      await fetchOrders();
      await fetchJournals();
      window.dispatchEvent(new Event("orders-updated"));
      window.dispatchEvent(new Event("holding-updated"));
      window.dispatchEvent(new Event("portfolio-updated"));
      setTimeout(() => { setShowModal(false); setShowEntryJournalModal(false); setActiveTab("positions"); setOrderSuccess(""); }, 700);
    } catch (error) {
      setOrderError(error?.response?.data?.message || error?.message || "Failed to place order");
    } finally { setPlacingOrder(false); }
  };

  const openExit = (order) => {
    setExitOrder(order); setExitQty(Number(order.remainingQty || order.quantity));
    setExitJournal({
      reasonForExit: "",
      emotionAfter: "",
      mistakes: "",
      lessonsLearned: "",
      rating: "",
    });
    setExitError(""); setExitSuccess(""); setShowExitModal(true);
  };

  const placeExit = async () => {
    try {
      setExitError(""); setExitSuccess("");
      const userId = getLoggedInUserId();
      if (!userId || !exitOrder) { setExitError("User not found."); return; }
      if (!exitQty || Number(exitQty) <= 0) { setExitError("Quantity must be > 0."); return; }
      if (Number(exitQty) > Number(exitOrder.quantity)) { setExitError(`Max exit qty is ${exitOrder.quantity}.`); return; }
      const exitSide  = exitOrder.side === "BUY" ? "SELL" : "BUY";
      const exitPrice = Number(livePrice ?? overview?.quote?.price ?? exitOrder.executedPrice ?? 0);
      if (!exitPrice || exitPrice <= 0) { setExitError("Live price not available."); return; }
      const payload = {
        userId, symbol: String(symbol).toUpperCase().trim(), type: exitSide,
        quantity: Number(exitQty), price: exitPrice, mode: exitOrder.mode || "DELIVERY",
        currentPrice: exitPrice, sector: about?.sector || "Others",
      };
      setExitLoading(true);
      const res = await api.post("/orders/place", payload);
      if (!res?.data?.success) throw new Error(res?.data?.message || "Exit failed");
      const exitPlaced = res?.data?.order || res?.data?.data || res?.data;
      const exitOrderId = exitPlaced?._id || exitPlaced?.id || null;

      const currentJournals = Array.isArray(journals) ? journals : [];
      const targetJournal = currentJournals.find((j) =>
        (exitOrder.journalId && String(j._id) === String(exitOrder.journalId)) || (
          String(j.symbol).toUpperCase() === String(symbol).toUpperCase() &&
          String(j.side) === String(exitOrder.side) &&
          String(j.mode) === String(exitOrder.mode || "DELIVERY") &&
          Number(j.remainingQty || 0) > 0
        )
      );

      if (targetJournal?._id) {
        await api.post("/trade-journal/close", {
          journalId: targetJournal._id,
          exitOrderId,
          exitQty: Number(exitQty),
          exitPrice: Number(exitPrice),
          reasonForExit: exitJournal.reasonForExit || "",
          emotionAfter: exitJournal.emotionAfter || "",
          mistakes: exitJournal.mistakes || "",
          lessonsLearned: exitJournal.lessonsLearned || "",
          rating: exitJournal.rating ? Number(exitJournal.rating) : null,
        });
      }

      setExitSuccess(`Exit order placed — ${exitSide} ${exitQty} @ ${formatCurrency(exitPrice, displayCurrency)}`);
      await fetchOrders();
      await fetchJournals();
      window.dispatchEvent(new Event("orders-updated"));
      window.dispatchEvent(new Event("holding-updated"));
      window.dispatchEvent(new Event("portfolio-updated"));
      setTimeout(() => { setShowExitModal(false); setExitOrder(null); setExitSuccess(""); }, 800);
    } catch (err) {
      setExitError(err?.response?.data?.message || err?.message || "Exit failed");
    } finally { setExitLoading(false); }
  };

  const deleteSelected = () => {
    if (!selectedShapeId) return;
    setShapes((prev) => prev.filter((s) => s.id !== selectedShapeId));
    setSelectedShapeId(null);
  };

  const clearAll = () => {
    setShapes([]); drawingRef.current = null; dragRef.current = null; setSelectedShapeId(null); redrawOverlay();
  };

  const resetLayout = () => {
    localStorage.removeItem(layoutKey(symbol));
    shapesRef.current = []; setShapesVersion((v) => v + 1);
    setTimeframeKey("5m"); setIndicatorsOpen(true); setIndEMA(true); setIndRSI(false); setIndMACD(false);
    setDisplayCurrency("INR"); setSelectedShapeId(null);
  };

  return (
    <div className="flex h-[88vh] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      {/* ── Left: Chart ── */}
      <div className="flex flex-1 flex-col border-r border-gray-200 p-6">
        <div className="mb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{symbol} <span className="text-base font-normal text-gray-400">(NSE/BSE · IST)</span></h1>
              <p className="mt-1 text-sm text-gray-500">Live chart · IST-aligned candles · WebSocket feed</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="text-[11px] text-gray-500">Converter</div>
                <div className="mt-2 flex items-center gap-2">
                  <Chip active={displayCurrency === "INR"} onClick={() => setDisplayCurrency("INR")}>INR</Chip>
                  <Chip active={displayCurrency === "USD"} onClick={() => setDisplayCurrency("USD")}>USD</Chip>
                </div>
                <div className="mt-2 text-[11px] text-gray-500">1 USD = ₹{formatNum(LIVE_INR_PER_USD)}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-[11px] font-medium text-gray-500">{overview?.name || symbol}</div>
                <div className="text-xl font-bold text-gray-900">{formatCurrency(livePrice ?? overview?.quote?.price, displayCurrency)}</div>
                <div className={`text-xs font-semibold ${Number(overview?.quote?.change ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(overview?.quote?.change, displayCurrency)} ({formatNum(overview?.quote?.changePercent)}%)
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="text-[11px] text-gray-500">Feed</div>
                <div className={`text-sm font-semibold ${marketLive ? "text-green-600" : "text-gray-500"}`}>{marketLive ? "Live" : "Disconnected"}</div>
                <div className="text-[11px] text-gray-500">{lastTickTime ? new Date(lastTickTime * 1000).toLocaleTimeString("en-IN") : "--"}</div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Timeframe:</span>
            {TF_OPTIONS.map((t) => (
              <Chip key={t.key} active={timeframeKey === t.key} onClick={() => setTimeframeKey(t.key)}>{t.label}</Chip>
            ))}
            <div className="mx-1 h-4 w-px bg-gray-200" />
            <button type="button" onClick={() => setIndicatorsOpen((v) => !v)} className="text-xs font-semibold text-gray-700 hover:text-gray-900">
              Indicators {indicatorsOpen ? "▾" : "▸"}
            </button>
            {indicatorsOpen && (
              <>
                <Chip active={indEMA}  onClick={() => setIndEMA((v) => !v)}>EMA</Chip>
                <Chip active={indRSI}  onClick={() => setIndRSI((v) => !v)}>RSI</Chip>
                <Chip active={indMACD} onClick={() => setIndMACD((v) => !v)}>MACD</Chip>
                <div className="flex flex-wrap items-center gap-3 pl-2">
                  {indEMA && (<><span className="text-xs text-gray-600">EMA20: <span className="font-semibold text-gray-900">{formatNum(lastEMA20)}</span></span><span className="text-xs text-gray-600">EMA50: <span className="font-semibold text-gray-900">{formatNum(lastEMA50)}</span></span></>)}
                  {indRSI  && <span className="text-xs text-gray-600">RSI14: <span className="font-semibold text-gray-900">{formatNum(lastRSI)}</span></span>}
                  {indMACD && (<><span className="text-xs text-gray-600">MACD: <span className="font-semibold text-gray-900">{formatNum(lastMACD)}</span></span><span className="text-xs text-gray-600">Signal: <span className="font-semibold text-gray-900">{formatNum(lastMACDSignal)}</span></span></>)}
                  <span className={`text-xs font-semibold ${trendLabel === "Bullish" ? "text-green-600" : trendLabel === "Bearish" ? "text-red-600" : "text-gray-500"}`}>{trendLabel}</span>
                </div>
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={saveLayout} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Save Layout</button>
              <button type="button" onClick={resetLayout} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Reset Layout</button>
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div ref={containerRef} className="h-full w-full" />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 z-20"
            style={{
              pointerEvents: overlayInteractive ? "auto" : "none",
              cursor: tool === "cursor" ? (dragRef.current ? "grabbing" : selectedShapeId ? "pointer" : "default") : "crosshair",
            }}
            onMouseDown={onOverlayDown}
            onMouseMove={onOverlayMove}
            onMouseUp={onOverlayUp}
            onMouseLeave={onOverlayUp}
          />
          <DrawingToolbar tool={tool} setTool={setTool} drawingRef={drawingRef} selectedShapeId={selectedShapeId} deleteSelected={deleteSelected} clearAll={clearAll} />
          {tool === "cursor" && selectedShape && (
            <ShapeEditor
              selectedShape={selectedShape}
              setShapes={setShapes}
              updateShape={updateShape}
              setSelectedShapeId={setSelectedShapeId}
              displayCurrency={displayCurrency}
            />
          )}
        </div>
      </div>

      {/* ── Right: Trading Panel ── */}
      <TradingPanel
        symbol={symbol} isCrypto={false}
        displayCurrency={displayCurrency} livePrice={livePrice} overview={overview}
        activeTab={activeTab} setActiveTab={setActiveTab}
        loadingOverview={loadingOverview} about={about} loadingAbout={loadingAbout}
        fundamentals={fundamentals} loadingFundamentals={loadingFundamentals}
        news={news} loadingNews={loadingNews}
        orders={orders} ordersLoading={ordersLoading}
        journals={journals} journalsLoading={journalsLoading}
        onOpenOrder={openOrder} onOpenExit={openExit}
        lastTickTime={lastTickTime}
      />

      <OrderModal
        show={showModal} onClose={() => { if (!placingOrder) { setShowModal(false); setOrderError(""); setOrderSuccess(""); } }}
        symbol={symbol} isCrypto={false}
        orderSide={orderSide} orderType={orderType} setOrderType={setOrderType}
        orderMode={orderMode} setOrderMode={setOrderMode}
        quantity={quantity} setQuantity={setQuantity}
        price={price} setPrice={setPrice}
        orderJournal={orderJournal} setOrderJournal={setOrderJournal}
        placingOrder={placingOrder} orderError={orderError} orderSuccess={orderSuccess}
        onConfirm={continueToEntryJournal} livePrice={livePrice} overview={overview} displayCurrency={displayCurrency} about={about}
      />
      <EntryJournalModal
        show={showEntryJournalModal}
        onClose={() => { if (!placingOrder) { setShowEntryJournalModal(false); setOrderError(""); setOrderSuccess(""); } }}
        onBack={backToOrderModal}
        orderJournal={orderJournal}
        setOrderJournal={setOrderJournal}
        placingOrder={placingOrder}
        orderError={orderError}
        orderSuccess={orderSuccess}
        onConfirm={placeOrder}
        orderSide={orderSide}
      />
      <ExitModal
        show={showExitModal} exitOrder={exitOrder} onClose={() => { setShowExitModal(false); setExitOrder(null); }}
        exitQty={exitQty} setExitQty={setExitQty}
        exitJournal={exitJournal} setExitJournal={setExitJournal}
        exitLoading={exitLoading} exitError={exitError} exitSuccess={exitSuccess}
        onConfirm={placeExit} livePrice={livePrice} overview={overview} displayCurrency={displayCurrency}
      />
    </div>
  );
}

/* ===================== CRYPTO CHART ===================== */
// Crypto-specific: UTC bucket alignment, 24/7 trading, REST polling (no WS), CoinGecko data
function CryptoChart({ symbol, coinId }) {
  const containerRef      = useRef(null);
  const cryptoPollRef     = useRef(null);
  const resizeObserverRef = useRef(null);
  const currentCandleRef  = useRef(null);
  const lastCandleTimeSec = useRef(0);
  const ema20SeriesRef    = useRef(null);
  const ema50SeriesRef    = useRef(null);
  const rsiSeriesRef      = useRef(null);
  const macdSeriesRef     = useRef(null);
  const macdSignalSeriesRef = useRef(null);

  const [displayCurrency, setDisplayCurrency] = useState("INR");

  const drawing = useChartDrawing({ displayCurrency });
  const {
    overlayRef, chartRef, candleSeriesRef, shapesRef, drawingRef, dragRef, chartAliveRef,
    selectedShapeId, setSelectedShapeId, shapesVersion, setShapesVersion,
    tool, setTool, overlayInteractive, setOverlayInteractive,
    redrawOverlay, setShapes, updateShape, selectedShape,
    onOverlayDown, onOverlayMove, onOverlayUp,
  } = drawing;

  const [candles, setCandles]         = useState([]);
  const [overview, setOverview]       = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [about, setAbout]             = useState(null);
  const [loadingAbout, setLoadingAbout] = useState(false);
  const [fundamentals, setFundamentals] = useState([]);
  const [loadingFundamentals, setLoadingFundamentals] = useState(false);
  const [news, setNews]               = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [orders, setOrders]           = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [livePrice, setLivePrice]     = useState(null);
  const [lastTickTime, setLastTickTime] = useState(null);
  const [marketLive, setMarketLive]   = useState(false);
  const [activeTab, setActiveTab]     = useState("overview");
  const [timeframeKey, setTimeframeKey] = useState("5m");
  const [indicatorsOpen, setIndicatorsOpen] = useState(true);
  const [indEMA, setIndEMA]           = useState(true);
  const [indRSI, setIndRSI]           = useState(false);
  const [indMACD, setIndMACD]         = useState(false);

  const [showModal, setShowModal]     = useState(false);
  const [orderSide, setOrderSide]     = useState("BUY");
  const [orderType, setOrderType]     = useState("LIMIT");
  const [orderMode, setOrderMode]     = useState("DELIVERY");
  const [quantity, setQuantity]       = useState(1);
  const [price, setPrice]             = useState(0);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError]   = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");

  const [showExitModal, setShowExitModal] = useState(false);
  const [exitOrder, setExitOrder]     = useState(null);
  const [exitQty, setExitQty]         = useState(1);
  const [exitLoading, setExitLoading] = useState(false);
  const [exitError, setExitError]     = useState("");
  const [exitSuccess, setExitSuccess] = useState("");
  const [exitJournal, setExitJournal] = useState({
    reasonForExit: "",
    emotionAfter: "",
    mistakes: "",
    lessonsLearned: "",
    rating: "",
  });
  const [journals, setJournals] = useState([]);
  const [journalsLoading, setJournalsLoading] = useState(false);

  // FIX: Corrected crypto timeframes with proper CoinGecko day/interval/bucket combos.
  // CoinGecko auto-granularity:
  //   days=1  → ~5-minute data points
  //   days=7  → ~hourly data points (use interval=hourly to force)
  //   days=14 → hourly with interval=hourly
  //   days=90 → daily with interval=daily
  //   days=365 → daily with interval=daily
  // Bucket must match the actual granularity returned by CoinGecko.
  const TF_OPTIONS = useMemo(() => [
    { key: "5m",  label: "5m",  cryptoDays: "1",   cryptoInterval: "",       cryptoBucket: 300   }, // CoinGecko returns ~5min for days=1
    { key: "15m", label: "15m", cryptoDays: "1",   cryptoInterval: "",       cryptoBucket: 900   }, // Same source, re-bucket to 15min
    { key: "1h",  label: "1H",  cryptoDays: "14",  cryptoInterval: "hourly", cryptoBucket: 3600  }, // Force hourly, 14 days
    { key: "1d",  label: "1D",  cryptoDays: "365", cryptoInterval: "daily",  cryptoBucket: 86400 }, // Force daily, 1 year
  ], []);

  const tf = useMemo(() => TF_OPTIONS.find((x) => x.key === timeframeKey) || TF_OPTIONS[0], [TF_OPTIONS, timeframeKey]);

  const safeJson = async (res) => {
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
    try { return JSON.parse(text); }
    catch { throw new Error("Invalid JSON response"); }
  };

  const saveLayout = useCallback(() => {
    try {
      localStorage.setItem(layoutKey(`crypto_${coinId || symbol}`), JSON.stringify({
        timeframeKey, indicatorsOpen, indEMA, indRSI, indMACD,
        shapes: shapesRef.current || [], displayCurrency,
      }));
    } catch (e) { console.error("Save layout error", e); }
  }, [symbol, coinId, timeframeKey, indicatorsOpen, indEMA, indRSI, indMACD, displayCurrency]);

  const loadLayout = useCallback(() => {
    try {
      const raw = localStorage.getItem(layoutKey(`crypto_${coinId || symbol}`));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [symbol, coinId]);

  useEffect(() => {
    const saved = loadLayout();
    if (!saved) { shapesRef.current = []; setShapesVersion((v) => v + 1); return; }
    if (saved.timeframeKey)    setTimeframeKey(saved.timeframeKey);
    if (saved.displayCurrency) setDisplayCurrency(saved.displayCurrency);
    setIndicatorsOpen(saved.indicatorsOpen !== false);
    setIndEMA(saved.indEMA !== false);
    setIndRSI(!!saved.indRSI);
    setIndMACD(!!saved.indMACD);
    shapesRef.current = Array.isArray(saved.shapes) ? saved.shapes : [];
    setShapesVersion((v) => v + 1);
  }, [symbol, coinId, loadLayout]);

  useEffect(() => { saveLayout(); }, [saveLayout, shapesVersion, displayCurrency]);

  const fetchOrders = useCallback(async () => {
    try {
      const userId = getLoggedInUserId();
      if (!userId) { setOrders([]); return; }
      setOrdersLoading(true);
      const res = await api.get(`/orders/user/${userId}`);
      const apiOrders = Array.isArray(res?.data?.orders) ? res.data.orders : [];
      const currentSymbol = String(symbol).toUpperCase().trim();
      const mapped = apiOrders
        .filter((order) => String(order.symbol || "").toUpperCase().trim() === currentSymbol)
        .map((order) => ({
          id:            order._id,
          symbol:        order.symbol,
          side:          order.type,
          mode:          order.mode || "DELIVERY",
          orderType:     order.orderType || (order.price ? "LIMIT" : "MARKET"),
          quantity:      Number(order.quantity),
          limitPrice:    Number(order.price),
          executedPrice: Number(order.price),
          totalValue:    Number(order.quantity) * Number(order.price),
          status:        order.status || "FILLED",
          createdAt:     order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "--",
        }));
      setOrders(mapped);
    } catch (error) {
      console.error("fetchOrders error:", error);
      setOrders([]);
    } finally { setOrdersLoading(false); }
  }, [symbol]);

  const fetchJournals = useCallback(async () => {
    try {
      const userId = getLoggedInUserId();
      if (!userId) { setJournals([]); return; }
      setJournalsLoading(true);
      const rows = await requestTradeJournals(api, userId);
      setJournals((Array.isArray(rows) ? rows : []).map(normalizeJournal));
    } catch (error) {
      console.error("fetchJournals error:", error);
      setJournals([]);
    } finally {
      setJournalsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchOrders();
    fetchJournals();
    const refresh = () => { fetchOrders(); fetchJournals(); };
    window.addEventListener("orders-updated",    refresh);
    window.addEventListener("holding-updated",   refresh);
    window.addEventListener("portfolio-updated", refresh);
    return () => {
      window.removeEventListener("orders-updated",    refresh);
      window.removeEventListener("holding-updated",   refresh);
      window.removeEventListener("portfolio-updated", refresh);
    };
  }, [fetchOrders, fetchJournals]);

  const indicatorData = useMemo(() => {
    if (!candles.length) return { ema20: [], ema50: [], rsi14: [], macd: [], macdSignal: [] };
    const closes = candles.map((c) => Number(c.close));
    const e20 = ema(closes, 20);
    const e50 = ema(closes, 50);
    const r   = rsi(closes, 14);
    const m   = macd(closes, 12, 26, 9);
    return { ema20: e20, ema50: e50, rsi14: r, macd: m.macd, macdSignal: m.signal };
  }, [candles]);

  const lastIdx        = candles.length - 1;
  const lastEMA20      = lastIdx >= 0 ? indicatorData.ema20[lastIdx] : null;
  const lastEMA50      = lastIdx >= 0 ? indicatorData.ema50[lastIdx] : null;
  const lastRSI        = lastIdx >= 0 ? indicatorData.rsi14[lastIdx] : null;
  const lastMACD       = lastIdx >= 0 ? indicatorData.macd[lastIdx] : null;
  const lastMACDSignal = lastIdx >= 0 ? indicatorData.macdSignal[lastIdx] : null;
  const trendLabel     = lastEMA20 && lastEMA50 ? (lastEMA20 > lastEMA50 ? "Bullish" : "Bearish") : "--";

  useEffect(() => {
    if (!containerRef.current) return;

    setCandles([]);
    currentCandleRef.current  = null;
    lastCandleTimeSec.current = 0;
    setLivePrice(null);
    setLastTickTime(null);
    setMarketLive(false);
    drawingRef.current = null;
    dragRef.current    = null;
    setSelectedShapeId(null);

    if (cryptoPollRef.current) { clearInterval(cryptoPollRef.current); cryptoPollRef.current = null; }

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: "#ffffff" }, textColor: "#111827" },
      grid: { vertLines: { color: "#eef2f7" }, horzLines: { color: "#eef2f7" } },
      crosshair: { mode: 0 },
      rightPriceScale: { visible: false },
      leftPriceScale:  { visible: true, borderVisible: false },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
        rightOffset: 8,
        // Crypto times displayed in UTC — 24/7 global market, no timezone offset
        tickMarkFormatter: (time) => {
          const d = new Date(time * 1000);
          return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
        },
      },
      localization: { locale: "en-IN", dateFormat: "dd/MM/yyyy" },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      priceScaleId: "left",
      upColor: "#16a34a", downColor: "#dc2626",
      wickUpColor: "#16a34a", wickDownColor: "#dc2626",
      borderUpColor: "#16a34a", borderDownColor: "#dc2626",
      lastValueVisible: true, priceLineVisible: true,
    });

    chartRef.current        = chart;
    candleSeriesRef.current = candleSeries;
    ema20SeriesRef.current = ema50SeriesRef.current = rsiSeriesRef.current = macdSeriesRef.current = macdSignalSeriesRef.current = null;

    const resizeCanvas = () => {
      const canvas = overlayRef.current, box = containerRef.current;
      if (!canvas || !box) return;
      canvas.width  = Math.floor(box.clientWidth);
      canvas.height = Math.floor(box.clientHeight);
      redrawOverlay();
    };

    // FIX: Use api axios instance for crypto chart fetch too
    const fetchHistorical = async () => {
      try {
        const params = { days: tf.cryptoDays || "1", vs_currency: "inr" };
        if (tf.cryptoInterval) params.interval = tf.cryptoInterval;
        const res  = await api.get(`/crypto/chart/${encodeURIComponent(coinId)}`, { params });
        const data = res.data;
        // UTC bucket — no IST for crypto; use the tf's cryptoBucket for correct rebucketing
        const normalized = normalizeCryptoHistory(data, tf.cryptoBucket || 300);
        if (!normalized.length) { console.warn("[CryptoChart] 0 candles after normalize"); setCandles([]); return; }
        candleSeries.setData(normalized);
        setCandles(normalized);
        const last = normalized[normalized.length - 1] || null;
        currentCandleRef.current  = last;
        lastCandleTimeSec.current = last ? Math.floor(Number(last.time)) : 0;
        if (last?.close != null) setLivePrice(last.close);
        chart.timeScale().fitContent();
        requestAnimationFrame(() => { if (chartAliveRef.current) redrawOverlay(); });
      } catch (err) { console.error("[CryptoChart] fetchHistorical error:", err); setCandles([]); }
    };

    const fetchOverview = async () => {
      try {
        setLoadingOverview(true);
        const res  = await api.get(`/crypto/list`, { params: { ids: coinId, vs_currency: "inr" } });
        const data = res.data;
        const normalized = normalizeCryptoOverview(data, symbol);
        setOverview(normalized);
        if (normalized?.quote?.price != null) setLivePrice(normalized.quote.price);
      } catch (err) { console.error("[CryptoChart] Overview error:", err); setOverview(null); }
      finally { setLoadingOverview(false); }
    };

    fetchHistorical();
    fetchOverview();

    // Crypto polling: UTC bucket — no IST offset, pure UTC timestamps
    const bucketSec = tf.cryptoBucket || 300;
    const pollCrypto = async () => {
      try {
        const res  = await api.get(`/crypto/list`, { params: { ids: coinId, vs_currency: "inr" } });
        const data = res.data;
        const normalized = normalizeCryptoOverview(data, symbol);
        const tickPrice  = Number(normalized?.quote?.price);
        if (!Number.isFinite(tickPrice)) return;

        // Pure UTC bucket for crypto — no IST adjustment
        const nowSec = Math.floor(Date.now() / 1000);
        const cTime  = Math.floor(nowSec / bucketSec) * bucketSec;

        setMarketLive(true); setLastTickTime(nowSec); setLivePrice(tickPrice);
        setOverview(normalized);

        if (lastCandleTimeSec.current === 0) return;
        if (cTime < lastCandleTimeSec.current) return;

        const isNewBucket = cTime > lastCandleTimeSec.current;
        const candle = {
          time:  cTime,
          open:  isNewBucket ? tickPrice : (currentCandleRef.current?.open  ?? tickPrice),
          high:  isNewBucket ? tickPrice : Math.max(currentCandleRef.current?.high  ?? tickPrice, tickPrice),
          low:   isNewBucket ? tickPrice : Math.min(currentCandleRef.current?.low   ?? tickPrice, tickPrice),
          close: tickPrice,
        };
        currentCandleRef.current  = candle;
        lastCandleTimeSec.current = cTime;
        try { candleSeries.update(candle); } catch (e) { console.warn("candleSeries.update:", e.message); }
        setCandles((prev) => {
          const next  = [...prev];
          const lastC = next[next.length - 1];
          const lastT = lastC ? Math.floor(Number(lastC.time)) : -1;
          if (lastT === cTime)    next[next.length - 1] = candle;
          else if (cTime > lastT) next.push(candle);
          return next;
        });
        redrawOverlay();
      } catch (err) { console.error("Crypto polling error:", err); setMarketLive(false); }
    };

    pollCrypto();
    cryptoPollRef.current = setInterval(pollCrypto, 15000);

    const onVisibleRangeChange = () => redrawOverlay();
    chart.timeScale().subscribeVisibleTimeRangeChange(onVisibleRangeChange);

    resizeObserverRef.current = new ResizeObserver(() => resizeCanvas());
    resizeObserverRef.current.observe(containerRef.current);
    resizeCanvas();

    return () => {
      try { chart.timeScale().unsubscribeVisibleTimeRangeChange(onVisibleRangeChange); } catch {}
      try { resizeObserverRef.current?.disconnect(); } catch {}
      try { if (cryptoPollRef.current) { clearInterval(cryptoPollRef.current); cryptoPollRef.current = null; } } catch {}
      try { chart.remove(); } catch {}
    };
  }, [symbol, coinId, tf.cryptoDays, tf.cryptoInterval, tf.cryptoBucket, redrawOverlay]);

  /* ── Indicators ── */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const lineData = (arr) => candles.map((c, i) => {
      const v = arr?.[i];
      if (v == null || Number.isNaN(Number(v))) return null;
      return { time: c.time, value: Number(v) };
    }).filter(Boolean);

    if (indEMA) {
      if (!ema20SeriesRef.current) ema20SeriesRef.current = chart.addSeries(LineSeries, { priceScaleId: "left", lineWidth: 2, color: "#2563eb", lastValueVisible: false, priceLineVisible: false });
      if (!ema50SeriesRef.current) ema50SeriesRef.current = chart.addSeries(LineSeries, { priceScaleId: "left", lineWidth: 2, color: "#7c3aed", lastValueVisible: false, priceLineVisible: false });
      ema20SeriesRef.current.setData(lineData(indicatorData.ema20));
      ema50SeriesRef.current.setData(lineData(indicatorData.ema50));
    } else {
      if (ema20SeriesRef.current) { chart.removeSeries(ema20SeriesRef.current); ema20SeriesRef.current = null; }
      if (ema50SeriesRef.current) { chart.removeSeries(ema50SeriesRef.current); ema50SeriesRef.current = null; }
    }
    if (indRSI) {
      if (!rsiSeriesRef.current) {
        rsiSeriesRef.current = chart.addSeries(LineSeries, { priceScaleId: "rsi", lineWidth: 2, color: "#f59e0b", lastValueVisible: false, priceLineVisible: false });
        chart.priceScale("rsi").applyOptions({ visible: false, scaleMargins: { top: 0.76, bottom: 0.02 } });
      }
      rsiSeriesRef.current.setData(lineData(indicatorData.rsi14));
    } else if (rsiSeriesRef.current) { chart.removeSeries(rsiSeriesRef.current); rsiSeriesRef.current = null; }
    if (indMACD) {
      if (!macdSeriesRef.current) {
        macdSeriesRef.current = chart.addSeries(LineSeries, { priceScaleId: "macd", lineWidth: 2, color: "#10b981", lastValueVisible: false, priceLineVisible: false });
        chart.priceScale("macd").applyOptions({ visible: false, scaleMargins: { top: 0.76, bottom: 0.02 } });
      }
      if (!macdSignalSeriesRef.current) {
        macdSignalSeriesRef.current = chart.addSeries(LineSeries, { priceScaleId: "macd", lineWidth: 2, color: "#ef4444", lastValueVisible: false, priceLineVisible: false });
      }
      macdSeriesRef.current.setData(lineData(indicatorData.macd));
      macdSignalSeriesRef.current.setData(lineData(indicatorData.macdSignal));
    } else {
      if (macdSeriesRef.current)       { chart.removeSeries(macdSeriesRef.current); macdSeriesRef.current = null; }
      if (macdSignalSeriesRef.current) { chart.removeSeries(macdSignalSeriesRef.current); macdSignalSeriesRef.current = null; }
    }
    redrawOverlay();
  }, [candles, indicatorData, indEMA, indRSI, indMACD, redrawOverlay]);

  /* ── Tab Fetches ── */
  useEffect(() => {
    if (activeTab === "overview" || activeTab === "positions" || activeTab === "journal") return;
    if (activeTab === "about" && !about && !loadingAbout) {
      setLoadingAbout(true);
      setAbout({ sector: "Crypto", industry: "Digital Asset", summary: overview?.cryptoMeta?.marketCapRank != null ? `${overview?.name || symbol} is a crypto asset. Market Cap Rank #${overview.cryptoMeta.marketCapRank}.` : `${overview?.name || symbol} is a crypto asset.` });
      setLoadingAbout(false);
    }
    if (activeTab === "fundamentals" && fundamentals.length === 0 && !loadingFundamentals) {
      setLoadingFundamentals(true); setFundamentals(buildCryptoFundamentalsFromOverview(overview)); setLoadingFundamentals(false);
    }
    if (activeTab === "news" && news.length === 0 && !loadingNews) {
      setLoadingNews(true); setNews(buildCryptoNewsFromOverview(overview, symbol, displayCurrency)); setLoadingNews(false);
    }
  }, [activeTab, symbol, overview, about, fundamentals.length, news.length, loadingAbout, loadingFundamentals, loadingNews, displayCurrency]);

  useEffect(() => { setActiveTab("overview"); setAbout(null); setFundamentals([]); setNews([]); setJournals([]); }, [symbol, coinId]);
  useEffect(() => { requestAnimationFrame(() => { if (chartAliveRef.current) redrawOverlay(); }); }, [selectedShapeId, shapesVersion, redrawOverlay]);
  useEffect(() => { setOverlayInteractive(tool !== "cursor" || !!selectedShapeId || !!dragRef.current); }, [tool, selectedShapeId]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedShapeId) {
        setShapes((prev) => prev.filter((s) => s.id !== selectedShapeId)); setSelectedShapeId(null);
      }
      if (e.key === "Escape") { drawingRef.current = null; dragRef.current = null; setSelectedShapeId(null); redrawOverlay(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveLayout(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedShapeId, redrawOverlay, saveLayout]);

  const openOrder = (side) => {
    setOrderSide(side);
    setPrice(Number(livePrice ?? overview?.quote?.price ?? 0));
    setOrderType("LIMIT");
    setOrderMode("DELIVERY");
    setQuantity(1); setOrderError(""); setOrderSuccess("");
    setOrderJournal({
      strategy: "",
      setupType: "",
      confidence: "",
      reasonForEntry: "",
      emotionBefore: "",
      tags: "",
    });
    setShowEntryJournalModal(false);
    setShowModal(true);
  };

  const continueToEntryJournal = () => {
    const executedPrice = orderType === "MARKET" ? Number(livePrice ?? overview?.quote?.price ?? price ?? 0) : Number(price);
    if (!symbol || !Number(quantity) || Number(quantity) <= 0 || !Number(executedPrice) || Number(executedPrice) <= 0) {
      setOrderError("Invalid order details.");
      return;
    }
    setOrderError("");
    setOrderSuccess("");
    setShowModal(false);
    setShowEntryJournalModal(true);
  };

  const backToOrderModal = () => {
    if (placingOrder) return;
    setShowEntryJournalModal(false);
    setShowModal(true);
  };

  const placeOrder = async () => {
    try {
      setOrderError(""); setOrderSuccess("");
      const userId = getLoggedInUserId();
      if (!userId) { setOrderError("User not found. Please login again."); return; }
      const executedPrice = Number(price);
      if (!symbol || !Number(quantity) || Number(quantity) <= 0 || !Number(executedPrice) || Number(executedPrice) <= 0) {
        setOrderError("Invalid order details."); return;
      }
      const payload = {
        userId, symbol: String(symbol).toUpperCase().trim(), type: orderSide,
        quantity: Number(quantity), price: Number(executedPrice), mode: orderMode,
        currentPrice: Number(executedPrice), sector: "Crypto",
      };
      setPlacingOrder(true);
      const res = await api.post("/orders/place", payload);
      if (!res?.data?.success) throw new Error(res?.data?.message || "Failed to place order");
      const placedOrder = res?.data?.order || res?.data?.data || res?.data;
      const orderId = placedOrder?._id || placedOrder?.id || null;

      await api.post("/trade-journal/create", {
        userId,
        symbol: String(symbol).toUpperCase().trim(),
        assetType: "CRYPTO",
        mode: orderMode,
        side: orderSide,
        orderId,
        entryOrderId: orderId,
        quantity: Number(quantity),
        entryPrice: Number(executedPrice),
        strategy: orderJournal.strategy || "",
        setupType: orderJournal.setupType || "",
        confidence: orderJournal.confidence ? Number(orderJournal.confidence) : null,
        reasonForEntry: orderJournal.reasonForEntry || "",
        emotionBefore: orderJournal.emotionBefore || "",
        tags: splitJournalTags(orderJournal.tags),
      });

      setOrderSuccess(res.data.message || `${orderSide} order placed successfully`);
      await fetchOrders();
      await fetchJournals();
      window.dispatchEvent(new Event("orders-updated"));
      window.dispatchEvent(new Event("holding-updated"));
      window.dispatchEvent(new Event("portfolio-updated"));
      setTimeout(() => { setShowModal(false); setShowEntryJournalModal(false); setActiveTab("positions"); setOrderSuccess(""); }, 700);
    } catch (error) {
      setOrderError(error?.response?.data?.message || error?.message || "Failed to place order");
    } finally { setPlacingOrder(false); }
  };

  const openExit = (order) => {
    setExitOrder(order); setExitQty(Number(order.remainingQty || order.quantity));
    setExitJournal({
      reasonForExit: "",
      emotionAfter: "",
      mistakes: "",
      lessonsLearned: "",
      rating: "",
    });
    setExitError(""); setExitSuccess(""); setShowExitModal(true);
  };

  const placeExit = async () => {
    try {
      setExitError(""); setExitSuccess("");
      const userId = getLoggedInUserId();
      if (!userId || !exitOrder) { setExitError("User not found."); return; }
      if (!exitQty || Number(exitQty) <= 0) { setExitError("Quantity must be > 0."); return; }
      if (Number(exitQty) > Number(exitOrder.quantity)) { setExitError(`Max exit qty is ${exitOrder.quantity}.`); return; }
      const exitSide  = exitOrder.side === "BUY" ? "SELL" : "BUY";
      const exitPrice = Number(livePrice ?? overview?.quote?.price ?? exitOrder.executedPrice ?? 0);
      if (!exitPrice || exitPrice <= 0) { setExitError("Live price not available."); return; }
      const payload = {
        userId, symbol: String(symbol).toUpperCase().trim(), type: exitSide,
        quantity: Number(exitQty), price: exitPrice, mode: exitOrder.mode || "DELIVERY",
        currentPrice: exitPrice, sector: "Crypto",
      };
      setExitLoading(true);
      const res = await api.post("/orders/place", payload);
      if (!res?.data?.success) throw new Error(res?.data?.message || "Exit failed");
      const exitPlaced = res?.data?.order || res?.data?.data || res?.data;
      const exitOrderId = exitPlaced?._id || exitPlaced?.id || null;

      const currentJournals = Array.isArray(journals) ? journals : [];
      const targetJournal = currentJournals.find((j) =>
        (exitOrder.journalId && String(j._id) === String(exitOrder.journalId)) || (
          String(j.symbol).toUpperCase() === String(symbol).toUpperCase() &&
          String(j.side) === String(exitOrder.side) &&
          String(j.mode) === String(exitOrder.mode || "DELIVERY") &&
          Number(j.remainingQty || 0) > 0
        )
      );

      if (targetJournal?._id) {
        await api.post("/trade-journal/close", {
          journalId: targetJournal._id,
          exitOrderId,
          exitQty: Number(exitQty),
          exitPrice: Number(exitPrice),
          reasonForExit: exitJournal.reasonForExit || "",
          emotionAfter: exitJournal.emotionAfter || "",
          mistakes: exitJournal.mistakes || "",
          lessonsLearned: exitJournal.lessonsLearned || "",
          rating: exitJournal.rating ? Number(exitJournal.rating) : null,
        });
      }

      setExitSuccess(`Exit order placed — ${exitSide} ${exitQty} @ ${formatCurrency(exitPrice, displayCurrency)}`);
      await fetchOrders();
      await fetchJournals();
      window.dispatchEvent(new Event("orders-updated"));
      window.dispatchEvent(new Event("holding-updated"));
      window.dispatchEvent(new Event("portfolio-updated"));
      setTimeout(() => { setShowExitModal(false); setExitOrder(null); setExitSuccess(""); }, 800);
    } catch (err) {
      setExitError(err?.response?.data?.message || err?.message || "Exit failed");
    } finally { setExitLoading(false); }
  };

  const deleteSelected = () => {
    if (!selectedShapeId) return;
    setShapes((prev) => prev.filter((s) => s.id !== selectedShapeId));
    setSelectedShapeId(null);
  };

  const clearAll = () => {
    setShapes([]); drawingRef.current = null; dragRef.current = null; setSelectedShapeId(null); redrawOverlay();
  };

  const resetLayout = () => {
    localStorage.removeItem(layoutKey(`crypto_${coinId || symbol}`));
    shapesRef.current = []; setShapesVersion((v) => v + 1);
    setTimeframeKey("5m"); setIndicatorsOpen(true); setIndEMA(true); setIndRSI(false); setIndMACD(false);
    setDisplayCurrency("INR"); setSelectedShapeId(null);
  };

  return (
    <div className="flex h-[88vh] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      {/* ── Left: Chart ── */}
      <div className="flex flex-1 flex-col border-r border-gray-200 p-6">
        <div className="mb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{symbol} <span className="text-base font-normal text-gray-400">(Crypto · UTC)</span></h1>
              <p className="mt-1 text-sm text-gray-500">24/7 global market · UTC-aligned candles · REST polling</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="text-[11px] text-gray-500">Converter</div>
                <div className="mt-2 flex items-center gap-2">
                  <Chip active={displayCurrency === "INR"} onClick={() => setDisplayCurrency("INR")}>INR</Chip>
                  <Chip active={displayCurrency === "USD"} onClick={() => setDisplayCurrency("USD")}>USD</Chip>
                </div>
                <div className="mt-2 text-[11px] text-gray-500">1 USD = ₹{formatNum(LIVE_INR_PER_USD)}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-[11px] font-medium text-gray-500">{overview?.name || symbol}</div>
                <div className="text-xl font-bold text-gray-900">{formatCurrency(livePrice ?? overview?.quote?.price, displayCurrency)}</div>
                <div className={`text-xs font-semibold ${Number(overview?.quote?.change ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(overview?.quote?.change, displayCurrency)} ({formatNum(overview?.quote?.changePercent)}%)
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="text-[11px] text-gray-500">Feed</div>
                <div className={`text-sm font-semibold ${marketLive ? "text-green-600" : "text-gray-500"}`}>{marketLive ? "Live" : "Polling..."}</div>
                <div className="text-[11px] text-gray-500">{lastTickTime ? new Date(lastTickTime * 1000).toLocaleTimeString("en-IN") : "--"}</div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Timeframe:</span>
            {TF_OPTIONS.map((t) => (
              <Chip key={t.key} active={timeframeKey === t.key} onClick={() => setTimeframeKey(t.key)}>{t.label}</Chip>
            ))}
            <div className="mx-1 h-4 w-px bg-gray-200" />
            <button type="button" onClick={() => setIndicatorsOpen((v) => !v)} className="text-xs font-semibold text-gray-700 hover:text-gray-900">
              Indicators {indicatorsOpen ? "▾" : "▸"}
            </button>
            {indicatorsOpen && (
              <>
                <Chip active={indEMA}  onClick={() => setIndEMA((v) => !v)}>EMA</Chip>
                <Chip active={indRSI}  onClick={() => setIndRSI((v) => !v)}>RSI</Chip>
                <Chip active={indMACD} onClick={() => setIndMACD((v) => !v)}>MACD</Chip>
                <div className="flex flex-wrap items-center gap-3 pl-2">
                  {indEMA && (<><span className="text-xs text-gray-600">EMA20: <span className="font-semibold text-gray-900">{formatNum(lastEMA20)}</span></span><span className="text-xs text-gray-600">EMA50: <span className="font-semibold text-gray-900">{formatNum(lastEMA50)}</span></span></>)}
                  {indRSI  && <span className="text-xs text-gray-600">RSI14: <span className="font-semibold text-gray-900">{formatNum(lastRSI)}</span></span>}
                  {indMACD && (<><span className="text-xs text-gray-600">MACD: <span className="font-semibold text-gray-900">{formatNum(lastMACD)}</span></span><span className="text-xs text-gray-600">Signal: <span className="font-semibold text-gray-900">{formatNum(lastMACDSignal)}</span></span></>)}
                  <span className={`text-xs font-semibold ${trendLabel === "Bullish" ? "text-green-600" : trendLabel === "Bearish" ? "text-red-600" : "text-gray-500"}`}>{trendLabel}</span>
                </div>
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={saveLayout} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Save Layout</button>
              <button type="button" onClick={resetLayout} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Reset Layout</button>
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div ref={containerRef} className="h-full w-full" />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 z-20"
            style={{
              pointerEvents: overlayInteractive ? "auto" : "none",
              cursor: tool === "cursor" ? (dragRef.current ? "grabbing" : selectedShapeId ? "pointer" : "default") : "crosshair",
            }}
            onMouseDown={onOverlayDown}
            onMouseMove={onOverlayMove}
            onMouseUp={onOverlayUp}
            onMouseLeave={onOverlayUp}
          />
          <DrawingToolbar tool={tool} setTool={setTool} drawingRef={drawingRef} selectedShapeId={selectedShapeId} deleteSelected={deleteSelected} clearAll={clearAll} />
          {tool === "cursor" && selectedShape && (
            <ShapeEditor
              selectedShape={selectedShape}
              setShapes={setShapes}
              updateShape={updateShape}
              setSelectedShapeId={setSelectedShapeId}
              displayCurrency={displayCurrency}
            />
          )}
        </div>
      </div>

      {/* ── Right: Trading Panel ── */}
      <TradingPanel
        symbol={symbol} isCrypto={true}
        displayCurrency={displayCurrency} livePrice={livePrice} overview={overview}
        activeTab={activeTab} setActiveTab={setActiveTab}
        loadingOverview={loadingOverview} about={about} loadingAbout={loadingAbout}
        fundamentals={fundamentals} loadingFundamentals={loadingFundamentals}
        news={news} loadingNews={loadingNews}
        orders={orders} ordersLoading={ordersLoading}
        journals={journals} journalsLoading={journalsLoading}
        onOpenOrder={openOrder} onOpenExit={openExit}
        lastTickTime={lastTickTime}
      />

      <OrderModal
        show={showModal} onClose={() => { if (!placingOrder) { setShowModal(false); setOrderError(""); setOrderSuccess(""); } }}
        symbol={symbol} isCrypto={true}
        orderSide={orderSide} orderType={orderType} setOrderType={setOrderType}
        orderMode={orderMode} setOrderMode={setOrderMode}
        quantity={quantity} setQuantity={setQuantity}
        price={price} setPrice={setPrice}
        orderJournal={orderJournal} setOrderJournal={setOrderJournal}
        placingOrder={placingOrder} orderError={orderError} orderSuccess={orderSuccess}
        onConfirm={continueToEntryJournal} livePrice={livePrice} overview={overview} displayCurrency={displayCurrency} about={about}
      />
      <EntryJournalModal
        show={showEntryJournalModal}
        onClose={() => { if (!placingOrder) { setShowEntryJournalModal(false); setOrderError(""); setOrderSuccess(""); } }}
        onBack={backToOrderModal}
        orderJournal={orderJournal}
        setOrderJournal={setOrderJournal}
        placingOrder={placingOrder}
        orderError={orderError}
        orderSuccess={orderSuccess}
        onConfirm={placeOrder}
        orderSide={orderSide}
      />
      <ExitModal
        show={showExitModal} exitOrder={exitOrder} onClose={() => { setShowExitModal(false); setExitOrder(null); }}
        exitQty={exitQty} setExitQty={setExitQty}
        exitJournal={exitJournal} setExitJournal={setExitJournal}
        exitLoading={exitLoading} exitError={exitError} exitSuccess={exitSuccess}
        onConfirm={placeExit} livePrice={livePrice} overview={overview} displayCurrency={displayCurrency}
      />
    </div>
  );
}

/* ===================== MAIN ROUTER ===================== */
// Clean router: reads location.state and renders either StockChart or CryptoChart.
// Zero shared state between the two — no timing/data contamination possible.
export default function Charts() {
  const location = useLocation();

  const rawSymbol  = String(location.state?.symbol || "RELIANCE").trim();
  const marketType = location.state?.marketType || location.state?.assetType || location.state?.market || location.state?.type || null;
  const isCrypto   = marketType === "crypto" || location.state?.isCrypto === true;

  const symbol = useMemo(() => {
    if (isCrypto) return rawSymbol.replace(/\.NS$/i, "").replace(/-INR$/i, "").toUpperCase();
    return rawSymbol;
  }, [rawSymbol, isCrypto]);

  const coinId = location.state?.coinId || location.state?.id || (isCrypto ? symbol.toLowerCase() : null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 pb-6 pt-20">
        {isCrypto
          ? <CryptoChart key={`crypto_${coinId || symbol}`} symbol={symbol} coinId={coinId} />
          : <StockChart  key={`stock_${symbol}`}             symbol={symbol} />
        }
      </div>
    </div>
  );
}
