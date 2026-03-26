import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
import Holding from "../model/Holding.js";

/* ========================= HELPERS ========================= */

function normalizeSymbol(symbol = "") {
  return String(symbol)
    .toUpperCase()
    .trim()
    .replace(/\.NS$/i, "")
    .replace(/\.BO$/i, "");
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toValidPositiveNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/* ========================= SECTOR MAPPING ========================= */

function inferSector(symbol = "", name = "") {
  const s = `${symbol} ${name}`.toUpperCase();

  const sectorMap = [
    {
      sector: "Banking",
      keys: [
        "HDFCBANK",
        "ICICIBANK",
        "SBIN",
        "AXISBANK",
        "KOTAKBANK",
        "INDUSINDBK",
        "BANKBARODA",
        "PNB",
        "AUBANK",
        "IDFCFIRSTB",
        "FEDERALBNK",
        "YESBANK",
        "BANDHANBNK",
        "RBLBANK",
      ],
    },
    {
      sector: "IT",
      keys: [
        "TCS",
        "INFY",
        "WIPRO",
        "HCLTECH",
        "TECHM",
        "LTIM",
        "PERSISTENT",
        "COFORGE",
        "MPHASIS",
        "OFSS",
      ],
    },
    {
      sector: "Energy",
      keys: [
        "RELIANCE",
        "ONGC",
        "IOC",
        "BPCL",
        "HINDPETRO",
        "GAIL",
        "OIL",
        "PETRONET",
      ],
    },
    {
      sector: "Pharma",
      keys: [
        "SUNPHARMA",
        "DRREDDY",
        "CIPLA",
        "LUPIN",
        "AUROPHARMA",
        "DIVISLAB",
        "TORNTPHARM",
        "ZYDUSLIFE",
        "MANKIND",
      ],
    },
    {
      sector: "Auto",
      keys: [
        "MARUTI",
        "TATAMOTORS",
        "M&M",
        "HEROMOTOCO",
        "BAJAJ-AUTO",
        "EICHERMOT",
        "TVSMOTOR",
        "ASHOKLEY",
      ],
    },
    {
      sector: "FMCG",
      keys: [
        "HINDUNILVR",
        "ITC",
        "NESTLEIND",
        "TATACONSUM",
        "BRITANNIA",
        "DABUR",
        "GODREJCP",
        "MARICO",
        "COLPAL",
      ],
    },
    {
      sector: "Telecom",
      keys: ["BHARTIARTL", "IDEA", "VODAFONEIDEA", "TATACOMM", "INDUSTOWER"],
    },
    {
      sector: "Metals",
      keys: [
        "TATASTEEL",
        "JSWSTEEL",
        "HINDALCO",
        "VEDL",
        "NMDC",
        "SAIL",
        "JINDALSTEL",
      ],
    },
    {
      sector: "Infrastructure",
      keys: [
        "LT",
        "L&T",
        "ULTRACEMCO",
        "GRASIM",
        "AMBUJACEM",
        "ACC",
        "SIEMENS",
        "ABB",
      ],
    },
    {
      sector: "Retail",
      keys: ["DMART", "TRENT", "V-MART", "SHOPERSTOP"],
    },
    {
      sector: "Logistics",
      keys: ["REDINGTON", "DELHIVERY", "BLUEDART", "TCI", "CONCOR"],
    },
    {
      sector: "Financial Services",
      keys: [
        "BAJFINANCE",
        "BAJAJFINSV",
        "CHOLAFIN",
        "SHRIRAMFIN",
        "MUTHOOTFIN",
        "LICHSGFIN",
      ],
    },
    {
      sector: "Real Estate",
      keys: ["DLF", "LODHA", "OBEROIRLTY", "GODREJPROP", "PRESTIGE"],
    },
    {
      sector: "Power",
      keys: ["NTPC", "POWERGRID", "ADANIPOWER", "TATAPOWER", "NHPC"],
    },
    {
      sector: "Chemicals",
      keys: ["PIDILITIND", "DEEPAKNTR", "AARTIIND", "SRF", "UPL"],
    },
    {
      sector: "Consumer Tech",
      keys: ["ZOMATO", "SWIGGY", "PAYTM", "NYKAA", "POLICYBZR"],
    },
    {
      sector: "Crypto",
      keys: ["BTC", "ETH", "DOGE", "XRP", "SOL", "ADA", "BNB", "MATIC"],
    },
  ];

  for (const group of sectorMap) {
    if (group.keys.some((key) => s.includes(key))) {
      return group.sector;
    }
  }

  return "Others";
}


async function fetchLiveStockPrice(symbol) {
  const cleanSymbol = normalizeSymbol(symbol);

  const trySymbols = [
    `${cleanSymbol}.NS`,
    `${cleanSymbol}.BO`,
    cleanSymbol,
  ];

  console.log("--------------------------------------------------");
  console.log("FETCH LIVE STOCK PRICE START");
  console.log("Original symbol:", symbol);
  console.log("Normalized symbol:", cleanSymbol);
  console.log("Trying tickers:", trySymbols);

  for (const ticker of trySymbols) {
    try {
      console.log(`Trying yahoo quote for ticker: ${ticker}`);

      const quote = await yahooFinance.quote(ticker);

      console.log(`Yahoo raw quote for ${ticker}:`, quote);

      const livePrice = toValidPositiveNumber(
        quote?.regularMarketPrice,
        quote?.currentPrice,
        quote?.postMarketPrice,
        quote?.preMarketPrice,
        quote?.regularMarketPreviousClose,
        quote?.previousClose,
        quote?.bid,
        quote?.ask
      );

      console.log(`Resolved livePrice for ${ticker}:`, livePrice);

      if (livePrice) {
        console.log(`SUCCESS live price found for ${ticker}:`, livePrice);

        return {
          price: livePrice,
          fetchedSymbol: ticker,
          source: "yahoo",
        };
      }
    } catch (error) {
      console.error(`Yahoo quote failed for ${ticker}:`, error?.message || error);
    }
  }

  console.log(`No live price found for symbol: ${cleanSymbol}`);

  return {
    price: null,
    fetchedSymbol: cleanSymbol,
    source: "unavailable",
  };
}

async function fetchLivePriceForHolding(holding) {
  const symbol = normalizeSymbol(holding?.symbol);
  const sector = inferSector(symbol, holding?.name || "");

  console.log("--------------------------------------------------");
  console.log("FETCH LIVE PRICE FOR HOLDING");
  console.log("Holding symbol:", holding?.symbol);
  console.log("Normalized holding symbol:", symbol);
  console.log("Holding inferred sector:", sector);
  console.log("Holding name:", holding?.name || "");

  if (sector === "Crypto") {
    console.log("Crypto holding detected, skipping yahoo stock fetch");

    return {
      price: null,
      fetchedSymbol: symbol,
      source: "crypto-unavailable",
    };
  }

  return fetchLiveStockPrice(symbol);
}



async function enrichHolding(holdingDoc) {
  const holding = holdingDoc.toObject ? holdingDoc.toObject() : holdingDoc;

  console.log("==================================================");
  console.log("ENRICH HOLDING START");
  console.log("RAW HOLDING DOC:", holding);

  const symbol = normalizeSymbol(holding.symbol);
  const quantity = toNumber(holding.quantity, 0);
  const avgPrice = toNumber(holding.avgPrice, 0);

  console.log("Normalized symbol:", symbol);
  console.log("Quantity:", quantity);
  console.log("Avg Price:", avgPrice);

  const liveResult = await fetchLivePriceForHolding(holding);

  console.log("LIVE PRICE FETCH RESULT:", liveResult);

  const databaseCurrentPrice = toValidPositiveNumber(holding.currentPrice);

  console.log("Database currentPrice:", holding.currentPrice);
  console.log("Resolved databaseCurrentPrice:", databaseCurrentPrice);

  const livePrice =
    toValidPositiveNumber(liveResult?.price, databaseCurrentPrice) ?? avgPrice;

  console.log("Final chosen livePrice:", livePrice);

  const investedValue = quantity * avgPrice;
  const marketValue = quantity * livePrice;
  const pnl = marketValue - investedValue;
  const pnlPct = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

  console.log("Calculated investedValue:", investedValue);
  console.log("Calculated marketValue:", marketValue);
  console.log("Calculated pnl:", pnl);
  console.log("Calculated pnlPct:", pnlPct);

  const resolvedSector =
    holding.sector && holding.sector !== "Others"
      ? holding.sector
      : inferSector(symbol, holding.name || "");

  console.log("Original holding sector:", holding.sector);
  console.log("Resolved sector:", resolvedSector);

  const enriched = {
    ...holding,
    symbol,
    sector: resolvedSector,

    livePrice,
    currentPrice: livePrice,

    investedValue,
    marketValue,
    currentValue: marketValue,

    initialAmount: investedValue,
    currentAmount: marketValue,

    pnl,
    pnlPct,
    profitLoss: pnl,
    returnPercent: pnlPct,

    priceSource:
      liveResult?.price != null
        ? liveResult.source
        : databaseCurrentPrice != null
        ? "database"
        : "avgPrice",

    priceFetchedSymbol: liveResult?.fetchedSymbol || symbol,
    priceUpdatedAt: new Date().toISOString(),
  };

  console.log("ENRICHED HOLDING:", enriched);
  console.log("ENRICH HOLDING END");
  console.log("==================================================");

  return enriched;
}

export const getUserHoldings = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("##################################################");
    console.log("GET USER HOLDINGS START");
    console.log("REQ PARAM userId:", userId);
    console.log("REQ PARAMS:", req.params);
    console.log("REQ QUERY:", req.query);

    const holdings = await Holding.find({ userId }).sort({ createdAt: -1 });

    console.log("RAW DB HOLDINGS FOUND:", holdings);
    console.log("RAW DB HOLDINGS COUNT:", holdings.length);

    const enrichedHoldings = await Promise.all(
      holdings.map((holding, index) => {
        console.log(`Processing holding index: ${index}`);
        return enrichHolding(holding);
      })
    );

    console.log("FINAL ENRICHED HOLDINGS ARRAY:", enrichedHoldings);
    console.log("FINAL ENRICHED HOLDINGS COUNT:", enrichedHoldings.length);

    const responsePayload = {
      success: true,
      count: enrichedHoldings.length,
      holdings: enrichedHoldings,
    };

    console.log("GET USER HOLDINGS RESPONSE PAYLOAD:", responsePayload);
    console.log("GET USER HOLDINGS END");
    console.log("##################################################");

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error("getUserHoldings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch holdings",
      error: error.message,
    });
  }
};


export const getHoldingById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("##################################################");
    console.log("GET HOLDING BY ID START");
    console.log("REQ PARAM id:", id);

    const holding = await Holding.findById(id);

    console.log("DB HOLDING FOUND:", holding);

    if (!holding) {
      console.log("Holding not found for id:", id);

      return res.status(404).json({
        success: false,
        message: "Holding not found",
      });
    }

    const enrichedHolding = await enrichHolding(holding);

    console.log("GET HOLDING BY ID RESPONSE:", enrichedHolding);
    console.log("GET HOLDING BY ID END");
    console.log("##################################################");

    return res.status(200).json({
      success: true,
      holding: enrichedHolding,
    });
  } catch (error) {
    console.error("getHoldingById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch holding",
      error: error.message,
    });
  }
};

export const createHolding = async (req, res) => {
  try {
    const payload = req.body || {};

    console.log("##################################################");
    console.log("CREATE HOLDING START");
    console.log("REQ BODY:", payload);

    const createPayload = {
      userId: payload.userId,
      symbol: normalizeSymbol(payload.symbol),
      quantity: toNumber(payload.quantity, 0),
      avgPrice: toNumber(payload.avgPrice, 0),
      currentPrice: toNumber(payload.currentPrice, payload.avgPrice || 0),
      sector: payload.sector || inferSector(payload.symbol, payload.name || ""),
      mode: payload.mode || "DELIVERY",
      name: payload.name || "",
    };

    console.log("CREATE HOLDING FINAL PAYLOAD:", createPayload);

    const holding = await Holding.create(createPayload);

    console.log("DB CREATED HOLDING:", holding);

    const enrichedHolding = await enrichHolding(holding);

    console.log("CREATE HOLDING RESPONSE:", enrichedHolding);
    console.log("CREATE HOLDING END");
    console.log("##################################################");

    return res.status(201).json({
      success: true,
      message: "Holding created successfully",
      holding: enrichedHolding,
    });
  } catch (error) {
    console.error("createHolding error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create holding",
      error: error.message,
    });
  }
};


export const updateHolding = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    console.log("##################################################");
    console.log("UPDATE HOLDING START");
    console.log("REQ PARAM id:", id);
    console.log("REQ BODY:", payload);

    const existing = await Holding.findById(id);

    console.log("EXISTING HOLDING BEFORE UPDATE:", existing);

    if (!existing) {
      console.log("Holding not found for update, id:", id);

      return res.status(404).json({
        success: false,
        message: "Holding not found",
      });
    }

    if (payload.symbol !== undefined) {
      existing.symbol = normalizeSymbol(payload.symbol);
    }
    if (payload.quantity !== undefined) {
      existing.quantity = toNumber(payload.quantity, existing.quantity);
    }
    if (payload.avgPrice !== undefined) {
      existing.avgPrice = toNumber(payload.avgPrice, existing.avgPrice);
    }
    if (payload.currentPrice !== undefined) {
      existing.currentPrice = toNumber(payload.currentPrice, existing.currentPrice);
    }

    existing.name = payload.name !== undefined ? payload.name : existing.name;
    existing.mode = payload.mode !== undefined ? payload.mode : existing.mode;
    existing.sector =
      payload.sector !== undefined
        ? payload.sector
        : inferSector(existing.symbol, existing.name || "");

    console.log("EXISTING HOLDING AFTER FIELD UPDATE:", existing);

    await existing.save();

    console.log("EXISTING HOLDING AFTER SAVE:", existing);

    const enrichedHolding = await enrichHolding(existing);

    console.log("UPDATE HOLDING RESPONSE:", enrichedHolding);
    console.log("UPDATE HOLDING END");
    console.log("##################################################");

    return res.status(200).json({
      success: true,
      message: "Holding updated successfully",
      holding: enrichedHolding,
    });
  } catch (error) {
    console.error("updateHolding error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update holding",
      error: error.message,
    });
  }
};


export const deleteHolding = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("##################################################");
    console.log("DELETE HOLDING START");
    console.log("REQ PARAM id:", id);

    const deleted = await Holding.findByIdAndDelete(id);

    console.log("DELETED HOLDING:", deleted);

    if (!deleted) {
      console.log("Holding not found for delete, id:", id);

      return res.status(404).json({
        success: false,
        message: "Holding not found",
      });
    }

    console.log("DELETE HOLDING END");
    console.log("##################################################");

    return res.status(200).json({
      success: true,
      message: "Holding deleted successfully",
    });
  } catch (error) {
    console.error("deleteHolding error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete holding",
      error: error.message,
    });
  }
};