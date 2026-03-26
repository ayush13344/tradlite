import mongoose from "mongoose";

const tradeJournalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    assetType: {
      type: String,
      enum: ["STOCK", "CRYPTO"],
      default: "STOCK",
    },

    mode: {
      type: String,
      enum: ["INTRADAY", "DELIVERY"],
      default: "DELIVERY",
    },

    side: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    entryOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    exitOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    quantity: {
      type: Number,
      default: 0,
    },

    remainingQty: {
      type: Number,
      default: 0,
    },

    entryPrice: {
      type: Number,
      default: 0,
    },

    exitPrice: {
      type: Number,
      default: null,
    },

    pnl: {
      type: Number,
      default: 0,
    },

    pnlPct: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["OPEN", "PARTIAL", "CLOSED"],
      default: "OPEN",
    },

    entryTime: {
      type: Date,
      default: Date.now,
    },

    exitTime: {
      type: Date,
      default: null,
    },

    strategy: {
      type: String,
      default: "",
    },

    setupType: {
      type: String,
      default: "",
    },

    confidence: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },

    reasonForEntry: {
      type: String,
      default: "",
    },

    emotionBefore: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    reasonForExit: {
      type: String,
      default: "",
    },

    emotionAfter: {
      type: String,
      default: "",
    },

    mistakes: {
      type: String,
      default: "",
    },

    lessonsLearned: {
      type: String,
      default: "",
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("TradeJournal", tradeJournalSchema);