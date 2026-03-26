import TradeJournal from "../model/TradeJournal.js";

/* ===================== HELPER ===================== */
function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

/* ===================== CREATE ===================== */
export const createTradeJournal = async (req, res) => {
  try {
    const {
      userId,
      symbol,
      assetType,
      mode,
      side,
      orderId,
      entryOrderId,
      quantity,
      entryPrice,
      strategy,
      setupType,
      confidence,
      reasonForEntry,
      emotionBefore,
      tags,
    } = req.body;

    if (!userId || !symbol || !side) {
      return fail(res, 400, "userId, symbol and side are required");
    }

    const journal = await TradeJournal.create({
      userId,
      symbol: String(symbol).toUpperCase().trim(),
      assetType: assetType || "STOCK",
      mode: mode || "DELIVERY",
      side,
      orderId: orderId || null,
      entryOrderId: entryOrderId || orderId || null,
      quantity: Number(quantity || 0),
      remainingQty: Number(quantity || 0),
      entryPrice: Number(entryPrice || 0),

      strategy: strategy || "",
      setupType: setupType || "",
      confidence:
        confidence === "" || confidence === undefined || confidence === null
          ? null
          : Number(confidence),

      reasonForEntry: reasonForEntry || "",
      emotionBefore: emotionBefore || "",

      tags: Array.isArray(tags)
        ? tags
        : String(tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),

      status: "OPEN",
      entryTime: new Date(),
    });

    return res.status(201).json({
      success: true,
      journal,
    });
  } catch (error) {
    console.error("createTradeJournal error:", error);
    return fail(res, 500, error.message || "Failed to create trade journal");
  }
};

/* ===================== CLOSE ===================== */
export const closeTradeJournal = async (req, res) => {
  try {
    const {
      journalId,
      exitOrderId,
      exitQty,
      exitPrice,
      reasonForExit,
      emotionAfter,
      mistakes,
      lessonsLearned,
      rating,
    } = req.body;

    if (!journalId) {
      return fail(res, 400, "journalId is required");
    }

    const journal = await TradeJournal.findById(journalId);
    if (!journal) {
      return fail(res, 404, "Journal not found");
    }

    const qtyToExit = Number(exitQty || 0);
    const ep = Number(exitPrice || 0);

    if (qtyToExit <= 0) {
      return fail(res, 400, "exitQty must be greater than 0");
    }

    if (qtyToExit > Number(journal.remainingQty || 0)) {
      return fail(res, 400, `Max exit qty is ${journal.remainingQty}`);
    }

    const entryPrice = Number(journal.entryPrice || 0);

    const pnlChunk =
      journal.side === "BUY"
        ? (ep - entryPrice) * qtyToExit
        : (entryPrice - ep) * qtyToExit;

    const remainingQty = Number(journal.remainingQty || 0) - qtyToExit;
    const totalClosedQty = Number(journal.quantity || 0) - remainingQty;

    const totalPnl = Number(journal.pnl || 0) + pnlChunk;

    const pnlPct =
      entryPrice > 0 && totalClosedQty > 0
        ? (totalPnl / (entryPrice * totalClosedQty)) * 100
        : 0;

    journal.exitOrderId = exitOrderId || journal.exitOrderId;
    journal.exitPrice = ep;
    journal.pnl = totalPnl;
    journal.pnlPct = pnlPct;
    journal.remainingQty = remainingQty;

    journal.reasonForExit = reasonForExit || journal.reasonForExit;
    journal.emotionAfter = emotionAfter || journal.emotionAfter;
    journal.mistakes = mistakes || journal.mistakes;
    journal.lessonsLearned = lessonsLearned || journal.lessonsLearned;

    journal.rating =
      rating === "" || rating === undefined || rating === null
        ? journal.rating
        : Number(rating);

    journal.exitTime = remainingQty === 0 ? new Date() : journal.exitTime;
    journal.status = remainingQty === 0 ? "CLOSED" : "PARTIAL";

    await journal.save();

    return res.json({
      success: true,
      journal,
    });
  } catch (error) {
    console.error("closeTradeJournal error:", error);
    return fail(res, 500, error.message || "Failed to close trade journal");
  }
};

/* ===================== GET ALL ===================== */
export const getTradeJournals = async (req, res) => {
  try {
    const { userId } = req.params;
    const { symbol, status } = req.query;

    if (!userId) {
      return fail(res, 400, "userId is required");
    }

    const filter = { userId };

    if (symbol) {
      filter.symbol = String(symbol).toUpperCase().trim();
    }

    if (status) {
      filter.status = String(status).toUpperCase().trim();
    }

    const journals = await TradeJournal.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      journals,
    });
  } catch (error) {
    console.error("getTradeJournals error:", error);
    return fail(res, 500, error.message || "Failed to fetch trade journals");
  }
};

/* ===================== GET SINGLE ===================== */
export const getSingleJournal = async (req, res) => {
  try {
    const { journalId } = req.params;

    if (!journalId) {
      return fail(res, 400, "journalId is required");
    }

    const journal = await TradeJournal.findById(journalId).lean();

    if (!journal) {
      return fail(res, 404, "Journal not found");
    }

    return res.json({
      success: true,
      journal,
    });
  } catch (error) {
    console.error("getSingleJournal error:", error);
    return fail(res, 500, error.message || "Failed to fetch journal");
  }
};