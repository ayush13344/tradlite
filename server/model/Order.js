import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assetType: {
      type: String,
      enum: ["STOCK", "CRYPTO"],
      default: "STOCK",
    },
    coinId: {
      type: String,
      default: null,
    },
    symbol: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    mode: {
      type: String,
      enum: ["INTRADAY", "DELIVERY"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "FILLED", "CANCELLED"],
      default: "FILLED",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);