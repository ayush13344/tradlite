import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
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
  Gauge,
  LineChart,
} from "lucide-react";

const ML_BASE_URL = "http://127.0.0.1:8000";
const QUICK_SYMBOLS = ["TCS", "INFY", "RELIANCE", "HDFCBANK", "ICICIBANK", "SBIN"];

export default function StockMLPage() {
  const location = useLocation();

  const initialSymbol = useMemo(() => {
    return String(location?.state?.symbol || "TCS").toUpperCase();
  }, [location?.state?.symbol]);

  const [symbol, setSymbol] = useState(initialSymbol);
  const [inputSymbol, setInputSymbol] = useState(initialSymbol);

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
    if (location?.state?.symbol) {
      const next = String(location.state.symbol).toUpperCase();
      setSymbol(next);
      setInputSymbol(next);
    }
  }, [location?.state?.symbol]);

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

  const signalConfidenceNum =
    signalData?.confidence !== undefined && signalData?.confidence !== null
      ? Number(signalData.confidence)
      : null;

  const signalConfidence =
    signalConfidenceNum !== null && !Number.isNaN(signalConfidenceNum)
      ? `${signalConfidenceNum}%`
      : "N/A";

  const expectedChangeNum =
    pricePrediction?.change_percent !== undefined &&
    pricePrediction?.change_percent !== null
      ? Number(pricePrediction.change_percent)
      : null;

  const expectedChange =
    expectedChangeNum !== null && !Number.isNaN(expectedChangeNum)
      ? `${expectedChangeNum}%`
      : "N/A";

  const currentPrice =
    pricePrediction?.current_price !== undefined &&
    pricePrediction?.current_price !== null
      ? Number(pricePrediction.current_price)
      : null;

  const predictedPrice =
    pricePrediction?.predicted_price !== undefined &&
    pricePrediction?.predicted_price !== null
      ? Number(pricePrediction.predicted_price)
      : null;

  const priceDelta =
    currentPrice !== null && predictedPrice !== null
      ? predictedPrice - currentPrice
      : null;

  const forecastPoints = useMemo(() => {
    if (currentPrice === null || predictedPrice === null) return [];

    const diff = predictedPrice - currentPrice;

    return [
      { label: "Current", value: currentPrice },
      { label: "Model Path", value: currentPrice + diff * 0.35 },
      { label: "Projected", value: currentPrice + diff * 0.7 },
      { label: "Next Session", value: predictedPrice },
    ];
  }, [currentPrice, predictedPrice]);

  const minForecast = forecastPoints.length
    ? Math.min(...forecastPoints.map((p) => p.value))
    : 0;

  const maxForecast = forecastPoints.length
    ? Math.max(...forecastPoints.map((p) => p.value))
    : 0;

  const confidenceTone =
    signalConfidenceNum >= 75
      ? "High Confidence"
      : signalConfidenceNum >= 55
      ? "Moderate Confidence"
      : signalConfidenceNum !== null
      ? "Low Confidence"
      : "N/A";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-200 via-white to-emerald-50 transition-all duration-700">
      <div className="max-w-[1500px] mx-auto px-8 py-16 space-y-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 left-10 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl animate-pulse" />
            <div className="absolute top-0 right-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-300/15 blur-3xl animate-pulse" />
          </div>

          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-0">
            <div className="px-8 md:px-10 py-10 md:py-12 border-b xl:border-b-0 xl:border-r border-white/60">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/75 border border-slate-200 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-600 shadow-sm">
                <Sparkles size={14} />
                AI Stock Prediction Workspace
              </div>

              <h1 className="mt-6 text-4xl md:text-5xl font-black tracking-tight leading-[1.05] text-slate-900">
                Smarter stock prediction
                <span className="block bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 bg-clip-text text-transparent">
                  in your market theme
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-[1.04rem] leading-8 text-slate-500">
                View ML signal, trend direction, predicted price, confidence, and
                model details in one premium dashboard designed to match your market page.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {QUICK_SYMBOLS.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleQuickSymbol(item)}
                    className={`group rounded-full border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-300 hover:-translate-y-0.5 ${
                      symbol === item
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-white/80 bg-white/80 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          symbol === item ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-8 md:px-10 py-10 md:py-12">
              <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-4">
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
        </section>

        {/* Search */}
        <section className="rounded-[32px] border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.08)] p-5 md:p-6">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
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
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50/80 pl-11 pr-4 py-4 text-lg font-semibold text-slate-900 outline-none transition-all duration-300 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <button
              type="submit"
              className="group rounded-[20px] bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 text-white text-[1.02rem] font-semibold px-7 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <span className="inline-flex items-center gap-3">
                Load Prediction
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </button>
          </form>
        </section>

        {/* Status */}
        {loading && (
          <div className="rounded-[22px] border border-sky-200 bg-sky-50 text-sky-700 px-5 py-4 font-medium shadow-sm">
            Loading prediction data for <strong>{symbol}</strong>...
          </div>
        )}

        {error && (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 text-rose-700 px-5 py-4 flex items-start gap-3 shadow-sm">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top overview */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
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
              predictedPrice !== null ? `₹${formatNumber(predictedPrice)}` : "N/A"
            }
            subtitle={`Current: ₹${currentPrice !== null ? formatNumber(currentPrice) : "N/A"}`}
            icon={<Wallet size={20} />}
            tone="bg-violet-50 border-violet-200 text-violet-700"
            valueClass="text-violet-700"
          />

          <div className={`relative overflow-hidden rounded-[28px] border p-5 ${verdict.box}`}>
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
        </section>

        {/* Main */}
        <section className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.55fr] gap-8">
          <div className="space-y-8">
            <div className="rounded-[32px] border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.08)] p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/75 border border-slate-200 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 shadow-sm">
                    <LineChart size={14} />
                    Price Forecast Panel
                  </div>
                  <h2 className="mt-4 text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                    {symbol} price outlook
                  </h2>
                  <p className="mt-3 text-slate-500 leading-7">
                    Model-based direction view for the next session. The path chart is visual guidance, not an hourly timeline.
                  </p>
                </div>

                <div
                  className={`w-fit px-4 py-2 rounded-full border text-sm font-semibold ${getTrendSoft(
                    pricePrediction?.trend
                  )}`}
                >
                  {pricePrediction?.trend === "UP"
                    ? "Bullish forecast"
                    : pricePrediction?.trend === "DOWN"
                    ? "Bearish forecast"
                    : "Neutral forecast"}
                </div>
              </div>

              {pricePrediction ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <HighlightPriceCard
                      label="Current Price"
                      value={currentPrice !== null ? `₹${formatNumber(currentPrice)}` : "N/A"}
                      sub="Live reference"
                      icon={<Activity size={18} />}
                    />

                    <HighlightPriceCard
                      label="Predicted Price"
                      value={predictedPrice !== null ? `₹${formatNumber(predictedPrice)}` : "N/A"}
                      sub="Model target"
                      icon={<Target size={18} />}
                      strong
                    />

                    <HighlightPriceCard
                      label="Expected Move"
                      value={
                        priceDelta !== null
                          ? `${priceDelta >= 0 ? "+" : ""}₹${formatNumber(priceDelta)}`
                          : "N/A"
                      }
                      sub={expectedChange !== "N/A" ? expectedChange : "Move unavailable"}
                      icon={
                        priceDelta !== null && priceDelta < 0 ? (
                          <ArrowDownRight size={18} />
                        ) : (
                          <ArrowUpRight size={18} />
                        )
                      }
                      tone={
                        priceDelta !== null
                          ? priceDelta >= 0
                            ? "green"
                            : "red"
                          : "slate"
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
                    <div className="rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-[0_18px_38px_rgba(15,23,42,0.18)]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-slate-300">Visual forecast</p>
                          <h3 className="text-xl font-semibold mt-1">
                            Forecast path
                          </h3>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-3 py-1.5 text-sm text-blue-100 border border-white/10">
                          Next session view
                        </div>
                      </div>

                      <ForecastChart
                        points={forecastPoints}
                        min={minForecast}
                        max={maxForecast}
                        trend={pricePrediction?.trend}
                      />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                        {forecastPoints.map((point) => (
                          <div
                            key={point.label}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                          >
                            <p className="text-xs text-slate-300">{point.label}</p>
                            <p className="text-lg font-semibold mt-1">
                              ₹{formatNumber(point.value)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 leading-6">
                        This panel shows a <span className="font-semibold text-white">model path</span> toward the predicted next-session target. It is not an hour-by-hour forecast.
                      </div>
                    </div>

                    <div className="space-y-4">
                      <ConfidenceCard
                        confidence={signalConfidenceNum}
                        label={confidenceTone}
                      />

                      <PredictionSummaryCard
                        signal={signalData?.signal}
                        trend={pricePrediction?.trend}
                        currentPrice={currentPrice}
                        predictedPrice={predictedPrice}
                        changePercent={expectedChangeNum}
                      />
                    </div>
                  </div>
                </>
              ) : (
                !loading && (
                  <p className="text-slate-500">No price prediction data available.</p>
                )
              )}
            </div>

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
                      icon={<Gauge size={18} />}
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
                    <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-5">
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
                !loading && <p className="text-slate-500">No signal data available.</p>
              )}
            </SectionCard>
          </div>

          <div className="space-y-8">
            <SectionCard
              title="Price Prediction Details"
              subtitle="Regression model output"
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

                 
                </>
              ) : (
                !loading && (
                  <p className="text-slate-500">No price prediction data available.</p>
                )
              )}
            </SectionCard>

            <SectionCard
              title="Signal Indicators"
              subtitle="Feature values used by the signal model"
            >
              {signalData?.indicators ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(signalData.indicators).map(([key, value]) => (
                    <MetricTile
                      key={key}
                      label={formatLabel(key)}
                      value={value}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No indicator data available.</p>
              )}
            </SectionCard>
          </div>
        </section>
      </div>
    </div>
  );
}

function HeroMiniCard({ icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function OverviewCard({ title, value, subtitle, icon, tone, valueClass }) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.08)] p-5 transition duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
        </div>
        <div className={`rounded-2xl border p-2.5 ${tone}`}>{icon}</div>
      </div>
      <p className={`text-3xl font-black tracking-tight ${valueClass || "text-slate-900"}`}>
        {value}
      </p>
      <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, badge, badgeClass, children }) {
  return (
    <div className="rounded-[32px] border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.08)] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>
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
    <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
      <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-black break-words ${valueClass}`}>{value}</p>
    </div>
  );
}

function InfoBox({ label, value, icon }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
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
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500 mb-2">{label}</p>
      <p className="text-lg font-bold text-slate-900 break-words">
        {value ?? "N/A"}
      </p>
    </div>
  );
}

function MetricBox({ label, value }) {
  return (
    <div className="rounded-[22px] bg-white border border-slate-200 p-4 text-center">
      <p className="text-slate-500 text-sm mb-1">{label}</p>
      <p className="text-xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function HighlightPriceCard({ label, value, sub, icon, tone = "slate", strong = false }) {
  const toneMap = {
    slate: "from-slate-50 to-white border-slate-200",
    green: "from-emerald-50 to-white border-emerald-200",
    red: "from-rose-50 to-white border-rose-200",
  };

  return (
    <div
      className={`rounded-[26px] border bg-gradient-to-br p-5 ${
        toneMap[tone] || toneMap.slate
      } ${strong ? "shadow-sm" : ""}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="rounded-2xl bg-slate-900 text-white p-2">{icon}</div>
      </div>
      <p className="text-2xl md:text-3xl font-black text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-2">{sub}</p>
    </div>
  );
}

function ForecastChart({ points, min, max, trend }) {
  if (!points?.length) {
    return (
      <div className="h-[300px] rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-300">
        Forecast data unavailable
      </div>
    );
  }

  const width = 900;
  const height = 300;
  const padding = 34;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const range = max - min || 1;

  const coords = points.map((point, index) => {
    const x = padding + (usableWidth / Math.max(points.length - 1, 1)) * index;
    const y = padding + usableHeight - ((point.value - min) / range) * usableHeight;
    return { ...point, x, y };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `${padding},${height - padding} ${polyline} ${
    padding + usableWidth
  },${height - padding}`;

  const stroke =
    trend === "DOWN"
      ? "#fb7185"
      : trend === "UP"
      ? "#34d399"
      : "#94a3b8";

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[300px]">
        {[0, 1, 2, 3].map((line) => {
          const y = padding + (usableHeight / 3) * line;
          return (
            <line
              key={line}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 6"
            />
          );
        })}

        <polygon points={area} fill="rgba(255,255,255,0.06)" />
        <polyline
          points={polyline}
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((c) => (
          <g key={c.label}>
            <circle cx={c.x} cy={c.y} r="7" fill={stroke} />
            <circle cx={c.x} cy={c.y} r="13" fill="rgba(255,255,255,0.08)" />
            <text
              x={c.x}
              y={c.y - 18}
              textAnchor="middle"
              fill="white"
              fontSize="13"
              fontWeight="700"
            >
              ₹{formatNumber(c.value)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ConfidenceCard({ confidence, label }) {
  const safeValue =
    confidence !== null && confidence !== undefined && !Number.isNaN(confidence)
      ? Math.max(0, Math.min(100, confidence))
      : 0;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
        <Gauge size={18} />
        <span>Model confidence</span>
      </div>

      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="#0f172a"
            strokeWidth="10"
            strokeDasharray={`${2 * Math.PI * 48}`}
            strokeDashoffset={`${2 * Math.PI * 48 * (1 - safeValue / 100)}`}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-slate-900">{safeValue}%</p>
          <p className="text-xs text-slate-500">Confidence</p>
        </div>
      </div>

      <div className="text-center">
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-sm text-slate-500 mt-1">
          Use this together with trend and signal before taking action.
        </p>
      </div>
    </div>
  );
}

function PredictionSummaryCard({
  signal,
  trend,
  currentPrice,
  predictedPrice,
  changePercent,
}) {
  const direction =
    trend === "UP"
      ? "upside continuation"
      : trend === "DOWN"
      ? "downside pressure"
      : "sideways movement";

  const alignment =
    signal && trend
      ? signal === "BUY" && trend === "UP"
        ? "Both models are aligned on bullish momentum."
        : signal === "SELL" && trend === "DOWN"
        ? "Both models are aligned on bearish momentum."
        : "Signal and trend are mixed, so conviction is lower."
      : "Not enough data for alignment summary.";

  return (
    <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
      <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
        <Brain size={18} />
        <span>AI summary</span>
      </div>

      <h3 className="text-lg font-black text-slate-900 mb-3">
        Forecast interpretation
      </h3>

      <div className="space-y-3 text-sm text-slate-600 leading-6">
        <p>
          The current forecast suggests <strong>{direction}</strong>
          {changePercent !== null && !Number.isNaN(changePercent)
            ? ` with an expected move of ${changePercent}%.`
            : "."}
        </p>

        <p>{alignment}</p>

        <p>
          {currentPrice !== null && predictedPrice !== null
            ? `The model is projecting a move from ₹${formatNumber(
                currentPrice
              )} to ₹${formatNumber(predictedPrice)} by the next session target.`
            : "Current and predicted price comparison is unavailable."}
        </p>
      </div>
    </div>
  );
}

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toFixed(2);
}