import { coingecko } from "../services/coingecko.js";

const DEFAULT_COINS = [
  "bitcoin",
  "ethereum",
  "binancecoin",
  "solana",
  "ripple",
  "cardano",
  "dogecoin",
  "tron",
  "avalanche-2",
  "polkadot",
  "chainlink",
  "matic-network",
];

const SYMBOL_TO_ID = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  TRX: "tron",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  LINK: "chainlink",
  MATIC: "matic-network",
  SHIB: "shiba-inu",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  ATOM: "cosmos",
  UNI: "uniswap",
};

function resolveCoinId(value = "") {
  const raw = String(value).trim();
  const upper = raw.toUpperCase();
  return SYMBOL_TO_ID[upper] || raw.toLowerCase();
}

function mapCoin(coin) {
  return {
    id: coin.id,
    symbol: coin.symbol?.toUpperCase() || "",
    name: coin.name || "",
    image: coin.image || "",
    currentPrice: coin.current_price ?? 0,
    marketCap: coin.market_cap ?? 0,
    marketCapRank: coin.market_cap_rank ?? null,
    totalVolume: coin.total_volume ?? 0,
    high24h: coin.high_24h ?? 0,
    low24h: coin.low_24h ?? 0,
    priceChange24h: coin.price_change_24h ?? 0,
    priceChangePercentage24h: coin.price_change_percentage_24h ?? 0,
    circulatingSupply: coin.circulating_supply ?? 0,
    totalSupply: coin.total_supply ?? 0,
    ath: coin.ath ?? 0,
    atl: coin.atl ?? 0,
    lastUpdated: coin.last_updated || null,
  };
}

export const getTopCryptos = async (req, res) => {
  try {
    const currency = req.query.vs_currency || "inr";
    const perPage = Number(req.query.per_page) || 25;
    const page = Number(req.query.page) || 1;

    const { data } = await coingecko.get("/coins/markets", {
      params: {
        vs_currency: currency,
        order: "market_cap_desc",
        per_page: perPage,
        page,
        sparkline: false,
        price_change_percentage: "24h",
      },
    });

    res.json({
      success: true,
      count: data.length,
      data: data.map(mapCoin),
    });
  } catch (error) {
    console.error("getTopCryptos error:", error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top cryptos",
      error: error?.response?.data || error.message,
    });
  }
};

export const getTrendingCryptos = async (req, res) => {
  try {
    const { data } = await coingecko.get("/search/trending");

    const coinIds = (data?.coins || [])
      .map((item) => item?.item?.id)
      .filter(Boolean)
      .slice(0, 7);

    if (!coinIds.length) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const marketRes = await coingecko.get("/coins/markets", {
      params: {
        vs_currency: req.query.vs_currency || "inr",
        ids: coinIds.join(","),
        order: "market_cap_desc",
        per_page: coinIds.length,
        page: 1,
        sparkline: false,
        price_change_percentage: "24h",
      },
    });

    res.json({
      success: true,
      count: marketRes.data.length,
      data: marketRes.data.map(mapCoin),
    });
  } catch (error) {
    console.error("getTrendingCryptos error:", error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trending cryptos",
      error: error?.response?.data || error.message,
    });
  }
};

export const getCryptoByIds = async (req, res) => {
  try {
    const ids = req.query.ids?.trim() || DEFAULT_COINS.join(",");
    const currency = req.query.vs_currency || "inr";

    const { data } = await coingecko.get("/coins/markets", {
      params: {
        vs_currency: currency,
        ids,
        order: "market_cap_desc",
        per_page: 50,
        page: 1,
        sparkline: false,
        price_change_percentage: "24h",
      },
    });

    res.json({
      success: true,
      count: data.length,
      data: data.map(mapCoin),
    });
  } catch (error) {
    console.error("getCryptoByIds error:", error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch selected cryptos",
      error: error?.response?.data || error.message,
    });
  }
};

export const getCryptoMarket = async (req, res) => {
  try {
    const currency = req.query.vs_currency || "inr";

    const { data } = await coingecko.get("/coins/markets", {
      params: {
        vs_currency: currency,
        ids: DEFAULT_COINS.join(","),
        order: "market_cap_desc",
        per_page: 50,
        page: 1,
        sparkline: false,
        price_change_percentage: "24h",
      },
    });

    const mappedCoins = data.map(mapCoin);
    const totalMarketCap = mappedCoins.reduce((sum, coin) => sum + (coin.marketCap || 0), 0);
    const totalVolume = mappedCoins.reduce((sum, coin) => sum + (coin.totalVolume || 0), 0);
    const btcCoin = mappedCoins.find((coin) => coin.symbol === "BTC");
    const btcDominance =
      totalMarketCap > 0 && btcCoin?.marketCap
        ? (btcCoin.marketCap / totalMarketCap) * 100
        : 0;

    res.json({
      success: true,
      data: {
        coins: mappedCoins.map((coin) => ({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          image: coin.image,
          price: coin.currentPrice,
          changePercent24h: coin.priceChangePercentage24h,
          volume24h: coin.totalVolume,
          marketCap: coin.marketCap,
        })),
        stats: { totalMarketCap, totalVolume, btcDominance },
      },
    });
  } catch (error) {
    console.error("getCryptoMarket error:", error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch crypto market",
      error: error?.response?.data || error.message,
    });
  }
};

export const getCryptoChart = async (req, res) => {
  try {
    const coinId   = resolveCoinId(req.params.id);
    const currency = req.query.vs_currency || "inr";
    const days     = req.query.days || "1";


    const VALID_INTERVALS = ["minutely", "hourly", "daily"];
    const intervalRaw = req.query.interval?.trim().toLowerCase();
    const interval    = VALID_INTERVALS.includes(intervalRaw) ? intervalRaw : undefined;

    const params = { vs_currency: currency, days };
    if (interval) params.interval = interval;

    const { data } = await coingecko.get(`/coins/${coinId}/market_chart`, { params });

    // Convert CoinGecko [timestampMs, price] tuples → { time (unix sec), value }
    const prices = (data?.prices || []).map(([timestamp, price]) => ({
      time:  Math.floor(timestamp / 1000), // ms → seconds
      value: Number(price),
    }));

    const volumes = (data?.total_volumes || []).map(([timestamp, volume]) => ({
      time:  Math.floor(timestamp / 1000),
      value: Number(volume),
    }));

    res.json({
      success: true,
      data: { coinId, prices, volumes },
    });
  } catch (error) {
    console.error("getCryptoChart error:", error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch crypto chart",
      error: error?.response?.data || error.message,
    });
  }
};

export const getCryptoGlobalData = async (req, res) => {
  try {
    const { data } = await coingecko.get("/global");

    res.json({
      success: true,
      data: {
        activeCryptocurrencies: data?.data?.active_cryptocurrencies ?? 0,
        markets: data?.data?.markets ?? 0,
        totalMarketCapUsd: data?.data?.total_market_cap?.usd ?? 0,
        totalVolumeUsd: data?.data?.total_volume?.usd ?? 0,
        marketCapPercentage: data?.data?.market_cap_percentage || {},
        marketCapChangePercentage24hUsd:
          data?.data?.market_cap_change_percentage_24h_usd ?? 0,
      },
    });
  } catch (error) {
    console.error("getCryptoGlobalData error:", error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch global crypto data",
      error: error?.response?.data || error.message,
    });
  }
};

export const searchCryptoCoins = async (req, res) => {
  try {
    const query = req.query.q?.trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const { data } = await coingecko.get("/search", { params: { query } });

    const results = (data?.coins || []).slice(0, 15).map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol?.toUpperCase(),
      marketCapRank: coin.market_cap_rank,
      thumb: coin.thumb,
      large: coin.large,
    }));

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("searchCryptoCoins error:", error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to search crypto coins",
      error: error?.response?.data || error.message,
    });
  }
};
