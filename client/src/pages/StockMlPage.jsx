import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Search,
  Activity,
  Target,
  AlertCircle,
  Database,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CircleDot,
  ChevronRight,
  Bot,
  Wallet,
  Radar,
} from "lucide-react";

const ML_BASE_URL = "http://127.0.0.1:8000";
const QUICK_SYMBOLS = ["TCS", "INFY", "RELIANCE", "HDFCBANK", "ICICIBANK", "SBIN"];

export default function StockMLPage() {
  const [symbol, setSymbol] = useState("TCS");
  const [inputSymbol, setInputSymbol] = useState("TCS");

  const [signalData, setSignalData] = useState(null);
  const [pricePrediction, setPricePrediction] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSignalData = async (stockSymbol) => {
    const res = await axios.get(
      `${ML_BASE_URL}/predict/signal/${encodeURIComponent(stockSymbol)}`
    );
    return res.data;
  };

  const fetchPricePrediction = async (stockSymbol) => {
    const res = await axios.get(
      `${ML_BASE_URL}/predict/price/${encodeURIComponent(stockSymbol)}`
    );
    return res.data;
  };

  const loadMlData = async (stockSymbol) => {
    try {
      setLoading(true);
      setError("");

      const cleanedSymbol = String(stockSymbol || "").trim().toUpperCase();

      if (!cleanedSymbol) {
        setError("Please enter a valid stock symbol");
        setSignalData(null);
        setPricePrediction(null);
        return;
      }

      const [signalRes, priceRes] = await Promise.all([
        fetchSignalData(cleanedSymbol),
        fetchPricePrediction(cleanedSymbol),
      ]);

      setSignalData(signalRes);
      setPricePrediction(priceRes);
    } catch (err) {
      console.error("Prediction fetch failed:", err);
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Failed to fetch prediction data"
      );
      setSignalData(null);
      setPricePrediction(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMlData(symbol);
  }, [symbol]);

  const handleSearch = (e) => {
    e.preventDefault();
    const cleaned = inputSymbol.trim().toUpperCase();
    if (!cleaned) return;
    setSymbol(cleaned);
  };

  const handleQuickSymbol = (item) => {
    setInputSymbol(item);
    setSymbol(item);
  };

  const getSignalColor = (signal) => {
    if (signal === "BUY") return "text-emerald-600";
    if (signal === "SELL") return "text-rose-600";
    return "text-amber-600";
  };

  const getSignalSoft = (signal) => {
    if (signal === "BUY") return "bg-emerald-50 border-emerald-200 text-emerald-700";
    if (signal === "SELL") return "bg-rose-50 border-rose-200 text-rose-700";
    return "bg-amber-50 border-amber-200 text-amber-700";
  };

  const getTrendColor = (trend) => {
    if (trend === "UP") return "text-emerald-600";
    if (trend === "DOWN") return "text-rose-600";
    return "text-slate-600";
  };

  const getTrendSoft = (trend) => {
    if (trend === "UP") return "bg-emerald-50 border-emerald-200 text-emerald-700";
    if (trend === "DOWN") return "bg-rose-50 border-rose-200 text-rose-700";
    return "bg-slate-50 border-slate-200 text-slate-700";
  };

  const verdict = useMemo(() => {
    const signal = signalData?.signal;
    const trend = pricePrediction?.trend;

    if (!signal && !trend) {
      return {
        title: "No Prediction",
        subtitle: "Prediction data is not available yet.",
        color: "text-slate-700",
        box: "bg-slate-50 border-slate-200",
        glow: "from-slate-500/10 to-slate-300/10",
      };
    }

    if (signal === "BUY" && trend === "UP") {
      return {
        title: "Bullish Alignment",
        subtitle: "Both models are pointing to an upward move.",
        color: "text-emerald-700",
        box: "bg-emerald-50 border-emerald-200",
        glow: "from-emerald-500/20 to-teal-400/10",
      };
    }

    if (signal === "SELL" && trend === "DOWN") {
      return {
        title: "Bearish Alignment",
        subtitle: "Both models are pointing to a downward move.",
        color: "text-rose-700",
        box: "bg-rose-50 border-rose-200",
        glow: "from-rose-500/20 to-orange-400/10",
      };
    }

    return {
      title: "Mixed View",
      subtitle: "Signal and price models are not fully aligned.",
      color: "text-amber-700",
      box: "bg-amber-50 border-amber-200",
      glow: "from-amber-500/20 to-yellow-400/10",
    };
  }, [signalData, pricePrediction]);

  const signalConfidence =
    signalData?.confidence !== undefined && signalData?.confidence !== null
      ? `${signalData.confidence}%`
      : "N/A";

  const expectedChange =
    pricePrediction?.change_percent !== undefined &&
    pricePrediction?.change_percent !== null
      ? `${pricePrediction.change_percent}%`
      : "N/A";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0ecff_0%,_#f8fbff_35%,_#f8fafc_70%)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white shadow-2xl mb-6">
          <div className="absolute inset-0">
            <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -bottom-20 left-0 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:32px_32px]" />
          </div>

          <div className="relative z-10 p-6 md:p-8 lg:p-10">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-sm text-blue-100 mb-4 backdrop-blur-sm">
                  <Sparkles size={15} />
                  AI Stock Prediction Workspace
                </div>

                <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                  Smarter stock predictions,
                  <span className="block text-blue-200">
                    cleaner and easier to read
                  </span>
                </h1>

                <p className="mt-4 text-slate-300 text-sm md:text-base max-w-2xl leading-7">
                  View classification signal, next-day price prediction, model
                  confidence, trend direction, and training availability in one
                  focused dashboard.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {QUICK_SYMBOLS.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleQuickSymbol(item)}
                      className={`px-4 py-2 rounded-2xl border text-sm font-medium transition ${
                        symbol === item
                          ? "bg-white text-slate-900 border-white"
                          : "bg-white/10 border-white/15 text-white hover:bg-white/15"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-4 xl:w-[320px]">
                <HeroMiniCard
                  icon={<BarChart3 size={18} />}
                  label="Selected Symbol"
                  value={symbol}
                />
                <HeroMiniCard
                  icon={<Bot size={18} />}
                  label="Active Models"
                  value="2 Models"
                />
                <HeroMiniCard
                  icon={<Radar size={18} />}
                  label="Overall View"
                  value={verdict.title}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/90 backdrop-blur rounded-[28px] shadow-sm border border-slate-200/80 p-4 md:p-5 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={inputSymbol}
                onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                placeholder="Search stock symbol like TCS, INFY, RELIANCE"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-300 bg-slate-50/70 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition shadow-sm"
            >
              Load Prediction
            </button>
          </form>
        </div>

        {/* Status */}
        {loading && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 px-4 py-3">
            Loading prediction data for <strong>{symbol}</strong>...
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          <OverviewCard
            title="Signal Model"
            value={signalData?.signal || "N/A"}
            subtitle={`Confidence: ${signalConfidence}`}
            icon={<Brain size={20} />}
            tone={getSignalSoft(signalData?.signal)}
            valueClass={getSignalColor(signalData?.signal)}
          />

          <OverviewCard
            title="Predicted Trend"
            value={pricePrediction?.trend || "N/A"}
            subtitle={`Expected Change: ${expectedChange}`}
            icon={
              pricePrediction?.trend === "DOWN" ? (
                <TrendingDown size={20} />
              ) : (
                <TrendingUp size={20} />
              )
            }
            tone={getTrendSoft(pricePrediction?.trend)}
            valueClass={getTrendColor(pricePrediction?.trend)}
          />

          <OverviewCard
            title="Predicted Price"
            value={
              pricePrediction?.predicted_price !== undefined &&
              pricePrediction?.predicted_price !== null
                ? `₹${pricePrediction.predicted_price}`
                : "N/A"
            }
            subtitle={`Current: ₹${pricePrediction?.current_price ?? "N/A"}`}
            icon={<Wallet size={20} />}
            tone="bg-violet-50 border-violet-200 text-violet-700"
            valueClass="text-violet-700"
          />

          <div
            className={`relative overflow-hidden rounded-[28px] border p-5 ${verdict.box}`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${verdict.glow} pointer-events-none`}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-600">Overall View</p>
                <Target size={20} className={verdict.color} />
              </div>
              <p className={`text-2xl font-bold ${verdict.color}`}>{verdict.title}</p>
              <p className="text-sm text-slate-600 mt-2 leading-6">
                {verdict.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Main section */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6 mb-6">
          {/* Left */}
          <div className="space-y-6">
            <SectionCard
              title="Signal Prediction"
              subtitle="Classification model output"
              badge={signalData?.signal || "N/A"}
              badgeClass={getSignalSoft(signalData?.signal)}
            >
              {signalData ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <PrimaryMetric
                      label="Signal"
                      value={signalData.signal || "N/A"}
                      icon={<Activity size={18} />}
                      valueClass={getSignalColor(signalData?.signal)}
                    />
                    <PrimaryMetric
                      label="Confidence"
                      value={signalConfidence}
                      icon={<Target size={18} />}
                    />
                    <PrimaryMetric
                      label="Current Price"
                      value={`₹${signalData.price ?? "N/A"}`}
                      icon={<TrendingUp size={18} />}
                    />
                    <PrimaryMetric
                      label="Seen In Training"
                      value={
                        signalData.seen_in_training !== undefined
                          ? String(signalData.seen_in_training)
                          : "N/A"
                      }
                      icon={<Database size={18} />}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <InfoBox
                      label="Symbol"
                      value={signalData.symbol || "N/A"}
                      icon={<BarChart3 size={18} />}
                    />
                    <InfoBox
                      label="Date"
                      value={signalData.date || "N/A"}
                      icon={<Database size={18} />}
                    />
                    <InfoBox
                      label="Threshold"
                      value={signalData.threshold_used ?? signalData.threshold ?? "N/A"}
                      icon={<Brain size={18} />}
                    />
                    <InfoBox
                      label="Note"
                      value={signalData.note || "N/A"}
                      icon={<Sparkles size={18} />}
                    />
                  </div>

                  {Array.isArray(signalData?.reasons) && signalData.reasons.length > 0 && (
                    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <ChevronRight size={18} className="text-slate-500" />
                        <h3 className="text-base font-bold text-slate-800">
                          Signal Reasons
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {signalData.reasons.map((reason, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <CircleDot size={14} className="mt-1 text-blue-600 shrink-0" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                !loading && (
                  <p className="text-slate-500">No signal data available.</p>
                )
              )}
            </SectionCard>

            {signalData?.indicators && (
              <SectionCard
                title="Signal Indicators"
                subtitle="Feature values used by the signal model"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Object.entries(signalData.indicators).map(([key, value]) => (
                    <MetricTile
                      key={key}
                      label={formatLabel(key)}
                      value={value}
                    />
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* Right */}
          <div className="space-y-6">
            <SectionCard
              title="Price Prediction"
              subtitle="Next-day regression output"
              badge={pricePrediction?.trend || "N/A"}
              badgeClass={getTrendSoft(pricePrediction?.trend)}
            >
              {pricePrediction ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <PrimaryMetric
                      label="Predicted Price"
                      value={`₹${pricePrediction.predicted_price ?? "N/A"}`}
                      icon={<Target size={18} />}
                    />
                    <PrimaryMetric
                      label="Expected Change"
                      value={expectedChange}
                      icon={
                        pricePrediction?.trend === "DOWN" ? (
                          <ArrowDownRight size={18} />
                        ) : (
                          <ArrowUpRight size={18} />
                        )
                      }
                      valueClass={getTrendColor(pricePrediction?.trend)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <InfoBox
                      label="Symbol"
                      value={pricePrediction.symbol || "N/A"}
                      icon={<BarChart3 size={18} />}
                    />
                    <InfoBox
                      label="Yahoo Symbol"
                      value={pricePrediction.yahoo_symbol || "N/A"}
                      icon={<Database size={18} />}
                    />
                    <InfoBox
                      label="Current Price"
                      value={`₹${pricePrediction.current_price ?? "N/A"}`}
                      icon={<Activity size={18} />}
                    />
                    <InfoBox
                      label="Trend"
                      value={pricePrediction.trend || "N/A"}
                      icon={
                        pricePrediction?.trend === "DOWN" ? (
                          <TrendingDown size={18} />
                        ) : (
                          <TrendingUp size={18} />
                        )
                      }
                    />
                    <InfoBox
                      label="Prediction Date"
                      value={pricePrediction.date || "N/A"}
                      icon={<Database size={18} />}
                    />
                    <InfoBox
                      label="Target Type"
                      value={pricePrediction.target || "N/A"}
                      icon={<Brain size={18} />}
                    />
                  </div>

                  {pricePrediction?.model_metrics && (
                    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <h3 className="text-base font-bold text-slate-800 mb-4">
                        Model Metrics
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <MetricBox
                          label="MAE"
                          value={pricePrediction.model_metrics.mae ?? "N/A"}
                        />
                        <MetricBox
                          label="RMSE"
                          value={pricePrediction.model_metrics.rmse ?? "N/A"}
                        />
                        <MetricBox
                          label="R²"
                          value={pricePrediction.model_metrics.r2 ?? "N/A"}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                !loading && (
                  <p className="text-slate-500">No price prediction data available.</p>
                )
              )}
            </SectionCard>

            <SectionCard
              title="Raw API Response"
              subtitle="Useful for debugging backend responses"
            >
              <div className="space-y-4">
                <JsonPanel title="Signal JSON" data={signalData} />
                <JsonPanel title="Price Prediction JSON" data={pricePrediction} />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroMiniCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4">
      <div className="flex items-center gap-2 text-slate-300 text-sm mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function OverviewCard({ title, value, subtitle, icon, tone, valueClass }) {
  return (
    <div className="bg-white rounded-[28px] shadow-sm border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
        </div>
        <div className={`rounded-2xl border p-2.5 ${tone}`}>{icon}</div>
      </div>
      <p className={`text-3xl font-bold tracking-tight ${valueClass || "text-slate-900"}`}>
        {value}
      </p>
      <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, badge, badgeClass, children }) {
  return (
    <div className="bg-white rounded-[30px] shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500 mt-1">{subtitle}</p> : null}
        </div>
        {badge ? (
          <div
            className={`px-3 py-1.5 rounded-full border text-sm font-semibold w-fit ${badgeClass || "bg-slate-50 border-slate-200 text-slate-700"}`}
          >
            {badge}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function PrimaryMetric({ label, value, icon, valueClass = "text-slate-900" }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
      <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-bold break-words ${valueClass}`}>{value}</p>
    </div>
  );
}

function InfoBox({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-slate-900 font-semibold break-words">{value}</p>
    </div>
  );
}

function MetricTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500 mb-2">{label}</p>
      <p className="text-lg font-bold text-slate-900 break-words">
        {value ?? "N/A"}
      </p>
    </div>
  );
}

function MetricBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center">
      <p className="text-slate-500 text-sm mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function JsonPanel({ title, data }) {
  return (
    <div className="rounded-3xl overflow-hidden border border-slate-200">
      <div className="px-4 py-3 bg-slate-100 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <pre className="bg-slate-950 text-slate-100 p-4 overflow-auto text-xs md:text-sm max-h-[320px]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}