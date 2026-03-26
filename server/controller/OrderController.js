import mongoose from "mongoose";
import Order from "../model/Order.js";
import Holding from "../model/Holding.js";

/* ========================= HELPERS ========================= */

function normalizeSymbol(symbol = "") {
  return String(symbol)
    .toUpperCase()
    .trim()
    .replace(/\.NS$/i, "")
    .replace(/\.BO$/i, "");
}

function toPositiveNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function round2(n) {
  return Number(Number(n || 0).toFixed(2));
}

/**
 * Place order
 * - Save every order in orders collection
 * - Only DELIVERY affects holdings
 */
export const placeOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { userId, symbol, type, quantity, price, mode, currentPrice, sector, assetType, coinId, name } =
      req.body;

    if (!userId || !symbol || !type || quantity === undefined || price === undefined || !mode) {
      return res.status(400).json({
        success: false,
        message: "userId, symbol, type, quantity, price and mode are required",
      });
    }

    if (!["BUY", "SELL"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order type. Use BUY or SELL",
      });
    }

    if (!["INTRADAY", "DELIVERY"].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mode. Use INTRADAY or DELIVERY",
      });
    }

    const qty = Number(quantity);
    const orderPrice = Number(price);

    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    if (!Number.isFinite(orderPrice) || orderPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
    }

    const cleanSymbol = normalizeSymbol(symbol);
    const resolvedCurrentPrice = toPositiveNumber(currentPrice, orderPrice);

    session.startTransaction();

    const createdOrders = await Order.create(
      [
        {
          userId,
          assetType: assetType || "STOCK",
          coinId: coinId || null,
          symbol: cleanSymbol,
          name: name || cleanSymbol,
          type,
          quantity: qty,
          price: orderPrice,
          mode,
          status: "FILLED",
        },
      ],
      { session }
    );

    const order = createdOrders[0];

    // INTRADAY does not affect holdings
    if (mode === "INTRADAY") {
      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        success: true,
        message: "Intraday order placed successfully",
        order,
      });
    }

    // DELIVERY affects holdings
    let holding = await Holding.findOne({
      userId,
      symbol: cleanSymbol,
      mode: "DELIVERY",
    }).session(session);

    /* ========================= BUY ========================= */
    if (type === "BUY") {
      if (!holding) {
        const createdHolding = await Holding.create(
          [
            {
              userId,
              symbol: cleanSymbol,
              quantity: qty,
              avgPrice: round2(orderPrice),
              currentPrice: round2(resolvedCurrentPrice),
              sector: sector || "Others",
              mode: "DELIVERY",
            },
          ],
          { session }
        );

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
          success: true,
          message: "Buy delivery order placed and holding created",
          order,
          holding: createdHolding[0],
        });
      }

      const oldQty = Number(holding.quantity) || 0;
      const oldAvg = Number(holding.avgPrice) || 0;

      const newQty = oldQty + qty;
      const totalCost = oldQty * oldAvg + qty * orderPrice;
      const newAvg = newQty > 0 ? totalCost / newQty : 0;

      holding.quantity = round2(newQty);
      holding.avgPrice = round2(newAvg);
      holding.currentPrice = round2(resolvedCurrentPrice);

      if (sector) {
        holding.sector = sector;
      }

      await holding.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        success: true,
        message: "Buy delivery order placed and holding updated",
        order,
        holding,
      });
    }

    /* ========================= SELL ========================= */
    if (type === "SELL") {
      if (!holding) {
        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
          success: false,
          message: "Holding not found for this stock",
        });
      }

      const oldQty = Number(holding.quantity) || 0;

      if (oldQty < qty) {
        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
          success: false,
          message: "Not enough quantity to sell",
        });
      }

      const remainingQty = oldQty - qty;

      // Update last known current price to sell price/current market price
      holding.currentPrice = round2(resolvedCurrentPrice);

      if (remainingQty <= 0) {
        await Holding.findByIdAndDelete(holding._id).session(session);

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
          success: true,
          message: "Sell delivery order placed and holding removed",
          order,
          holding: null,
        });
      }

      // For average-price method, avgPrice remains same after partial sell
      holding.quantity = round2(remainingQty);

      await holding.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        success: true,
        message: "Sell delivery order placed and holding updated",
        order,
        holding,
      });
    }

    await session.abortTransaction();
    session.endSession();

    return res.status(400).json({
      success: false,
      message: "Invalid order type",
    });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {}

    session.endSession();

    console.error("placeOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: error.message,
    });
  }
};

/**
 * Get all orders of one user
 */
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("getUserOrders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

/**
 * Get one order by id
 */
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("getOrderById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

/**
 * Delete order only
 * does not reverse holdings
 */
export const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      order: deletedOrder,
    });
  } catch (error) {
    console.error("deleteOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
};