import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/* ================= ANIMATED NUMBER ================= */

function AnimatedNumber({ value, prefix = "" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = Number(value);
    if (value === null || value === undefined || Number.isNaN(end)) return;

    let start = 0;
    const duration = 900;
    const step = Math.max(1, Math.floor(duration / 16));
    const increment = (end - start) / step;
    let frame = 0;

    const timer = setInterval(() => {
      frame += 1;
      start += increment;

      if (frame >= step) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  const n = Number(count || 0);

  return (
    <span>
      {prefix}
      {n.toLocaleString("en-US", {
        minimumFractionDigits: n >= 1 ? 2 : 4,
        maximumFractionDigits: n >= 1 ? 2 : 6,
      })}
    </span>
  );
}

/* ================= HELPERS ================= */

function formatPrice(value) {
  const n = Number(value || 0);

  if (n >= 1) {
    return `$${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })}`;
}

function formatPct(value) {
  const n = Number(value || 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatCompactNumber(value, isCurrency = false) {
  const n = Number(value || 0);

  if (isCurrency) {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
    return `$${n.toLocaleString("en-US")}`;
  }

  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString("en-US");
}

function getCoinGradient(symbol = "") {
  const gradients = {
    BTC: "from-orange-400 via-amber-400 to-yellow-400",
    ETH: "from-slate-400 via-slate-500 to-zinc-300",
    SOL: "from-fuchsia-500 via-violet-500 to-cyan-400",
    BNB: "from-yellow-400 via-amber-400 to-orange-300",
    XRP: "from-slate-700 via-slate-500 to-slate-300",
    DOGE: "from-yellow-300 via-amber-300 to-yellow-500",
    ADA: "from-sky-500 via-blue-500 to-indigo-500",
    SHIB: "from-orange-500 via-red-500 to-pink-500",
    AVAX: "from-red-500 via-rose-500 to-orange-400",
    DOT: "from-pink-500 via-fuchsia-500 to-violet-500",
    LINK: "from-blue-500 via-sky-500 to-cyan-400",
  };

  return gradients[symbol?.toUpperCase()] || "from-cyan-400 via-teal-400 to-emerald-400";
}

function buildSparkline(symbol = "", positive = true) {
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) {
    seed += symbol.charCodeAt(i);
  }

  let currentY = positive ? 60 : 34;
  const points = [];

  for (let i = 0; i < 12; i++) {
    const wave = ((seed + i * 19) % 13) - 6;
    currentY += positive ? -2.3 + wave * 0.5 : 2.3 + wave * 0.5;
    currentY = Math.max(10, Math.min(90, currentY));
    points.push({
      x: 8 + i * 18,
      y: currentY,
    });
  }

  return points;
}

function MiniChart({ symbol, positive }) {
  const pts = useMemo(() => buildSparkline(symbol, positive), [symbol, positive]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${path} L ${pts[pts.length - 1].x} 96 L ${pts[0].x} 96 Z`;
  const id = `crypto-grad-${String(symbol).replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg viewBox="0 0 220 100" className="w-full h-[84px]">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop
            offset="0%"
            stopColor={positive ? "#22c55e" : "#ef4444"}
            stopOpacity="0.22"
          />
          <stop
            offset="100%"
            stopColor={positive ? "#22c55e" : "#ef4444"}
            stopOpacity="0.02"
          />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <path
        d={path}
        fill="none"
        stroke={positive ? "#22c55e" : "#ef4444"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ================= DATA NORMALIZER ================= */

function getSafeNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (!Number.isNaN(n) && value !== null && value !== undefined && value !== "") {
      return n;
    }
  }
  return 0;
}

function normalizeCoin(raw = {}, index = 0) {
  const symbol =
    raw.symbol ||
    raw.ticker ||
    raw.code ||
    raw.id?.toString()?.toUpperCase() ||
    `COIN${index + 1}`;

  const name =
    raw.name ||
    raw.fullName ||
    raw.coinName ||
    raw.baseAsset ||
    raw.id ||
    symbol;

  const price = getSafeNumber(
    raw.price,
    raw.current_price,
    raw.lastPrice,
    raw.last_price,
    raw.marketPrice,
    raw.rate
  );

  const changePercent24h = getSafeNumber(
    raw.changePercent24h,
    raw.price_change_percentage_24h,
    raw.change24h,
    raw.percent_change_24h,
    raw.change,
    raw.dailyChange
  );

  const volume24h = getSafeNumber(
    raw.volume24h,
    raw.total_volume,
    raw.quoteVolume,
    raw.volume,
    raw.v24h
  );

  const marketCap = getSafeNumber(
    raw.marketCap,
    raw.market_cap,
    raw.cap,
    raw.marketcap
  );

  const image = raw.image || raw.icon || raw.logo || "";

  return {
    symbol: String(symbol).toUpperCase(),
    name,
    price,
    changePercent24h,
    volume24h,
    marketCap,
    image,
    raw,
  };
}

function extractCoinsFromResponse(resData) {
  const possibleArrays = [
    resData?.data?.coins,
    resData?.data?.data,
    resData?.data?.market,
    resData?.coins,
    resData?.data,
    Array.isArray(resData) ? resData : null,
  ];

  const firstValidArray = possibleArrays.find((item) => Array.isArray(item)) || [];

  return firstValidArray.map((coin, index) => normalizeCoin(coin, index));
}

function extractStatsFromResponse(resData, normalizedCoins) {
  const stats = resData?.data?.stats || resData?.stats || {};

  const totalMarketCap =
    getSafeNumber(stats.totalMarketCap, stats.total_market_cap) ||
    normalizedCoins.reduce((sum, coin) => sum + Number(coin.marketCap || 0), 0);

  const totalVolume =
    getSafeNumber(stats.totalVolume, stats.total_volume) ||
    normalizedCoins.reduce((sum, coin) => sum + Number(coin.volume24h || 0), 0);

  const btcDominance = getSafeNumber(stats.btcDominance, stats.btc_dominance);

  return {
    totalMarketCap,
    totalVolume,
    btcDominance,
  };
}

/* ================= UI SMALL COMPONENTS ================= */

function StatBox({ label, value, sub }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-2 text-2xl md:text-3xl font-black text-slate-900">{value}</div>
      {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

function CoinPill({ coin, onClick }) {
  const positive = Number(coin.changePercent24h || 0) >= 0;

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${getCoinGradient(
          coin.symbol
        )} flex items-center justify-center text-white font-black text-xs shadow`}
      >
        {coin.symbol?.slice(0, 3)}
      </div>

      <div className="text-left">
        <div className="text-sm font-bold text-slate-900">{coin.symbol}</div>
        <div className="text-xs text-slate-500">{formatPrice(coin.price)}</div>
      </div>

      <div
        className={`ml-auto text-xs font-bold ${
          positive ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {formatPct(coin.changePercent24h)}
      </div>
    </button>
  );
}

/* ================= MAIN CARDS ================= */

function CryptoFeatureCard({ coin, onClick }) {
  const positive = Number(coin.changePercent24h || 0) >= 0;

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_35%)]" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={`h-16 w-16 rounded-[22px] bg-gradient-to-br ${getCoinGradient(
                coin.symbol
              )} flex items-center justify-center text-white font-black text-lg shadow-md`}
            >
              {coin.symbol?.slice(0, 3)}
            </div>

            <div className="min-w-0">
              <h3 className="text-2xl font-black text-slate-900 truncate">{coin.symbol}</h3>
              <p className="text-sm text-slate-500 truncate">{coin.name}</p>
            </div>
          </div>

          <div
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              positive
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                : "bg-rose-50 text-rose-600 border border-rose-100"
            }`}
          >
            {formatPct(coin.changePercent24h)}
          </div>
        </div>

        <div className="mt-6">
          <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            {formatPrice(coin.price)}
          </div>
          <div className="mt-4">
            <MiniChart symbol={coin.symbol || "CRYPTO"} positive={positive} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-xs text-slate-500">24H Volume</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {formatCompactNumber(coin.volume24h)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-xs text-slate-500">Market Cap</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {formatCompactNumber(coin.marketCap, true)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm text-slate-500">Open chart</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 group-hover:bg-slate-100">
            View →
          </span>
        </div>
      </div>
    </button>
  );
}

function CryptoListCard({ coin, rank, type = "gainer", onClick }) {
  const positive =
    type === "loser"
      ? Number(coin.changePercent24h || 0) >= 0
        ? false
        : true
      : Number(coin.changePercent24h || 0) >= 0;

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative">
            <div
              className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${getCoinGradient(
                coin.symbol
              )} flex items-center justify-center text-white font-black text-sm shadow`}
            >
              {coin.symbol?.slice(0, 3)}
            </div>
            <div className="absolute -top-2 -right-2 h-6 min-w-[24px] px-1 rounded-full bg-slate-900 text-[10px] font-bold text-white flex items-center justify-center">
              {rank}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-xl font-black text-slate-900 truncate">{coin.symbol}</h3>
            <p className="text-sm text-slate-500 truncate">{coin.name}</p>
          </div>
        </div>

        <div
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            type === "loser"
              ? "bg-rose-50 text-rose-600"
              : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {type === "loser" ? "Loser" : "Gainer"}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_110px] items-end gap-4">
        <div>
          <div className="text-3xl font-black text-slate-900">{formatPrice(coin.price)}</div>
          <div
            className={`mt-2 text-sm font-bold ${
              Number(coin.changePercent24h || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {Number(coin.changePercent24h || 0) >= 0 ? "▲" : "▼"}{" "}
            {Math.abs(Number(coin.changePercent24h || 0)).toFixed(2)}% Today
          </div>
        </div>

        <div>
          <MiniChart
            symbol={coin.symbol || "CRYPTO"}
            positive={Number(coin.changePercent24h || 0) >= 0}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
        <div className="text-slate-500">
          Volume{" "}
          <span className="font-semibold text-slate-900">
            {formatCompactNumber(coin.volume24h)}
          </span>
        </div>
        <div className="text-slate-500 text-right">
          Cap{" "}
          <span className="font-semibold text-slate-900">
            {formatCompactNumber(coin.marketCap, true)}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ================= PAGE ================= */

export default function CryptoMarketPage() {
  const navigate = useNavigate();

  const [coins, setCoins] = useState([]);
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [mostActive, setMostActive] = useState([]);
  const [activeTab, setActiveTab] = useState("gainers");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [marketStats, setMarketStats] = useState({
    totalMarketCap: 0,
    totalVolume: 0,
    btcDominance: 0,
  });

  useEffect(() => {
    const fetchCrypto = async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const res = await axios.get("http://localhost:3000/api/crypto/market");
        const normalizedCoins = extractCoinsFromResponse(res.data);
        const stats = extractStatsFromResponse(res.data, normalizedCoins);

        setCoins(normalizedCoins);
        setMarketStats(stats);

        setGainers(
          [...normalizedCoins]
            .sort((a, b) => Number(b.changePercent24h || 0) - Number(a.changePercent24h || 0))
            .slice(0, 6)
        );

        setLosers(
          [...normalizedCoins]
            .sort((a, b) => Number(a.changePercent24h || 0) - Number(b.changePercent24h || 0))
            .slice(0, 6)
        );

        setMostActive(
          [...normalizedCoins]
            .sort((a, b) => Number(b.volume24h || 0) - Number(a.volume24h || 0))
            .slice(0, 8)
        );
      } catch (error) {
        console.error("Crypto API Error:", error);
        setErrorMsg("Unable to load crypto market data.");
        setCoins([]);
        setGainers([]);
        setLosers([]);
        setMostActive([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCrypto();
  }, []);

  const heroCoin = coins[0] || {
    symbol: "BTC",
    name: "Bitcoin",
    price: 0,
    changePercent24h: 0,
    volume24h: 0,
    marketCap: 0,
  };

  const heroPositive = Number(heroCoin.changePercent24h || 0) >= 0;

  const activeList =
    activeTab === "gainers" ? gainers : activeTab === "losers" ? losers : mostActive;

  const filteredCoins = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? coins.filter(
          (coin) =>
            coin.symbol?.toLowerCase().includes(q) ||
            coin.name?.toLowerCase().includes(q)
        )
      : coins;

    return list.slice(0, 12);
  }, [coins, search]);

  const openChart = (coin) => {
    navigate("/charts", {
      state: {
        symbol: coin.symbol,
        marketType: "crypto",
        coinName: coin.name,
        coinId: coin.raw?.id || coin.symbol?.toLowerCase(),
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-6 text-xl font-semibold text-slate-900 shadow-sm">
          Loading Crypto Market...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-[1480px] mx-auto px-5 md:px-8 py-8 md:py-10">
        {/* ================= HERO ================= */}
        <section className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-white p-6 md:p-8 lg:p-10 shadow-sm">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-100 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-emerald-100 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_30%)]" />

          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-8 xl:gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-700">
                Live Crypto Market
              </div>

              <h1 className="mt-5 text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900">
                {heroCoin.name}
              </h1>

              <div className="mt-4 text-4xl md:text-5xl lg:text-6xl font-black text-slate-900">
                <AnimatedNumber value={heroCoin.price} prefix="$" />
              </div>

              <div
                className={`mt-3 text-xl md:text-2xl font-bold ${
                  heroPositive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {formatPct(heroCoin.changePercent24h)} Today
              </div>

              <p className="mt-5 max-w-2xl text-slate-600 text-sm md:text-base leading-7">
                Track major crypto assets, top gainers, top losers, and most active
                coins in one place. Click any card to open that coin chart directly.
              </p>

              <div className="mt-7 flex flex-wrap gap-4">
                <button
                  onClick={() => openChart(heroCoin)}
                  className="rounded-2xl bg-slate-900 px-6 py-4 font-bold text-white shadow-sm transition hover:scale-[1.02]"
                >
                  Trade {heroCoin.symbol}
                </button>

                <button
                  onClick={() => navigate("/market")}
                  className="rounded-2xl border border-slate-200 bg-white px-6 py-4 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Back to Stocks
                </button>
              </div>

              <div className="mt-8 max-w-2xl">
                <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
                  <input
                    type="text"
                    placeholder="Search crypto by symbol or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 outline-none text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {coins.slice(0, 5).map((coin, idx) => (
                  <CoinPill
                    key={`${coin.symbol}-${idx}`}
                    coin={coin}
                    onClick={() => openChart(coin)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3 gap-4">
                <StatBox
                  label="Total Market Cap"
                  value={formatCompactNumber(marketStats.totalMarketCap, true)}
                />
                <StatBox
                  label="24H Volume"
                  value={formatCompactNumber(marketStats.totalVolume, true)}
                />
                <StatBox
                  label="BTC Dominance"
                  value={`${Number(marketStats.btcDominance || 0).toFixed(2)}%`}
                />
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Featured Asset</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                      {heroCoin.symbol}
                    </h3>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      heroPositive
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {formatPct(heroCoin.changePercent24h)}
                  </div>
                </div>

                <div className="mt-4">
                  <MiniChart
                    symbol={heroCoin.symbol || "BTC"}
                    positive={heroPositive}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">Volume</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {formatCompactNumber(heroCoin.volume24h)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">Market Cap</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {formatCompactNumber(heroCoin.marketCap, true)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => openChart(heroCoin)}
                  className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-900 py-3 font-semibold text-white transition hover:opacity-95"
                >
                  Open {heroCoin.symbol} Chart
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ================= ERROR ================= */}
        {errorMsg ? (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
            {errorMsg}
          </div>
        ) : null}

        {/* ================= TRENDING ================= */}
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                Trending Crypto
              </h2>
              <p className="mt-2 text-slate-600">
                Premium crypto cards with direct chart redirection.
              </p>
            </div>
          </div>

          {filteredCoins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCoins.slice(0, 6).map((coin, index) => (
                <CryptoFeatureCard
                  key={`${coin.symbol}-${index}`}
                  coin={coin}
                  onClick={() => openChart(coin)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              No crypto cards found.
            </div>
          )}
        </section>

        {/* ================= TAB SECTION ================= */}
        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "gainers", label: "Top Gainers" },
                  { key: "losers", label: "Top Losers" },
                  { key: "active", label: "Most Active" },
                ].map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-5 md:px-7 py-3 rounded-[18px] text-sm md:text-base font-semibold transition-all ${
                        active
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => navigate("/charts", { state: { marketType: "crypto" } })}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Open Full Crypto Charts
            </button>
          </div>

          {activeList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {activeList.map((coin, i) => (
                <CryptoListCard
                  key={`${activeTab}-${coin.symbol}-${i}`}
                  coin={coin}
                  rank={i + 1}
                  type={activeTab === "losers" ? "loser" : "gainer"}
                  onClick={() => openChart(coin)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              No data available for this section.
            </div>
          )}
        </section>

        {/* ================= MOST ACTIVE STRIP ================= */}
        <section className="mt-12">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                Most Active Coins
              </h2>
              <p className="mt-2 text-slate-600">
                Click any asset to open its chart page directly.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-5 min-w-max">
              {mostActive.map((coin, index) => (
                <div key={`${coin.symbol}-active-${index}`} className="min-w-[320px] max-w-[320px]">
                  <CryptoFeatureCard coin={coin} onClick={() => openChart(coin)} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= INFO CARDS ================= */}
        <section className="mt-12 pb-6">
          <h2 className="text-center text-4xl md:text-5xl font-black tracking-tight mb-10 text-slate-900">
            Crypto Zones
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              {
                icon: "₿",
                title: "Large Cap Leaders",
                desc: "Track high market-cap coins with stronger liquidity and stable participation.",
              },
              {
                icon: "🚀",
                title: "Momentum Breakouts",
                desc: "Watch coins showing strong daily movement and high trading interest.",
              },
              {
                icon: "⚡",
                title: "Volume Movers",
                desc: "Assets with strong 24H volume can offer better execution and trading activity.",
              },
              {
                icon: "📈",
                title: "Chart Setups",
                desc: "Open direct charts from crypto cards and inspect each coin individually.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-[28px] border border-slate-200 bg-white px-6 py-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-5xl mb-5">{item.icon}</div>
                <h3 className="text-2xl font-bold text-slate-900">{item.title}</h3>
                <p className="mt-4 text-slate-600 leading-7">{item.desc}</p>
                <button
                  onClick={() => navigate("/charts", { state: { marketType: "crypto" } })}
                  className="mt-7 w-full rounded-[18px] bg-slate-900 py-4 font-bold text-white shadow-sm transition hover:scale-[1.02]"
                >
                  Explore →
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <button
        onClick={() => navigate("/charts", { state: { marketType: "crypto" } })}
        className="fixed bottom-6 right-6 rounded-full bg-slate-900 px-6 py-4 text-white font-black shadow-lg transition hover:scale-105"
      >
        Trade Crypto
      </button>
    </div>
  );
}