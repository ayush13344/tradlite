import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Search,
  RefreshCcw,
  CalendarDays,
  BadgeIndianRupee,
  CircleDollarSign,
  NotebookPen,
  TrendingUp,
  TrendingDown,
  Star,
  Brain,
  Target,
  BookOpen,
  AlertTriangle,
  Tags,
} from "lucide-react";
import api from "../api/axios";

/* ========================= HELPERS ========================= */

function normalizeSymbol(symbol = "") {
  return String(symbol || "")
    .toUpperCase()
    .trim()
    .replace(/\.NS$/i, "")
    .replace(/\.BO$/i, "");
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function formatCurrency(v) {
  const n = Number(v || 0);
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNum(v) {
  const n = Number(v || 0);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(v) {
  if (!v) return "--";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPnlBg(v) {
  const n = Number(v || 0);
  if (n > 0) return "bg-emerald-50 text-emerald-700";
  if (n < 0) return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function getLoggedInUserId() {
  try {
    const raw =
      localStorage.getItem("userInfo") ||
      localStorage.getItem("user") ||
      sessionStorage.getItem("userInfo") ||
      sessionStorage.getItem("user");

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    return (
      parsed?._id ||
      parsed?.id ||
      parsed?.user?._id ||
      parsed?.user?.id ||
      null
    );
  } catch {
    return null;
  }
}

function normalizeJournal(item = {}) {
  const entryPrice = Number(item.entryPrice ?? 0);
  const exitPrice =
    item.exitPrice === null || item.exitPrice === undefined
      ? null
      : Number(item.exitPrice);

  const quantity = Number(item.quantity ?? 0);
  const pnl = Number(item.pnl ?? 0);

  return {
    _id: item._id || `${Date.now()}_${Math.random()}`,
    symbol: normalizeSymbol(item.symbol),
    title: `${item.side || "TRADE"} ${normalizeSymbol(item.symbol || "")}`.trim(),
    strategy:
      [item.strategy, item.setupType].filter(Boolean).join(" • ") || "Not mentioned",
    tradeType: item.side || "BUY",
    marketType: item.mode || "DELIVERY",
    entryPrice,
    exitPrice,
    quantity,
    remainingQty: Number(item.remainingQty ?? 0),
    pnl,
    pnlPct: Number(item.pnlPct ?? 0),
    emotionBefore: item.emotionBefore || "",
    emotionAfter: item.emotionAfter || "",
    reasonForEntry: item.reasonForEntry || "",
    reasonForExit: item.reasonForExit || "",
    mistakes: item.mistakes || "",
    lessons: item.lessonsLearned || "",
    confidence: item.confidence ?? null,
    rating: item.rating ?? null,
    tags: safeArray(item.tags),
    status: item.status || "OPEN",
    createdAt: item.entryTime || item.createdAt || item.updatedAt || null,
    exitTime: item.exitTime || null,
  };
}

/* ========================= SMALL UI ========================= */

function StatCard({ icon, label, value, subValue = "" }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</h3>
      {subValue ? <p className="mt-1 text-xs font-medium text-slate-500">{subValue}</p> : null}
    </div>
  );
}

function EmptyState({ symbol }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <NotebookPen size={28} />
      </div>
      <h3 className="mt-4 text-xl font-bold text-slate-900">No journal entries found</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        {symbol
          ? `No trade journal entries were found for ${symbol}.`
          : "Search any stock symbol to view its full trade journal history."}
      </p>
    </div>
  );
}

function JournalCard({ item }) {
  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="absolute left-[-9px] top-8 h-4 w-4 rounded-full border-4 border-white bg-indigo-500 shadow" />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
              {item.symbol}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                item.tradeType === "SELL"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {item.tradeType}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {item.marketType}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                item.status === "CLOSED"
                  ? "bg-sky-50 text-sky-700"
                  : item.status === "PARTIAL"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-violet-50 text-violet-700"
              }`}
            >
              {item.status}
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>

          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays size={15} />
            <span>{formatDateTime(item.createdAt)}</span>
          </div>
        </div>

        <div className={`rounded-2xl px-4 py-2 text-sm font-bold ${getPnlBg(item.pnl)}`}>
          P&amp;L: {formatCurrency(item.pnl)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <BadgeIndianRupee size={16} />
            Entry Price
          </div>
          <p className="text-lg font-bold text-slate-900">{formatCurrency(item.entryPrice)}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <CircleDollarSign size={16} />
            Exit Price
          </div>
          <p className="text-lg font-bold text-slate-900">
            {item.exitPrice != null ? formatCurrency(item.exitPrice) : "--"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <TrendingUp size={16} />
            Quantity
          </div>
          <p className="text-lg font-bold text-slate-900">{formatNum(item.quantity)}</p>
          <p className="mt-1 text-xs text-slate-500">Remaining: {formatNum(item.remainingQty)}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Target size={16} />
            Return %
          </div>
          <p className={`text-lg font-bold ${Number(item.pnlPct) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {Number(item.pnlPct || 0).toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <Brain size={16} />
            Entry Notes
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p><span className="font-semibold text-slate-800">Strategy:</span> {item.strategy}</p>
            <p><span className="font-semibold text-slate-800">Confidence:</span> {item.confidence ?? "--"}</p>
            <p><span className="font-semibold text-slate-800">Emotion Before:</span> {item.emotionBefore || "Not mentioned"}</p>
            <p><span className="font-semibold text-slate-800">Reason:</span> {item.reasonForEntry || "Not mentioned"}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <BookOpen size={16} />
            Exit Reflection
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p><span className="font-semibold text-slate-800">Emotion After:</span> {item.emotionAfter || "Not mentioned"}</p>
            <p><span className="font-semibold text-slate-800">Reason:</span> {item.reasonForExit || "Not mentioned"}</p>
            <p><span className="font-semibold text-slate-800">Lessons:</span> {item.lessons || "Not mentioned"}</p>
            <p><span className="font-semibold text-slate-800">Rating:</span> {item.rating ?? "--"} / 5</p>
          </div>
        </div>
      </div>

      {item.mistakes ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
            <AlertTriangle size={16} />
            Mistakes
          </div>
          <p className="text-sm leading-6 text-amber-900">{item.mistakes}</p>
        </div>
      ) : null}

      {item.tags.length ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <Tags size={16} />
            Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag, idx) => (
              <span
                key={`${tag}-${idx}`}
                className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ========================= MAIN PAGE ========================= */

export default function TradeJournalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const routeSymbol =
    params?.symbol ||
    location?.state?.symbol ||
    new URLSearchParams(location.search).get("symbol") ||
    "";

  const [searchSymbol, setSearchSymbol] = useState(normalizeSymbol(routeSymbol));
  const [selectedSymbol, setSelectedSymbol] = useState(normalizeSymbol(routeSymbol));
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tradeFilter, setTradeFilter] = useState("ALL");

  const fetchJournalHistory = useCallback(async (symbol) => {
    const cleanSymbol = normalizeSymbol(symbol);
    const userId = getLoggedInUserId();

    if (!cleanSymbol) {
      setJournals([]);
      setError("");
      return;
    }

    if (!userId) {
      setJournals([]);
      setError("User not found. Please login again.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/trade-journal/${userId}`, {
        params: { symbol: cleanSymbol },
      });

      const payload = Array.isArray(res?.data?.journals)
        ? res.data.journals
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];

      const normalized = safeArray(payload)
        .map(normalizeJournal)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setJournals(normalized);
    } catch (err) {
      console.error("fetchJournalHistory error:", err);
      setJournals([]);
      setError(
        err?.response?.data?.message ||
          "Failed to fetch trade journal history for this stock."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSymbol) {
      fetchJournalHistory(selectedSymbol);
    }
  }, [selectedSymbol, fetchJournalHistory]);

  const filteredJournals = useMemo(() => {
    let data = [...journals];

    if (tradeFilter !== "ALL") {
      data = data.filter((item) => item.tradeType === tradeFilter);
    }

    return data;
  }, [journals, tradeFilter]);

  const summary = useMemo(() => {
    const total = filteredJournals.length;
    const wins = filteredJournals.filter((item) => Number(item.pnl) > 0).length;
    const losses = filteredJournals.filter((item) => Number(item.pnl) < 0).length;
    const netPnl = filteredJournals.reduce((sum, item) => sum + (Number(item.pnl) || 0), 0);
    const avgPnl = total ? netPnl / total : 0;
    const avgRating = total
      ? filteredJournals.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / total
      : 0;

    return {
      total,
      wins,
      losses,
      netPnl,
      avgPnl,
      avgRating,
    };
  }, [filteredJournals]);

  const handleSearch = (e) => {
    e.preventDefault();
    const clean = normalizeSymbol(searchSymbol);
    setSelectedSymbol(clean);

    if (clean) {
      navigate(`/journal/${clean}`, {
        replace: true,
        state: { symbol: clean },
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-indigo-100 bg-white p-6 shadow-sm">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-indigo-100/50 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-sky-100/50 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full bg-indigo-50 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">
                Trade Journal History
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {selectedSymbol ? `${selectedSymbol} Journal Timeline` : "Stock Trade Journal"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                View the full journal history written for a particular stock, including notes,
                strategy, mistakes, lessons, ratings, and P&amp;L performance.
              </p>
            </div>

            <form
              onSubmit={handleSearch}
              className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(normalizeSymbol(e.target.value))}
                  placeholder="Enter stock symbol like RELIANCE, TCS, INFY"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <button
                type="submit"
                className="h-12 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white transition-all hover:bg-indigo-700"
              >
                Search
              </button>

              <button
                type="button"
                onClick={() => selectedSymbol && fetchJournalHistory(selectedSymbol)}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {["ALL", "BUY", "SELL"].map((item) => (
            <button
              key={item}
              onClick={() => setTradeFilter(item)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                tradeFilter === item
                  ? "bg-indigo-600 text-white shadow"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={<NotebookPen size={18} />}
            label="Total Entries"
            value={summary.total}
            subValue={selectedSymbol || "Current Search"}
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Wins"
            value={summary.wins}
            subValue="Profitable trades"
          />
          <StatCard
            icon={<TrendingDown size={18} />}
            label="Losses"
            value={summary.losses}
            subValue="Losing trades"
          />
          <StatCard
            icon={<BadgeIndianRupee size={18} />}
            label="Net P&L"
            value={formatCurrency(summary.netPnl)}
            subValue={`Avg: ${formatCurrency(summary.avgPnl)}`}
          />
          <StatCard
            icon={<Star size={18} />}
            label="Avg Rating"
            value={summary.total ? summary.avgRating.toFixed(1) : "0.0"}
            subValue="Out of 5"
          />
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : filteredJournals.length ? (
            <div className="relative ml-3 space-y-5 border-l-2 border-dashed border-indigo-200 pl-6">
              {filteredJournals.map((item) => (
                <JournalCard key={item._id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState symbol={selectedSymbol} />
          )}
        </div>
      </div>
    </div>
  );
}
