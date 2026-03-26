import axios from "axios";
import { parse } from "csv-parse/sync";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

let cachedStocks = null;
let cachedOverview = null;
let lastFetchTime = 0;

const CACHE_DURATION = 60 * 1000;

/* ================= FETCH NSE STOCK LIST ================= */

const fetchMergedStocks = async () => {
  if (cachedStocks && Date.now() - lastFetchTime < CACHE_DURATION) {
    return cachedStocks;
  }

  const response = await axios.get(
    "https://archives.nseindia.com/content/equities/EQUITY_L.csv",
    { responseType: "text" }
  );

  const records = parse(response.data, {
    columns: true,
    skip_empty_lines: true,
  });

  /* ----------------------------------------------------
     🚀 IMPORTANT FIX:
     CSV is alphabetical — so we shuffle before slicing
  -----------------------------------------------------*/

  const shuffled = [...records].sort(() => 0.5 - Math.random());

  // Take 150 diversified stocks instead of first 80 A stocks
  const selectedStocks = shuffled.slice(0, 150);

  const symbols = selectedStocks.map(
    (stock) => `${stock.SYMBOL}.NS`
  );

  /* ---------- FETCH IN BATCHES ---------- */

  const chunkSize = 15;
  let quotes = [];

  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    const result = await yahooFinance.quote(chunk);
    quotes = [...quotes, ...result];
  }

  const quoteMap = {};
  quotes.forEach((q) => {
    quoteMap[q.symbol] = q;
  });

  const merged = selectedStocks.map((stock) => {
    const symbolKey = `${stock.SYMBOL}.NS`;
    const quote = quoteMap[symbolKey];

    return {
      symbol: stock.SYMBOL,
      companyName: stock.NAME_OF_COMPANY,
      lastPrice: quote?.regularMarketPrice ?? 0,
      pChange: quote?.regularMarketChangePercent ?? 0,
      volume: quote?.regularMarketVolume ?? 0,
      marketCap: quote?.marketCap ?? 0,
      sector: stock.SECTOR ?? "Others",
    };
  });

  cachedStocks = merged;
  lastFetchTime = Date.now();

  return merged;
};

/* ================= MARKET OVERVIEW ================= */

export const getMarketOverview = async () => {
  if (cachedOverview && Date.now() - lastFetchTime < CACHE_DURATION) {
    return cachedOverview;
  }

  const indices = await yahooFinance.quote([
    "^NSEI",
    "^NSEBANK",
    "^BSESN",
  ]);

  const formatted = indices.map((i) => ({
    name: i.shortName,
    price: i.regularMarketPrice,
    change: i.regularMarketChangePercent,
  }));

  cachedOverview = formatted;
  return formatted;
};

/* ================= MARKET BREADTH ================= */

export const getMarketBreadth = async () => {
  const data = await fetchMergedStocks();

  const advances = data.filter((s) => s.pChange > 0).length;
  const declines = data.filter((s) => s.pChange < 0).length;
  const unchanged = data.filter((s) => s.pChange === 0).length;

  return { advances, declines, unchanged };
};

/* ================= SECTOR PERFORMANCE ================= */

export const getSectorPerformance = async () => {
  const data = await fetchMergedStocks();

  const sectorMap = {};

  data.forEach((stock) => {
    if (!sectorMap[stock.sector]) {
      sectorMap[stock.sector] = [];
    }
    sectorMap[stock.sector].push(stock.pChange);
  });

  const result = Object.keys(sectorMap).map((sector) => {
    const avg =
      sectorMap[sector].reduce((a, b) => a + b, 0) /
      sectorMap[sector].length;

    return {
      sector,
      avgChange: Number(avg.toFixed(2)),
    };
  });

  return result.sort((a, b) => b.avgChange - a.avgChange);
};

/* ================= HELPERS ================= */

const classifyByMarketCap = (stock) => {
  if (stock.marketCap > 200000000000) return "large";
  if (stock.marketCap > 50000000000) return "mid";
  return "small";
};

/* ================= SERVICES ================= */

export const getTopGainers = async () => {
  const data = await fetchMergedStocks();

  return data
    .filter((s) => s.pChange > 0)
    .sort((a, b) => b.pChange - a.pChange)
    .slice(0, 6);
};

export const getTopLosers = async () => {
  const data = await fetchMergedStocks();

  return data
    .filter((s) => s.pChange < 0)
    .sort((a, b) => a.pChange - b.pChange)
    .slice(0, 6);
};

export const getHighVolume = async () => {
  const data = await fetchMergedStocks();

  return data
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 6);
};

export const getCapMovers = async (capType, moverType) => {
  const data = await fetchMergedStocks();

  return data
    .filter((s) => classifyByMarketCap(s) === capType)
    .filter((s) =>
      moverType === "gainers" ? s.pChange > 0 : s.pChange < 0
    )
    .sort((a, b) =>
      moverType === "gainers"
        ? b.pChange - a.pChange
        : a.pChange - b.pChange
    )
    .slice(0, 6);
};

/* ================= COMPLETE DASHBOARD API ================= */

export const getFullMarketDashboard = async () => {
  const [
    overview,
    gainers,
    losers,
    volume,
    breadth,
    sectors,
  ] = await Promise.all([
    getMarketOverview(),
    getTopGainers(),
    getTopLosers(),
    getHighVolume(),
    getMarketBreadth(),
    getSectorPerformance(),
  ]);

  return {
    overview,
    gainers,
    losers,
    volume,
    breadth,
    sectors,
  };
};