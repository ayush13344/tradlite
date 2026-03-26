import { WebSocketServer } from "ws";
import axios from "axios";

const wss = new WebSocketServer({ port: 8091 });
console.log("🚀 Multi-Timeframe Engine running on ws://localhost:8091");

/**
 * Candle durations (seconds)
 */
const TIMEFRAMES = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
};

/**
 * How many candles to keep per timeframe in memory
 * (small = fast + safe)
 */
const MAX_CANDLES = {
  "1m": 800,   // ~13 hours
  "5m": 800,   // ~2.7 days
  "15m": 800,  // ~8.3 days
  "1h": 800,   // ~33 days
};

/**
 * symbolStore:
 * symbol -> { candles: { tf: Candle[] }, lastPrice, lastUpdated }
 *
 * Candle = { time, open, high, low, close }
 */
const symbolStore = new Map();

/**
 * subscribers:
 * symbol -> Set of ws
 *
 * each ws has:
 * ws.subscriptions = Map(symbol -> { tf })
 */
const subscribers = new Map();

/* =========================
   FETCH LIVE PRICE (Yahoo)
========================= */
async function getLivePrice(symbol) {
  const response = await axios.get(
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}.NS`,
    { timeout: 8000 }
  );
  const data = response.data?.quoteResponse?.result?.[0];
  return data?.regularMarketPrice || 0;
}

/* =========================
   INIT SYMBOL
========================= */
function initSymbol(symbol) {
  if (!symbolStore.has(symbol)) {
    const candles = {};
    for (const tf of Object.keys(TIMEFRAMES)) candles[tf] = [];
    symbolStore.set(symbol, {
      candles,
      lastPrice: 0,
      lastUpdated: 0,
    });
  }
}

/* =========================
   UPSERT CANDLE into array
========================= */
function upsertCandleArray(arr, newCandle, tf) {
  if (!Array.isArray(arr)) return [newCandle];

  const last = arr[arr.length - 1];
  if (!last || last.time !== newCandle.time) {
    arr.push(newCandle);
    const max = MAX_CANDLES[tf] ?? 500;
    if (arr.length > max) arr.splice(0, arr.length - max);
    return arr;
  }

  // Update last candle
  last.high = Math.max(last.high, newCandle.high);
  last.low = Math.min(last.low, newCandle.low);
  last.close = newCandle.close;
  return arr;
}

/* =========================
   UPDATE CANDLES (all TFs)
========================= */
function updateCandles(symbol, price) {
  const now = Math.floor(Date.now() / 1000);
  const store = symbolStore.get(symbol);
  if (!store) return;

  store.lastPrice = price;
  store.lastUpdated = now;

  for (const tf in TIMEFRAMES) {
    const duration = TIMEFRAMES[tf];
    const bucket = Math.floor(now / duration) * duration;

    const arr = store.candles[tf];
    const last = arr[arr.length - 1];

    // New bucket => create new candle
    if (!last || last.time !== bucket) {
      const candle = {
        time: bucket,
        open: price,
        high: price,
        low: price,
        close: price,
      };
      store.candles[tf] = upsertCandleArray(arr, candle, tf);
    } else {
      // Same bucket => update
      const candle = {
        time: bucket,
        open: last.open,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
      };
      store.candles[tf] = upsertCandleArray(arr, candle, tf);
    }
  }
}

/* =========================
   SEND SNAPSHOT
   - either specific tf or all tfs
========================= */
function sendSnapshot(ws, symbol, tf) {
  const store = symbolStore.get(symbol);
  if (!store) return;

  if (tf && store.candles[tf]) {
    ws.send(
      JSON.stringify({
        type: "SNAPSHOT",
        symbol,
        timeframe: tf,
        candles: store.candles[tf],
      })
    );
    return;
  }

  // all
  ws.send(
    JSON.stringify({
      type: "SNAPSHOT_ALL",
      symbol,
      candles: store.candles,
    })
  );
}

/* =========================
   BROADCAST UPDATES
   - send only the timeframe each client asked for
========================= */
function broadcast(symbol) {
  const clients = subscribers.get(symbol);
  if (!clients || clients.size === 0) return;

  const store = symbolStore.get(symbol);
  if (!store) return;

  for (const ws of clients) {
    if (ws.readyState !== 1) continue;

    const sub = ws.subscriptions?.get(symbol);
    const tf = sub?.tf;

    // If client didn't pick TF => send all current candles (small payload: only latest per tf)
    if (!tf) {
      const latest = {};
      for (const k of Object.keys(store.candles)) {
        const arr = store.candles[k];
        latest[k] = arr[arr.length - 1] || null;
      }

      ws.send(
        JSON.stringify({
          type: "MULTI_CANDLE_UPDATE",
          symbol,
          candles: latest,
          price: store.lastPrice,
          t: store.lastUpdated,
        })
      );
      continue;
    }

    // Send only that timeframe latest candle
    const arr = store.candles[tf] || [];
    const last = arr[arr.length - 1] || null;

    ws.send(
      JSON.stringify({
        type: "CANDLE_UPDATE",
        symbol,
        timeframe: tf,
        candle: last,
        price: store.lastPrice,
        t: store.lastUpdated,
      })
    );
  }
}

/* =========================
   CLEANUP unused symbols
========================= */
function cleanupSymbolIfNoSubscribers(symbol) {
  const clients = subscribers.get(symbol);
  if (!clients || clients.size === 0) {
    subscribers.delete(symbol);
    symbolStore.delete(symbol);
  }
}

/* =========================
   GLOBAL PRICE POLLER
   - fetch once per symbol
========================= */
setInterval(async () => {
  for (const symbol of symbolStore.keys()) {
    try {
      const price = await getLivePrice(symbol);
      updateCandles(symbol, price);
      broadcast(symbol);
    } catch (err) {
      console.log("Price fetch error:", symbol, err.message);
    }
  }
}, 2000);

/* =========================
   KEEPALIVE (PING/PONG)
========================= */
function heartbeat() {
  this.isAlive = true;
}

const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

/* =========================
   WS CONNECTION
========================= */
wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", heartbeat);

  ws.subscriptions = new Map(); // symbol -> { tf }

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    /**
     * SUBSCRIBE:
     * { type:"SUBSCRIBE", symbol:"RELIANCE", timeframe:"5m" }
     * timeframe optional => send all
     */
    if (data.type === "SUBSCRIBE") {
      const symbol = String(data.symbol || "").toUpperCase().trim();
      const tf = data.timeframe ? String(data.timeframe).trim() : null;

      if (!symbol) return;

      initSymbol(symbol);

      // register ws into symbol subscribers
      if (!subscribers.has(symbol)) subscribers.set(symbol, new Set());
      subscribers.get(symbol).add(ws);

      // store subscription details on ws
      ws.subscriptions.set(symbol, { tf: tf && TIMEFRAMES[tf] ? tf : null });

      // send snapshot immediately
      sendSnapshot(ws, symbol, tf && TIMEFRAMES[tf] ? tf : null);
      return;
    }

    /**
     * UNSUBSCRIBE:
     * { type:"UNSUBSCRIBE", symbol:"RELIANCE" }
     */
    if (data.type === "UNSUBSCRIBE") {
      const symbol = String(data.symbol || "").toUpperCase().trim();
      if (!symbol) return;

      ws.subscriptions.delete(symbol);

      const set = subscribers.get(symbol);
      if (set) set.delete(ws);
      cleanupSymbolIfNoSubscribers(symbol);
      return;
    }
  });

  ws.on("close", () => {
    // remove ws from all symbols
    for (const [symbol] of ws.subscriptions.entries()) {
      const set = subscribers.get(symbol);
      if (set) set.delete(ws);
      cleanupSymbolIfNoSubscribers(symbol);
    }
  });
});

wss.on("close", () => clearInterval(pingInterval));