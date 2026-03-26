import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

/* =========================
   SMALL IN-MEMORY CACHE
   (prevents Yahoo timeouts/limits)
========================= */
const cache = new Map();
// key -> { exp:number, data:any }
const getCache = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    cache.delete(key);
    return null;
  }
  return hit.data;
};
const setCache = (key, data, ttlMs = 30_000) => {
  cache.set(key, { exp: Date.now() + ttlMs, data });
};

/* =========================
   HELPERS
========================= */
const toNum = (v) => (v === null || v === undefined ? null : Number(v));
const safe = (v) => (v === null || v === undefined ? null : v);

const INTERVAL_MAP = {
  "1m": "1m",
  "2m": "2m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "60m": "60m",
  "1h": "60m",
  "90m": "90m",
  "1d": "1d",
  "1wk": "1wk",
  "1mo": "1mo",
};

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function clampInt(v, def, min, max) {
  const n = parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

/* =========================
   GET STOCKS (UNCHANGED)
========================= */
export const getStocks = async (req, res) => {
  try {
    const symbols = ["RELIANCE.NS", "TCS.NS", "INFY.NS"];
    const quotes = await yahooFinance.quote(symbols);

    const formatted = quotes.map((quote) => {
      const changePercent =
        ((quote.regularMarketPrice - quote.regularMarketPreviousClose) /
          quote.regularMarketPreviousClose) *
        100;

      return {
        symbol: quote.symbol.replace(".NS", ""),
        name: quote.shortName,
        price: quote.regularMarketPrice,
        change: changePercent.toFixed(2),
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("Yahoo Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   ✅ HISTORY (TIMEFRAME SUPPORT)
   GET /api/stocks/history?symbol=RELIANCE&interval=5m&days=30
========================= */
export const getStockHistory = async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ message: "symbol is required" });

    // ✅ params from frontend
    const intervalQ = String(req.query.interval || "5m");
    const interval = INTERVAL_MAP[intervalQ] || "5m";
    const days = clampInt(req.query.days, 30, 1, 2000);

    const yahooSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;

    // cache key includes interval/days
    const cacheKey = `HIST:${yahooSymbol}:${interval}:${days}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const now = new Date();
    const period2 = now;
    const period1 = new Date(now);
    period1.setDate(period1.getDate() - days);

    const result = await yahooFinance.chart(yahooSymbol, {
      period1: toISODate(period1),
      period2: toISODate(period2),
      interval,
    });

    const quotes = result?.quotes || [];

    const candles = quotes
      .filter(
        (q) =>
          q?.date &&
          q.open != null &&
          q.high != null &&
          q.low != null &&
          q.close != null
      )
      .map((q) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: Number(q.open),
        high: Number(q.high),
        low: Number(q.low),
        close: Number(q.close),
      }));

    // cache shorter for intraday, longer for daily
    const ttl =
      interval === "1d" || interval === "1wk" || interval === "1mo"
        ? 5 * 60_000
        : 30_000;

    setCache(cacheKey, candles, ttl);

    return res.json(candles);
  } catch (error) {
    console.error("History Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   SEARCH (UNCHANGED)
========================= */
export const searchStocks = async (req, res) => {
  try {
    const query = req.query.q?.toUpperCase().trim();
    if (!query) return res.json([]);

    const stocks = [
      { symbol: "RELIANCE", name: "Reliance Industries" },
      { symbol: "TCS", name: "Tata Consultancy Services" },
      { symbol: "INFY", name: "Infosys" },
      { symbol: "HDFCBANK", name: "HDFC Bank" },
      { symbol: "ICICIBANK", name: "ICICI Bank" },
      { symbol: "SBIN", name: "State Bank of India" },
      { symbol: "ITC", name: "ITC Ltd" },
      { symbol: "LT", name: "Larsen & Toubro" },
      { symbol: "BHARTIARTL", name: "Bharti Airtel" },
      { symbol: "ASIANPAINT", name: "Asian Paints" },
    ];

    const results = stocks.filter(
      (s) => s.symbol.includes(query) || s.name.toUpperCase().includes(query)
    );

    return res.json(results.slice(0, 8));
  } catch (error) {
    console.error("Search Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   OVERVIEW (UNCHANGED)
========================= */
export const getStockOverview = async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ message: "symbol is required" });

    const yahooSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;

    const cacheKey = `OVR:${yahooSymbol}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const [quote, summary] = await Promise.all([
      yahooFinance.quote(yahooSymbol),
      yahooFinance.quoteSummary(yahooSymbol, {
        modules: [
          "price",
          "summaryDetail",
          "defaultKeyStatistics",
          "financialData",
          "assetProfile",
        ],
      }),
    ]);

    const price = summary?.price || {};
    const sd = summary?.summaryDetail || {};
    const ks = summary?.defaultKeyStatistics || {};

    const payload = {
      symbol: yahooSymbol.replace(".NS", ""),
      name: price?.shortName || quote?.shortName || quote?.longName,
      quote: {
        price: quote?.regularMarketPrice,
        change: quote?.regularMarketChange,
        changePercent: quote?.regularMarketChangePercent,
        previousClose: quote?.regularMarketPreviousClose,
        open: quote?.regularMarketOpen,
        dayHigh: quote?.regularMarketDayHigh,
        dayLow: quote?.regularMarketDayLow,
        volume: quote?.regularMarketVolume,
        avgVolume: quote?.averageDailyVolume3Month,
      },
      metrics: {
        marketCap: price?.marketCap || sd?.marketCap || quote?.marketCap,
        peTTM: sd?.trailingPE || quote?.trailingPE,
        epsTTM: ks?.trailingEps,
        fiftyTwoWeekHigh: sd?.fiftyTwoWeekHigh || quote?.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: sd?.fiftyTwoWeekLow || quote?.fiftyTwoWeekLow,
      },
    };

    setCache(cacheKey, payload, 30_000);
    return res.json(payload);
  } catch (error) {
    console.error("Overview Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   ABOUT (UNCHANGED)
========================= */
export const getStockAbout = async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ message: "symbol is required" });

    const yahooSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;

    const cacheKey = `ABOUT:${yahooSymbol}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const summary = await yahooFinance.quoteSummary(yahooSymbol, {
      modules: ["assetProfile", "price"],
    });

    const profile = summary?.assetProfile || {};
    const price = summary?.price || {};

    const payload = {
      symbol: yahooSymbol.replace(".NS", ""),
      name: price?.shortName || null,
      sector: profile?.sector || null,
      industry: profile?.industry || null,
      website: profile?.website || null,
      employees: profile?.fullTimeEmployees ?? null,
      summary: profile?.longBusinessSummary || null,
      city: profile?.city || null,
      state: profile?.state || null,
      country: profile?.country || null,
    };

    setCache(cacheKey, payload, 10 * 60_000);
    return res.json(payload);
  } catch (error) {
    console.error("About Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   ✅ FUNDAMENTALS (USE fundamentalsTimeSeries)
   (Because incomeStatementHistoryQuarterly is mostly empty now)
========================= */
export const getStockFundamentals = async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ message: "symbol is required" });

    const yahooSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;

    const summary = await yahooFinance.quoteSummary(yahooSymbol, {
      modules: ["incomeStatementHistoryQuarterly", "earnings", "price"],
    });

    const incQ =
      summary?.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
    const earningsQ = summary?.earnings?.earningsChart?.quarterly || [];
    const price = summary?.price || {};

    const fundamentals = incQ
      .map((row) => ({
        period: row?.endDate?.fmt || row?.endDate?.raw || row?.endDate || null,
        revenue: toNum(row?.totalRevenue?.raw ?? row?.totalRevenue),
        netIncome: toNum(row?.netIncome?.raw ?? row?.netIncome),
      }))
      .filter((x) => x.period)
      .reverse();

    const epsSeries = earningsQ
      .map((q) => ({
        period: q?.date ? String(q.date) : null,
        eps: toNum(q?.earnings),
      }))
      .filter((x) => x.period);

    return res.json({
      symbol: yahooSymbol.replace(".NS", ""),
      name: price?.shortName || null,
      series: { fundamentals, epsSeries },
    });
  } catch (error) {
    console.error("Fundamentals Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   NEWS (UNCHANGED)
========================= */
export const getStockNews = async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ message: "symbol is required" });

    const yahooSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;

    const cacheKey = `NEWS:${yahooSymbol}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const result = await yahooFinance.search(yahooSymbol, {
      quotesCount: 0,
      newsCount: 10,
      enableFuzzyQuery: true,
    });

    const news = (result?.news || []).map((n) => ({
      title: n?.title || null,
      publisher: n?.publisher || null,
      link: n?.link || null,
      publishedAt: n?.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toISOString()
        : null,
      type: n?.type || null,
      thumbnail: n?.thumbnail?.resolutions?.[0]?.url || null,
    }));

    setCache(cacheKey, news, 60_000);
    return res.json(news);
  } catch (error) {
    console.error("News Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* =========================
   TECHNICALS (KEEP YOUR CURRENT)
   NOTE: Your frontend now computes indicators from candles,
   so this endpoint can be optional.
========================= */
function ema(values, period) {
  const k = 2 / (period + 1);
  let prev = values[0];
  const out = [prev];
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(closes, period = 14) {
  if (closes.length < period + 1) return Array(closes.length).fill(null);

  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }

  gain /= period;
  loss /= period;

  const out = Array(period).fill(null);
  let rs = loss === 0 ? 100 : gain / loss;
  out.push(100 - 100 / (1 + rs));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;

    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;

    rs = loss === 0 ? 100 : gain / loss;
    out.push(100 - 100 / (1 + rs));
  }

  return out;
}

export const getStockTechnicals = async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ message: "symbol is required" });

    const yahooSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;

    const now = new Date();
    const period2 = now;
    const period1 = new Date(now);
    period1.setDate(period1.getDate() - 180);

    const result = await yahooFinance.chart(yahooSymbol, {
      period1: period1.toISOString().slice(0, 10),
      period2: period2.toISOString().slice(0, 10),
      interval: "1d",
    });

    const quotes = result?.quotes || [];
    const candles = quotes
      .filter((q) => q.close != null && q?.date)
      .map((q) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        close: Number(q.close),
      }));

    const closes = candles.map((c) => c.close);

    const ema20 = ema(closes, 20);
    const ema50 = ema(closes, 50);

    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = ema(macdLine, 9);
    const histogram = macdLine.map((v, i) => v - signalLine[i]);

    const rsi14 = rsi(closes, 14);

    const series = candles.map((c, i) => ({
      time: c.time,
      ema20: toNum(ema20[i]),
      ema50: toNum(ema50[i]),
      rsi14: toNum(rsi14[i]),
      macd: toNum(macdLine[i]),
      macdSignal: toNum(signalLine[i]),
      macdHist: toNum(histogram[i]),
    }));

    return res.json({
      symbol: yahooSymbol.replace(".NS", ""),
      interval: "1d",
      series,
    });
  } catch (error) {
    console.error("Technicals Error:", error);
    return res.status(500).json({ message: error.message });
  }
};